import { test, expect } from "@playwright/test";
import { createFullUser } from "../helpers/test-users";

test.describe("Signin — email/password", () => {
  test("signs in with valid credentials and lands on dashboard", async ({
    page,
  }) => {
    const { email, password } = await createFullUser();

    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await page.waitForURL("**/app**", { timeout: 15_000 });
    expect(page.url()).toContain("/app");
  });

  test("shows error for wrong password", async ({ page }) => {
    const { email } = await createFullUser();

    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(email);
    await page.locator('input[type="password"]').fill("WrongPassword999!");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(
      page.getByText(/email ou mot de passe incorrect/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows error for non-existent email", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill("nope-nonexistent@wiply-test.com");
    await page.locator('input[type="password"]').fill("Password123!");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(
      page.getByText(/email ou mot de passe incorrect/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("redirects to the next param after login", async ({ page }) => {
    const { email, password } = await createFullUser();

    // Visit login with a ?next param
    await page.goto("/auth/login?next=%2Fapp%2Fsettings");
    await page.getByLabel("Email").fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    // Should redirect to /app/settings (or /app if settings requires other data)
    await page.waitForURL(/\/app/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/app/);
  });
});
