import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { bootstrapUser } from "@/services/onboarding.service";

export default async function OnboardingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");

    // Check if profile already exists — use admin client to bypass RLS
    // (a removed+re-invited member has agency_id=null which hides their profile)
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

    if (profile) redirect("/app");

    const meta = user.user_metadata;

    // Email/password users already provided their info at signup — auto-bootstrap
    // and skip the form (agency_name is only set for email/password signups)
    if (meta?.agency_name) {
        await bootstrapUser();
        redirect("/app");
    }

    // Invited users (email/password) land here when bootstrapping failed in the
    // callback (e.g. OTP expired, scanner consumed link). Detect their pending
    // invite and bootstrap them, then send them to the invite page to accept.
    const { data: pendingInvite } = await supabaseAdmin
        .from("agency_invites")
        .select("token")
        .eq("email", user.email!)
        .eq("accepted", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

    if (pendingInvite) {
        await bootstrapUser(pendingInvite.token);
        redirect(`/invite?token=${pendingInvite.token}`);
    }

    // Extract name from Google metadata
    const fullName: string = meta?.full_name || meta?.name || "";
    const parts = fullName.trim().split(" ");
    const defaultFirstName = meta?.given_name || parts[0] || "";
    const defaultLastName = meta?.family_name || parts.slice(1).join(" ") || "";

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden px-4 py-12">
            <div className="absolute top-[-15%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-15%] right-[-10%] w-96 h-96 bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />
            <OnboardingForm
                defaultFirstName={defaultFirstName}
                defaultLastName={defaultLastName}
            />
        </div>
    );
}
