import { Page } from "@playwright/test";
import { getAdminClient, getAnonClient } from "./supabase-admin";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Gets a Supabase session token for a user by email using the magic link flow.
 * Runs entirely in Node.js (test helper context) — does not open a browser.
 */
async function getSessionTokens(
  email: string
): Promise<{ access_token: string; refresh_token: string }> {
  const admin = getAdminClient();
  const anon = getAnonClient();

  // Generate a magic link — this gives us the hashed_token without sending an email
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  if (linkError)
    throw new Error(`generateLink failed: ${linkError.message}`);

  // Verify the OTP in Node.js context to exchange for session tokens
  const { data: sessionData, error: sessionError } =
    await anon.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "email",
    });
  if (sessionError || !sessionData.session) {
    throw new Error(
      `verifyOtp failed: ${sessionError?.message ?? "no session returned"}`
    );
  }

  return {
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  };
}

/**
 * Injects a Supabase session into the browser's SSR cookies via the test API route.
 * After calling this, page.goto('/app') will be authenticated.
 */
export async function injectSession(page: Page, email: string): Promise<void> {
  const tokens = await getSessionTokens(email);

  const response = await page.request.post(`${BASE_URL}/api/test/set-session`, {
    data: tokens,
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `set-session failed (${response.status()}): ${body}. ` +
        "Make sure PLAYWRIGHT_TEST_MODE=true is set on the Next.js server."
    );
  }
}

/**
 * Calls the /api/test/bootstrap endpoint to run bootstrapUser() for the
 * currently injected session. Use after injectSession() for users that were
 * created via Admin API and don't have a profile yet.
 */
export async function bootstrapSession(
  page: Page,
  inviteToken?: string
): Promise<void> {
  const url = inviteToken
    ? `${BASE_URL}/api/test/bootstrap?token=${inviteToken}`
    : `${BASE_URL}/api/test/bootstrap`;

  const response = await page.request.post(url);

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`bootstrap failed (${response.status()}): ${body}`);
  }
}

/**
 * Signs in a user via the login form UI (email + password).
 * Assumes the user already exists and is confirmed.
 */
export async function signInViaForm(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/auth/login");
  await page.getByLabel("Adresse email").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/app**", { timeout: 15_000 });
}
