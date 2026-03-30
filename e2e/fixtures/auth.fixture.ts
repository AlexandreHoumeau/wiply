import { test as base, Page } from "@playwright/test";
import { createFullUser, FullUser } from "../helpers/test-users";
import { injectSession } from "../helpers/auth-helpers";

type AuthFixtures = {
  /** A page that is already signed in as a regular user (FREE plan). */
  loggedInPage: Page;
  /** A page signed in as an admin with a PRO plan agency. */
  adminPage: Page;
  /** The user data for the loggedInPage session. */
  loggedInUser: FullUser;
  /** The user data for the adminPage session. */
  adminUser: FullUser;
};

export const test = base.extend<AuthFixtures>({
  loggedInUser: async ({}, applyFixture) => {
    const user = await createFullUser({ plan: "FREE" });
    await applyFixture(user);
  },

  loggedInPage: async ({ page, loggedInUser }, applyFixture) => {
    await injectSession(page, loggedInUser.email);
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await applyFixture(page);
  },

  adminUser: async ({}, applyFixture) => {
    const user = await createFullUser({ plan: "PRO" });
    await applyFixture(user);
  },

  adminPage: async ({ page, adminUser }, applyFixture) => {
    await injectSession(page, adminUser.email);
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await applyFixture(page);
  },
});

export { expect } from "@playwright/test";
