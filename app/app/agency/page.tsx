import { fetchSettingsData } from "@/actions/settings.server";
import { fetchAgencyTrackingStats } from "@/actions/tracking.server";
import { AgencyAICard } from "./_components/AgencyAICard";
import { AgencyInfoCard } from "./_components/AgencyInfoCard";
import { AgencyTeamCard } from "./_components/AgencyTeamCard";
import { AgencyTrackingCard } from "./_components/AgencyTrackingCard";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import {
  Activity,
  ArrowRight,
  CreditCard,
  MapPin,
  Settings,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

import Link from "next/link";
import { AgencyBrandingDialog } from "./_components/AgencyBrandingDialog";

export default async function AgencyOverviewPage() {
  const { agency, team, invites = [], ai, profile, billing } = await fetchSettingsData();
  const trackingStats = agency?.id
    ? await fetchAgencyTrackingStats(agency.id)
    : { totalLinks: 0, totalClicks: 0, activeLinks: 0, lastClickedAt: null, deviceBreakdown: {}, topLinks: [] };

  const companyInitial = agency?.name?.charAt(0).toUpperCase() ?? "A";
  const isAiConfigured = !!(ai?.ai_context || ai?.key_points);
  const agencyCreatedAt = agency?.created_at
    ? dayjs(agency.created_at).locale("fr").format("MMMM YYYY")
    : null;

  // Brand colors from DB
  const primaryColor = agency?.primary_color || "#0F172A"
  const secondaryColor = agency?.secondary_color || "#6366F1"

  return (
    <div className="min-h-screen bg-background">
      {/* ─────────────────── BRAND HERO ─────────────────── */}
      <div
        className="relative overflow-hidden border-b border-black/20"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Glowing orbs using brand secondary color */}
        <div
          className="pointer-events-none absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full blur-[100px]"
          style={{ backgroundColor: `${secondaryColor}30` }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-20 h-[500px] w-[500px] rounded-full blur-[100px]"
          style={{ backgroundColor: `${secondaryColor}15` }}
        />

        {/* Micro-grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 24V0H1V24H0ZM24 0H0V1H24V0Z' fill='white'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <AgencyBrandingDialog
                agency={agency}
                companyInitial={companyInitial}
                isAdmin={profile?.role === "agency_admin"}
              />

              <div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {agency?.is_active && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      Système Actif
                    </span>
                  )}
                  {profile.role === "agency_admin" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/70 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full backdrop-blur-sm">
                      <Shield className="h-3 w-3" /> Administrateur
                    </span>
                  )}
                </div>

                <h1 className="text-4xl md:text-5xl font-semibold text-white">
                  {agency?.name ?? "Mon Agence"}
                </h1>

                {agency?.address && (
                  <p className="mt-2 flex items-center gap-1.5 text-lg text-white/60 font-medium">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {agency.address}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
                    <Users className="h-3.5 w-3.5 text-white/50" />
                    {team.length} membre{team.length > 1 ? "s" : ""}
                  </div>
                  {agencyCreatedAt && (
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
                      <Activity className="h-3.5 w-3.5 text-white/50" />
                      Depuis {agencyCreatedAt}
                    </div>
                  )}
                  <div
                    className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors"
                    style={
                      isAiConfigured
                        ? {
                            borderColor: `${secondaryColor}40`,
                            backgroundColor: `${secondaryColor}20`,
                            color: "white",
                          }
                        : {
                            borderColor: "rgba(255,255,255,0.1)",
                            backgroundColor: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.5)",
                          }
                    }
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isAiConfigured ? "Agent IA Opérationnel" : "IA en attente de configuration"}
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/app/agency/settings"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 shadow-lg"
            >
              <Settings className="h-4 w-4 text-white/70" />
              Paramètres
            </Link>
          </div>
        </div>
      </div>

      {/* ─────────────────── CONTENT ─────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-12 -mt-8 relative z-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">

          {/* ── Left column (3/5) ── */}
          <div className="space-y-8 lg:col-span-3">
            <AgencyInfoCard agency={agency} />
            <AgencyAICard ai={ai} />

            {/* Facturation */}
            <div className="group overflow-hidden rounded-2xl border bg-card transition-all duration-300">
              <div className="flex items-center justify-between border-b border-border/50 px-7 py-5 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-muted p-2 text-muted-foreground border border-border shadow-sm">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <h2 className="card-title">Abonnement & Facturation</h2>
                </div>
                <Link
                  href="/app/agency/billing"
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Gérer <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="p-7">
                <div
                  className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <div
                    className="absolute top-0 right-0 w-64 h-64 blur-[50px] rounded-full pointer-events-none"
                    style={{ backgroundColor: `${secondaryColor}30` }}
                  />
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Plan actuel</p>
                      <p className="text-2xl font-semibold tracking-tight">
                        {billing?.plan === 'PRO' ? 'Pro' : 'Free'}
                      </p>
                      <p className="mt-1 text-lg text-white/50 font-medium">
                        {billing?.plan === 'PRO' ? '39€' : '0€'}
                        <span className="text-white/30 font-normal"> / mois</span>
                      </p>
                    </div>
                    <div className="text-right">
                      {billing?.plan === 'PRO' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                          Plan Actif
                        </span>
                      ) : (
                        <Link
                          href="/app/agency/billing"
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                        >
                          Passer au PRO →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column (2/5) ── */}
          <div className="space-y-8 lg:col-span-2">
            <AgencyTeamCard team={team} invites={invites as any[]} profile={profile} />
            <AgencyTrackingCard stats={trackingStats} />
          </div>
        </div>
      </div>
    </div>
  );
}
