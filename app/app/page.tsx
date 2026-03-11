import { getAuthenticatedUserContext } from "@/actions/profile.server";
import {
  getDashboardData,
  getDashboardRecentProjects,
  getDashboardEngagement,
} from "@/actions/dashboard.server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PipelineBreakdown } from "@/components/dashboard/PipelineBreakdown";
import { ActiveProjectsList } from "@/components/dashboard/ActiveProjectsList";
import { PriorityOpportunities } from "@/components/dashboard/PriorityOpportunities";
import { RelanceSuggestions } from "@/components/dashboard/RelanceSuggestions";
import Link from "next/link";
import {
  Briefcase,
  FolderKanban,
  MousePointerClick,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const userContext = await getAuthenticatedUserContext();
  if (!userContext) return null;

  const agencyId = userContext.agency.id;

  const [data, recentProjects, engagement] = await Promise.all([
    getDashboardData(agencyId),
    getDashboardRecentProjects(agencyId),
    getDashboardEngagement(agencyId),
  ]);

  const {
    activeOpps,
    wonCount,
    lostCount,
    closedCount,
    conversionRate,
    activeProjectsCount,
    totalProjectsCount,
    pipelineRows,
    pipelineTotal,
    favoriteOpps,
  } = data;

  const { totalClicks7d, uniqueProspects7d, relances } = engagement;

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-900">
            Bonjour, {userContext.first_name} 👋
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Voici l'état de votre agence aujourd'hui.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/app/opportunities"
            className="inline-flex items-center gap-2 text-sm font-bold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            <Briefcase className="w-4 h-4" />
            Pipeline
          </Link>
          <Link
            href="/app/projects"
            className="inline-flex items-center gap-2 text-sm font-bold bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-sm active:scale-95"
          >
            <FolderKanban className="w-4 h-4" />
            Projets
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Opportunités actives"
          value={activeOpps}
          subtitle={`${wonCount} gagnée${wonCount !== 1 ? "s" : ""} au total`}
          icon={Briefcase}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          href="/app/opportunities"
        />
        <KpiCard
          title="Taux de conversion"
          value={conversionRate !== null ? `${conversionRate}%` : "—"}
          subtitle={
            closedCount > 0
              ? `${wonCount} gagnée${wonCount !== 1 ? "s" : ""} / ${lostCount} perdue${lostCount !== 1 ? "s" : ""}`
              : "Pas encore de données"
          }
          icon={conversionRate !== null && conversionRate >= 50 ? TrendingUp : TrendingDown}
          iconBg={conversionRate !== null && conversionRate >= 50 ? "bg-emerald-50" : "bg-red-50"}
          iconColor={conversionRate !== null && conversionRate >= 50 ? "text-emerald-600" : "text-red-500"}
        />
        <KpiCard
          title="Projets actifs"
          value={activeProjectsCount}
          subtitle={`${totalProjectsCount} projet${totalProjectsCount !== 1 ? "s" : ""} au total`}
          icon={FolderKanban}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          href="/app/projects"
        />
        <KpiCard
          title="Prospects engagés (7j)"
          value={uniqueProspects7d}
          subtitle={`${totalClicks7d} clic${totalClicks7d !== 1 ? "s" : ""} sur vos liens`}
          icon={MousePointerClick}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          href="/app/opportunities"
        />
      </div>

      {/* Relances suggérées */}
      <RelanceSuggestions relances={relances} />

      {/* Pipeline + Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <PipelineBreakdown rows={pipelineRows} total={pipelineTotal} />
        <ActiveProjectsList projects={recentProjects} />
      </div>

      {/* Priority opportunities */}
      <PriorityOpportunities opps={favoriteOpps} />
    </div>
  );
}
