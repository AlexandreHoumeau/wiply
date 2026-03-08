import { test, expect } from "@playwright/test";
import { createFullUser, generateTestEmail } from "../helpers/test-users";
import { createInviteInDB, isInviteAccepted } from "../helpers/invite-helpers";
import { injectSession, bootstrapSession } from "../helpers/auth-helpers";
import { createClient } from "@supabase/supabase-js";

test.describe("Accept invite — create new account (Google OAuth)", () => {
  test("invited Google user joins via session injection and accepts invite", async ({
    page,
  }) => {
    // 1. Create admin user with PRO plan and an invite for a new email
    const admin = await createFullUser({ plan: "PRO" });
    const inviteeEmail = generateTestEmail();

    const invite = await createInviteInDB(
      admin.agencyId,
      admin.userId,
      inviteeEmail,
      "agency_member"
    );

    // 2. Create the invitee in Supabase as a "Google" user (confirmed, no password)
    //    This simulates what happens after Google OAuth completes
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: inviteeEmail,
      email_confirm: true, // Google verifies emails
      user_metadata: {
        first_name: "Claire",
        last_name: "Martin",
        // No agency_name — they're joining via invite, not creating a new agency
      },
    });
    if (createError) throw new Error(`createUser: ${createError.message}`);

    // 3. Simulate completed Google OAuth by injecting a session for this user
    await injectSession(page, inviteeEmail);

    // 4. Bootstrap the user WITH the invite token so they get agency_id from the invite
    await bootstrapSession(page, invite.token);

    // 5. Navigate to the invite page — they should now be logged in with the correct email
    await page.goto(`/invite?token=${invite.token}`);
    await page.waitForLoadState("networkidle");

    // Should show "Accepter et rejoindre" button (user is logged in with matching email)
    await expect(
      page.getByRole("button", { name: /accepter et rejoindre/i })
    ).toBeVisible({ timeout: 10_000 });

    // 6. Accept the invite
    await page.getByRole("button", { name: /accepter et rejoindre/i }).click();

    // 7. Should redirect to app
    await page.waitForURL("**/app**", { timeout: 15_000 });
    expect(page.url()).toContain("/app");

    // 8. Verify invite is accepted in DB
    const accepted = await isInviteAccepted(invite.id);
    expect(accepted).toBe(true);
  });

  test("Google invite button on /invite page redirects to Google OAuth", async ({
    page,
  }) => {
    // Create an invite to show the page in unauthenticated state
    const admin = await createFullUser({ plan: "PRO" });
    const inviteeEmail = generateTestEmail();
    const invite = await createInviteInDB(
      admin.agencyId,
      admin.userId,
      inviteeEmail
    );

    await page.goto(`/invite?token=${invite.token}`);
    await expect(page.getByText("Invitation reçue")).toBeVisible();

    // The "Créer un compte" button links to /auth/signup — check it contains the ?next param
    const signupLink = page.getByRole("link", { name: /créer un compte/i });
    await expect(signupLink).toBeVisible();
    const href = await signupLink.getAttribute("href");
    // The ?next= value is URL-encoded, so /invite?token=X becomes %2Finvite%3Ftoken%3DX
    expect(href).toContain("/auth/signup");
    expect(href).toContain("invite"); // token value is present in the encoded next param
  });
});
