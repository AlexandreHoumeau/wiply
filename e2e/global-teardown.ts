import { deleteAllTestUsers } from "./helpers/test-users";

export default async function globalTeardown() {
  console.log("\n🧹 Playwright E2E — global teardown");
  await deleteAllTestUsers();
  console.log("✅ Test user cleanup complete.\n");
}
