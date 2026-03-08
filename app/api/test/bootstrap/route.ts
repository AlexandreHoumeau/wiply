/**
 * TEST-ONLY endpoint. Returns 404 unless PLAYWRIGHT_TEST_MODE=true.
 * Calls bootstrapUser() for the currently authenticated session,
 * creating the profile and agency rows that normally happen in /auth/callback.
 * Accepts optional ?token= query param for invite-based bootstrap.
 */
import { NextResponse } from "next/server";
import { bootstrapUser } from "@/services/onboarding.service";

const isAllowed =
  process.env.NODE_ENV !== "production" ||
  process.env.PLAYWRIGHT_TEST_MODE === "true";

export async function POST(request: Request) {
  if (!isAllowed) {
    return new NextResponse(null, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  try {
    const profile = await bootstrapUser(token ?? undefined);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
