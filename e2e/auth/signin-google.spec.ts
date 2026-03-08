import { test, expect } from "@playwright/test";
import { createFullUser } from "../helpers/test-users";
import { injectSession } from "../helpers/auth-helpers";

test.describe("Signin — Google OAuth", () => {
  test("Google signin button initiates OAuth flow to Google", async ({
    page,
  }) => {
    await page.goto("/auth/login");

    const navigationPromise = page.waitForRequest(
      (req) =>
        req.url().includes("supabase") &&
        req.url().includes("provider=google"),
      { timeout: 10_000 }
    );

    await page
      .getByRole("button", { name: /continuer avec google/i })
      .click();

    const req = await navigationPromise;
    expect(req.url()).toContain("provider=google");
    // We stop here — actual Google login cannot be automated in CI
  });

  test("post-OAuth signin: injected session lands on dashboard", async ({
    page,
  }) => {
    // Create a fully bootstrapped user (profile + agency already set up)
    const { email } = await createFullUser();

    // Inject a session as if the user had just completed Google OAuth
    await injectSession(page, email);

    // Navigate to the app — session should be valid
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/app");
  });
});
