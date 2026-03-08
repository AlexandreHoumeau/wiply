import { test, expect } from "@playwright/test";
import { createFullUser, generateTestEmail, confirmUserByEmail } from "../helpers/test-users";
import { createInviteInDB, isInviteAccepted } from "../helpers/invite-helpers";
import { getAdminClient } from "../helpers/supabase-admin";

test.describe("Accept invite — create new account (email/password)", () => {
  test("invited user creates a new account and accepts the invite", async ({
    page,
  }) => {
    // 1. Create admin user with PRO plan and an invite for a new email
    const admin = await createFullUser({ plan: "PRO" });
    const inviteeEmail = generateTestEmail();
    const inviteePassword = "TestPassword123!";

    const invite = await createInviteInDB(
      admin.agencyId,
      admin.userId,
      inviteeEmail,
      "agency_member"
    );

    // 2. Navigate to the invite page as an unauthenticated user
    await page.goto(`/invite?token=${invite.token}`);

    // Should show the invite card
    await expect(page.getByText("Invitation reçue")).toBeVisible({
      timeout: 10_000,
    });

    // 3. Click "Créer un compte" → goes to /auth/signup?next=/invite?token=...
    await page.getByRole("link", { name: /créer un compte/i }).click();
    await page.waitForURL("**/auth/signup**", { timeout: 10_000 });

    // The form should be in invite mode (no agency name field)
    await expect(page.getByLabel("Prénom")).toBeVisible();

    // 4. Fill signup form with the invite email
    await page.getByLabel("Prénom").fill("Invité");
    await page.getByLabel("Nom", { exact: true }).fill("Testeur");
    await page.getByLabel("Adresse email").fill(inviteeEmail);
    await page.locator('input[type="password"]').first().fill(inviteePassword);
    await page.getByLabel("Confirmation").fill(inviteePassword);

    await page.getByRole("button", { name: "Créer le compte" }).click();

    // 5. Success screen shown
    await expect(page.getByText("Vérifiez vos emails")).toBeVisible({
      timeout: 10_000,
    });

    // 6. Confirm user via Admin API (simulates email click)
    await confirmUserByEmail(inviteeEmail);

    // 7. Sign in via login form with the ?next param pointing back to the invite
    const nextParam = encodeURIComponent(`/invite?token=${invite.token}`);
    await page.goto(`/auth/login?next=${nextParam}`);
    await page.getByLabel("Adresse email").fill(inviteeEmail);
    await page.locator('input[type="password"]').first().fill(inviteePassword);
    await page.getByRole("button", { name: "Se connecter" }).click();

    // 8. Should be redirected back to the invite page, now logged in
    await page.waitForURL(`**/invite**`, { timeout: 15_000 });

    // The real flow goes through /auth/callback which calls bootstrapUser(inviteToken).
    // signInWithPassword() via the login form is client-side only, so we call
    // the test bootstrap endpoint to create the profile row with the invite's agency_id.
    const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    const bootstrapRes = await page.request.post(
      `${BASE_URL}/api/test/bootstrap?token=${invite.token}`
    );
    if (!bootstrapRes.ok()) {
      throw new Error(`bootstrap failed: ${await bootstrapRes.text()}`);
    }
    await page.reload();

    // 9. Accept the invite
    await expect(
      page.getByRole("button", { name: /accepter et rejoindre/i })
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /accepter et rejoindre/i }).click();

    // 10. Should redirect to the app
    await page.waitForURL("**/app**", { timeout: 15_000 });
    expect(page.url()).toContain("/app");

    // 11. Verify the invite is marked as accepted in the DB
    const accepted = await isInviteAccepted(invite.id);
    expect(accepted).toBe(true);

    // 12. Verify the new user has the agency_id set in their profile
    const adminClient = getAdminClient();
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("agency_id")
      .eq("email", inviteeEmail)
      .single();
    expect(profiles?.agency_id).toBe(admin.agencyId);
  });
});
