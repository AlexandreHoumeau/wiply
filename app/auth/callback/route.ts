import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bootstrapUser } from "@/services/onboarding.service";
import type { EmailOtpType } from "@supabase/supabase-js";

// app/auth/callback/route.ts
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const errorCode = searchParams.get("error_code");
  const next = searchParams.get("next") || "/app";

  // Supabase sends error params when the link is invalid or expired
  if (errorCode === "otp_expired" || searchParams.get("error") === "access_denied") {
    return NextResponse.redirect(
      `${origin}/auth/login?error=link_expired`
    );
  }

  const supabase = await createClient();

  // --- FLOW 1 : Email OTP (generateLink admin API) ---
  // generateLink produces links that verify via token_hash + type params
  // instead of the PKCE code flow used by OAuth/browser-initiated signUp.
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      const nextUrl = new URL(next, origin);
      const inviteToken = nextUrl.searchParams.get("token");
      try {
        await bootstrapUser(inviteToken);
      } catch (e) {
        console.error("Bootstrap failed in token_hash callback:", e);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/auth/login?error=link_expired`);
  }

  // --- FLOW 2 : PKCE code exchange (OAuth + browser-initiated signUp) ---
  if (!code) return NextResponse.redirect(`${origin}/auth/login`);

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    // next ressemble à : /invite?token=b1a8b29e...
    const nextUrl = new URL(next, origin);
    const token = nextUrl.searchParams.get("token");

    try {
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