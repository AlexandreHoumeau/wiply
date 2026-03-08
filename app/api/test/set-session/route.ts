/**
 * TEST-ONLY endpoint. Returns 404 unless PLAYWRIGHT_TEST_MODE=true.
 * Accepts a Supabase access_token + refresh_token and sets SSR auth cookies,
 * simulating a completed OAuth or magic-link flow without going through external services.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const isAllowed =
  process.env.NODE_ENV !== "production" ||
  process.env.PLAYWRIGHT_TEST_MODE === "true";

export async function POST(request: Request) {
  if (!isAllowed) {
    return new NextResponse(null, { status: 404 });
  }

  const { access_token, refresh_token } = await request.json();

  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { error: "access_token and refresh_token are required" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
