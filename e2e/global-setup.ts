import { getAdminClient } from "./helpers/supabase-admin";

export default async function globalSetup() {
  console.log("\n🎭 Playwright E2E — global setup");

  // Verify Supabase Admin API is reachable before any tests run
  const admin = getAdminClient();
  const { error } = await admin.auth.admin.listUsers({ perPage: 1 });

  if (error) {
    throw new Error(
      `Supabase Admin API unreachable: ${error.message}\n` +
        "Check that NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set correctly."
    );
  }

  console.log("✅ Supabase Admin API verified. Starting E2E tests...\n");
}
