import { test, expect } from "@playwright/test";
import { createFullUser, generateTestEmail } from "../helpers/test-users";
import { createInviteInDB, isInviteAccepted } from "../helpers/invite-helpers";
import { getAdminClient } from "../helpers/supabase-admin";

test.describe("Accept invite — login with existing account", () => {
  test("existing user logs in and accepts an invitation", async ({ page }) => {
    // 1. Create admin user (PRO plan) to send the invite
    const admin = await createFullUser({ plan: "PRO" });

    // 2. Create an existing user (confirmed, no agency yet) whose email matches the invite
    const existingUserEmail = generateTestEmail();
    const existingUserPassword = "TestPassword123!";

    // Create the invitee as a standalone user first (no agency)
    const supabaseAdmin = getAdminClient();
    const { data: authData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: existingUserEmail,
        password: existingUserPassword,
        email_confirm: true,
        user_metadata: { first_name: "Paul", last_name: "Existant" },
      });
    if (createError) throw new Error(`createUser: ${createError.message}`);

    // Create a standalone agency for the existing user
    const slug =
      "standalone-" + Math.random().toString(36).substring(2, 7);
    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .insert({ name: "Standalone Agency", slug, plan: "FREE" })
      .select()
      .single();

    await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      agency_id: agency!.id,
      role: "agency_admin",
      first_name: "Paul",
      last_name: "Existant",
      email: existingUserEmail,
    });

    // Set owner_id so globalTeardown can identify this agency for cleanup
    await supabaseAdmin
      .from("agencies")
      .update({ owner_id: authData.user.id })
      .eq("id", agency!.id);

    // 3. Create an invite for the existing user's email
    const invite = await createInviteInDB(
      admin.agencyId,
      admin.userId,
      existingUserEmail,
      "agency_member"
    );

    // 4. Navigate to the invite page as an unauthenticated user
    await page.goto(`/invite?token=${invite.token}`);

    // Should show the invite card with login/signup options
    await expect(page.getByText("Invitation reçue")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText(existingUserEmail)
    ).toBeVisible();

    // 5. Click "Se connecter" → goes to /auth/login?next=/invite?token=...
    await page.getByRole("link", { name: /se connecter/i }).click();
    await page.waitForURL("**/auth/login**", { timeout: 10_000 });
    expect(page.url()).toContain("next=");
    expect(page.url()).toContain("invite");

    // 6. Log in with existing credentials
    await page.getByLabel("Email").fill(existingUserEmail);
    await page.locator('input[type="password"]').fill(existingUserPassword);
    await page.getByRole("button", { name: "Se connecter" }).click();

    // 7. Should be redirected back to the invite page
    await page.waitForURL(`**/invite**`, { timeout: 15_000 });

    // 8. The user is now logged in with the correct email → show accept button
    await expect(
      page.getByRole("button", { name: /accepter et rejoindre/i })
    ).toBeVisible({ timeout: 10_000 });

    // 9. Accept the invite
    await page.getByRole("button", { name: /accepter et rejoindre/i }).click();

    // 10. Should redirect to the app
    await page.waitForURL("**/app**", { timeout: 15_000 });
    expect(page.url()).toContain("/app");

    // 11. Verify invite is accepted in DB
    const accepted = await isInviteAccepted(invite.id);
    expect(accepted).toBe(true);

    // 12. Verify the user's profile now points to the admin's agency
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("agency_id")
      .eq("email", existingUserEmail)
      .single();
    expect(profile?.agency_id).toBe(admin.agencyId);
  });

  test("shows email mismatch warning when wrong user is logged in", async ({
    page,
  }) => {
    // Create an admin and a different logged-in user (wrong email)
    const admin = await createFullUser({ plan: "PRO" });
    const { email: wrongEmail, password: wrongPassword } =
      await createFullUser();

    const inviteeEmail = generateTestEmail();
    const invite = await createInviteInDB(
      admin.agencyId,
      admin.userId,
      inviteeEmail
    );

    // Sign in as the wrong user
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(wrongEmail);
    await page.locator('input[type="password"]').fill(wrongPassword);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/app**", { timeout: 15_000 });

    // Navigate to the invite page
    await page.goto(`/invite?token=${invite.token}`);
    await page.waitForLoadState("networkidle");

    // Should show the email mismatch warning
    await expect(page.getByText(inviteeEmail)).toBeVisible();
    await expect(page.getByText(wrongEmail)).toBeVisible();

    // The accept button should NOT be shown
    await expect(
      page.getByRole("button", { name: /accepter et rejoindre/i })
    ).not.toBeVisible();
  });
});
