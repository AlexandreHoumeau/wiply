import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bootstrapUser } from "@/services/onboarding.service";

// app/auth/callback/route.ts
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorCode = searchParams.get("error_code");
  const next = searchParams.get("next") || "/app";

  // Supabase sends error params when the link is invalid or expired
  if (errorCode === "otp_expired" || searchParams.get("error") === "access_denied") {
    return NextResponse.redirect(
      `${origin}/auth/login?error=link_expired`
    );
  }

  if (!code) return NextResponse.redirect(`${origin}/auth/login`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    // ON EXTRAIT LE TOKEN DU PARAMÈTRE 'next'
    // next ressemble à : /invite?token=b1a8b29e...
    const nextUrl = new URL(next, origin);
    const token = nextUrl.searchParams.get("token");

    try {
      // ON PASSE LE TOKEN AU BOOTSTRAP
      await bootstrapUser(token);
    } catch (e) {
      // Bootstrap can fail if the session cookie isn't propagated yet in this
      // request cycle. The /onboarding page will catch this and retry for
      // email/password users (who have agency_name in metadata).
      console.error("Bootstrap failed in callback (will retry at /onboarding):", e);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}