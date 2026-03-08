import { getAdminClient } from "./supabase-admin";

export function generateTestEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `e2e-${ts}-${rand}@wiply-test.com`;
}

export interface FullUser {
  userId: string;
  agencyId: string;
  email: string;
  password: string;
}

/**
 * Creates a fully bootstrapped user (confirmed auth user + profile + agency rows)
 * directly via Admin API, bypassing the UI and email confirmation flow.
 * Use this to seed prerequisite data for tests that aren't testing signup itself.
 */
export async function createFullUser(opts?: {
  email?: string;
  firstName?: string;
  lastName?: string;
  agencyName?: string;
  plan?: "FREE" | "PRO";
  role?: "agency_admin" | "agency_member";
}): Promise<FullUser> {
  const admin = getAdminClient();
  const email = opts?.email ?? generateTestEmail();
  const password = "TestPassword123!";
  const firstName = opts?.firstName ?? "Test";
  const lastName = opts?.lastName ?? "User";
  const agencyName = opts?.agencyName ?? `Agency-${Date.now()}`;
  const plan = opts?.plan ?? "FREE";
  const role = opts?.role ?? "agency_admin";

  // 1. Create auth user (confirmed immediately)
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
  if (authError) throw new Error(`createUser failed: ${authError.message}`);
  const userId = authData.user.id;

  // 2. Create agency
  const slug =
    agencyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50) +
    "-" +
    Math.random().toString(36).substring(2, 7);

  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .insert({ name: agencyName, slug, plan })
    .select()
    .single();
  if (agencyError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`createAgency failed: ${agencyError.message}`);
  }

  // 3. Create profile
  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    agency_id: agency.id,
    role,
    first_name: firstName,
    last_name: lastName,
    email,
  });
  if (profileError) {
    await admin.from("agencies").delete().eq("id", agency.id);
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`createProfile failed: ${profileError.message}`);
  }

  // 4. Set agency owner
  if (role === "agency_admin") {
    await admin
      .from("agencies")
      .update({ owner_id: userId })
      .eq("id", agency.id);
  }

  return { userId, agencyId: agency.id, email, password };
}

/**
 * Confirms a user by email using the Admin API.
 * Used after UI signup form submission (which creates an unconfirmed user).
 */
export async function confirmUserByEmail(email: string): Promise<string> {
  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${error.message}`);

  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`User with email ${email} not found`);

  const { error: updateError } = await admin.auth.admin.updateUserById(
    user.id,
    { email_confirm: true }
  );
  if (updateError)
    throw new Error(`confirmUser failed: ${updateError.message}`);

  return user.id;
}

/**
 * Deletes all agencies and their associated data (invites, child tables).
 * Handles the circular FK: agencies.owner_id ↔ profiles.agency_id.
 */
async function deleteAgencies(agencyIds: string[]): Promise<void> {
  if (agencyIds.length === 0) return;
  const admin = getAdminClient();

  // Break circular FK before deleting profiles/agencies
  await admin.from("agencies").update({ owner_id: null }).in("id", agencyIds);

  // Delete all child data for these agencies in dependency order
  await admin.from("notifications").delete().in("agency_id", agencyIds);
  await admin.from("ai_generated_messages").delete().in("agency_id", agencyIds);
  await admin.from("tracking_links").delete().in("agency_id", agencyIds);
  await admin.from("agency_ai_configs").delete().in("agency_id", agencyIds);
  await admin.from("agency_invites").delete().in("agency_id", agencyIds);

  // Also delete invites sent BY members of these agencies in OTHER agencies
  // (agency_invites.invited_by → profiles.id, cross-agency FK)
  const { data: agencyProfiles } = await admin
    .from("profiles")
    .select("id")
    .in("agency_id", agencyIds);
  if (agencyProfiles && agencyProfiles.length > 0) {
    const profileIds = agencyProfiles.map((p: { id: string }) => p.id);
    await admin.from("agency_invites").delete().in("invited_by", profileIds);
  }

  // Tasks → task_comments (task_comments FK → tasks.id)
  const { data: tasks } = await admin
    .from("tasks")
    .select("id")
    .in("agency_id", agencyIds);
  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map((t: { id: string }) => t.id);
    await admin.from("task_comments").delete().in("task_id", taskIds);
  }
  await admin.from("tasks").delete().in("agency_id", agencyIds);

  // Projects → project_checklists
  const { data: projects } = await admin
    .from("projects")
    .select("id")
    .in("agency_id", agencyIds);
  if (projects && projects.length > 0) {
    const projectIds = projects.map((p: { id: string }) => p.id);
    await admin.from("project_checklists").delete().in("project_id", projectIds);
  }
  await admin.from("projects").delete().in("agency_id", agencyIds);

  await admin.from("opportunities").delete().in("agency_id", agencyIds);
  await admin.from("companies").delete().in("agency_id", agencyIds);

  // Delete profiles in these agencies
  await admin.from("profiles").delete().in("agency_id", agencyIds);

  // Delete the agencies themselves
  await admin.from("agencies").delete().in("id", agencyIds);
}

/**
 * Deletes all users whose emails match the e2e test pattern,
 * along with all associated agencies and child data.
 */
export async function deleteAllTestUsers(): Promise<void> {
  const admin = getAdminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const testUsers =
    data?.users.filter(
      (u) =>
        u.email?.startsWith("e2e-") && u.email?.endsWith("@wiply-test.com")
    ) ?? [];

  if (testUsers.length === 0) return;

  const testUserIds = testUsers.map((u) => u.id);

  // Collect agencies owned by test users (owner_id is set by createFullUser)
  const { data: ownedAgencies } = await admin
    .from("agencies")
    .select("id")
    .in("owner_id", testUserIds);

  // Also collect agencies where test users are members (edge cases)
  const { data: memberProfiles } = await admin
    .from("profiles")
    .select("agency_id")
    .in("id", testUserIds)
    .not("agency_id", "is", null);

  const agencyIds = Array.from(
    new Set([
      ...(ownedAgencies ?? []).map((a: { id: string }) => a.id),
      ...(memberProfiles ?? [])
        .map((p: { agency_id: string }) => p.agency_id)
        .filter(Boolean),
    ])
  );

  // Delete all agency data and agencies
  await deleteAgencies(agencyIds);

  // Delete any remaining test user profiles (e.g. test user moved to a real agency)
  await admin.from("profiles").delete().in("id", testUserIds);

  // Delete auth users
  for (const user of testUsers) {
    try {
      await admin.auth.admin.deleteUser(user.id);
    } catch (e) {
      console.warn(`Failed to delete auth user ${user.email}:`, e);
    }
  }

  console.log(
    `Cleaned up ${testUsers.length} test users and ${agencyIds.length} agencies.`
  );
}
