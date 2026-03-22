import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      // Only measure files that have dedicated tests.
      // Add paths here as you write new test files.
      include: [
        "lib/billing/**",
        "lib/config/**",
        "lib/email_generator/**",
        "lib/validators/oppotunities.ts",
        "lib/validators/quotes.ts",
        "lib/utils.ts",
        "actions/dashboard.server.ts",
        // Add more paths here as you write unit tests for other files.
        // DB-heavy CRUD wrappers (tracking.server.ts, opportunity.client.ts)
        // belong in integration tests and are excluded from this threshold.
      ],
      exclude: ["**/*.d.ts"],
      // Enforce 80% on lines & statements.
      // Branches are excluded: Zod internals and optional chaining generate
      // dozens of implicit branches that are impractical to reach.
      thresholds: {
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
