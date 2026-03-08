import { test, expect } from "../fixtures/auth.fixture";
import { generateTestEmail } from "../helpers/test-users";
import { getInviteByEmail } from "../helpers/invite-helpers";

test.describe("Send invite — from settings", () => {
  test("admin can send an invitation from the team settings page", async ({
    adminPage,
    adminUser,
  }) => {
    void adminUser; // fixture needed to ensure PRO plan
    const inviteeEmail = generateTestEmail();

    // Navigate to agency settings → team tab
    await adminPage.goto("/app/settings/agency");
    await adminPage.waitForLoadState("networkidle");

    // Click on the "team" tab if there are multiple tabs
    const teamTab = adminPage.getByRole("tab", { name: /équipe|team/i });
    if (await teamTab.isVisible()) {
      await teamTab.click();
    }

    // Click "Inviter un membre" button
    await adminPage
      .getByRole("button", { name: /inviter un membre/i })
      .click();

    // Dialog should appear
    await expect(
      adminPage.getByRole("dialog")
    ).toBeVisible({ timeout: 5_000 });

    // Fill in the invite email
    await adminPage
      .getByLabel("Adresse email professionnelle")
      .fill(inviteeEmail);

    // Submit the invite form
    await adminPage.getByRole("button", { name: /envoyer l'invitation/i }).click();

    // Should show success message ("Invitation envoyée à ...") in the dialog alert
    await expect(
      adminPage.getByText(/invitation envoyée/i)
    ).toBeVisible({ timeout: 10_000 });

    // Verify the invite token was created in the database
    const invite = await getInviteByEmail(inviteeEmail);
    expect(invite).not.toBeNull();
    expect(invite?.email).toBe(inviteeEmail);
    expect(invite?.token).toBeTruthy();
  });
});
