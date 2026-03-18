import posthog from "posthog-js";

if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NODE_ENV !== "production") {
  // PostHog disabled in non-production environments
} else
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: "/ingest",
  ui_host: "https://eu.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  debug: false,
  opt_out_capturing_by_default: true,
});
