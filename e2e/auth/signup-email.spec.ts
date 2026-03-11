import { test, expect } from "@playwright/test";
import { generateTestEmail, confirmUserByEmail } from "../helpers/test-users";

test.describe("Signup — email/password", () => {
  test("fills the signup form, sees email confirmation screen, then can sign in", async ({
    page,
  }) => {
    const email = generateTestEmail();
    const password = "TestPassword123!";

    await page.goto("/auth/signup");

    // Fill signup form
    await page.getByLabel("Nom de l'agence").fill("E2E Test Agency");
    await page.getByLabel("Prénom").fill("Jean");
    await page.getByLabel("Nom", { exact: true }).fill("Dupont");
    await page.getByLabel("Adresse email").fill(email);

    // Password fields — both labeled "Mot de passe" / "Confirmation"
    
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByLabel("Confirmation").fill(password);

    await page.getByRole("button", { name: "Créer mon espace" }).click();

    // Wait for success state
    await expect(page.getByText("Vérifiez vos emails")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(email)).toBeVisible();

    // Confirm user via Admin API (simulates clicking the email link)
    await confirmUserByEmail(email);

    // Now sign in with the confirmed credentials
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    // Should land on the app dashboard
    await page.waitForURL("**/app**", { timeout: 15_000 });
    expect(page.url()).toContain("/app");
  });

  test("shows error for duplicate email", async ({ page }) => {
    // Use an existing confirmed email — we'll try to sign up with it again
    // First create a user...
    const email = generateTestEmail();
    const password = "TestPassword123!";

    await page.goto("/auth/signup");
    await page.getByLabel("Nom de l'agence").fill("Duplicate Test Agency");
    await page.getByLabel("Prénom").fill("Jean");
    await page.getByLabel("Nom", { exact: true }).fill("Dupont");
    await page.getByLabel("Adresse email").fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByLabel("Confirmation").fill(password);
    await page.getByRole("button", { name: "Créer mon espace" }).click();
    await expect(page.getByText("Vérifiez vos emails")).toBeVisible({
      timeout: 10_000,
    });

    // Confirm and re-signup with same email
    await confirmUserByEmail(email);

    await page.goto("/auth/signup");
    await page.getByLabel("Nom de l'agence").fill("Another Agency");
    await page.getByLabel("Prénom").fill("Marie");
    await page.getByLabel("Nom", { exact: true }).fill("Martin");
    await page.getByLabel("Adresse email").fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByLabel("Confirmation").fill(password);
    await page.getByRole("button", { name: "Créer mon espace" }).click();

    // Should show an error (email already in use)
    await expect(
      page.getByRole("alert").or(page.getByText(/déjà utilisé|already|existe/i))
    ).toBeVisible({ timeout: 10_000 });
  });
});
