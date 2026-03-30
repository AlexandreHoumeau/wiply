import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { bootstrapUser } from "@/services/onboarding.service";

export default async function OnboardingPage({
    searchParams,
}: {
    searchParams: Promise<{ campaign?: string }>;
}) {
    const { campaign } = await searchParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");

    // Check if profile already exists — use admin client to bypass RLS
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, agency_id")
        .eq("id", user.id)
        .single();

    if (profile?.agency_id) redirect("/app");

    const meta = user.user_metadata;

    // Email/password users already provided their info at signup — auto-bootstrap
    if (meta?.agency_name && !profile) {
        await bootstrapUser();
        redirect("/app");
    }

    // Invited users logic
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
        <div className="relative flex min-h-screen items-center justify-center bg-[#FFFDF8] overflow-hidden px-4 py-12">
            {/* Background Gradient (Matches Landing Hero) */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#EBF0FE] via-[#F1EFFD] to-[#FFFDF8] z-0" />
            
            {/* Soft decorative blurs for depth */}
            <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#D1CBFA]/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FDE1BA]/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md">
                <OnboardingForm
                    defaultFirstName={defaultFirstName}
                    defaultLastName={defaultLastName}
                    campaignCode={campaign}
                />
            </div>
        </div>
    );
}
