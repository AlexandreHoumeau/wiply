import { test, expect } from "@playwright/test";
import { generateTestEmail } from "../helpers/test-users";
import { createClient } from "@supabase/supabase-js";
import { injectSession, bootstrapSession } from "../helpers/auth-helpers";

test.describe("Signup — Google OAuth", () => {
  test("Google signup button initiates OAuth flow to Google", async ({
    page,
  }) => {
    await page.goto("/auth/signup");

    // Intercept the navigation triggered by clicking the Google button.
    // signInWithOAuth calls Supabase which redirects to accounts.google.com.
    const navigationPromise = page.waitForRequest(
      (req) =>
        req.url().includes("supabase") &&
        req.url().includes("provider=google"),
      { timeout: 10_000 }
    );

    await page
      .getByRole("button", {
        name: /continuer avec google|rejoindre avec google/i,
      })
      .click();

    const req = await navigationPromise;
    expect(req.url()).toContain("provider=google");
    // We stop here — actual Google login cannot be automated in CI
  });

  test("post-OAuth state: injected Google session bootstraps correctly and lands on app", async ({
    page,
  }) => {
    const email = generateTestEmail();

    // Create a user representing a post-Google-OAuth state:
    // - confirmed (Google verifies emails)
    // - metadata with first/last name (as Google provides them)
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        first_name: "Claire",
        last_name: "Dupont",
        agency_name: `Google Agency ${Date.now()}`,
      },
    });
    if (createError) throw new Error(`createUser: ${createError.message}`);

    // Inject session into browser via SSR cookies
    await injectSession(page, email);

    // Bootstrap creates profile + agency rows (simulates /auth/callback behavior)
    await bootstrapSession(page);

    // Navigate to the app
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/app");
  });
});
