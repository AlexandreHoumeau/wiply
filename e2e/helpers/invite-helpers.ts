import crypto from "crypto";
import { getAdminClient } from "./supabase-admin";

export interface InviteRecord {
  id: string;
  token: string;
  email: string;
  agencyId: string;
  role: string;
}

/**
 * Creates an invite directly in the database via Admin API.
 * Use this to seed invite data for tests that test the acceptance flow,
 * bypassing the "send invite" UI step.
 */
export async function createInviteInDB(
  agencyId: string,
  inviterUserId: string,
  email: string,
  role: "agency_admin" | "agency_member" = "agency_member"
): Promise<InviteRecord> {
  const admin = getAdminClient();

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("agency_invites")
    .insert({
      agency_id: agencyId,
      email,
      role,
      token,
      expires_at: expiresAt,
      invited_by: inviterUserId,
      accepted: false,
    })
    .select()
    .single();

  if (error) throw new Error(`createInviteInDB failed: ${error.message}`);

  return {
    id: data.id,
    token: data.token,
    email: data.email,
    agencyId: data.agency_id,
    role: data.role,
  };
}

/**
 * Fetches the invite token for a given email from the database.
 * Useful to verify that the "send invite" UI action created the expected DB record.
 */
export async function getInviteByEmail(
  email: string
): Promise<InviteRecord | null> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("agency_invites")
    .select("*")
    .eq("email", email)
    .eq("accepted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    token: data.token,
    email: data.email,
    agencyId: data.agency_id,
    role: data.role,
  };
}

/**
 * Verifies that an invite was accepted (accepted = true in DB).
 */
export async function isInviteAccepted(inviteId: string): Promise<boolean> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("agency_invites")
    .select("accepted")
    .eq("id", inviteId)
    .single();
  return data?.accepted === true;
}
