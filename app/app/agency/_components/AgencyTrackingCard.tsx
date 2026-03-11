import { AgencyTrackingStats } from "@/actions/tracking.server";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";
import {
  ArrowRight,
  BarChart3,
  Link2,
  Monitor,
  MousePointerClick,
  Smartphone,
  Tablet,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";

dayjs.extend(relativeTime);

const DEVICE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  Mobile: { label: "Mobile", icon: Smartphone },
  Desktop: { label: "Desktop", icon: Monitor },
  Tablet: { label: "Tablette", icon: Tablet },
};

export function AgencyTrackingCard({ stats }: { stats: AgencyTrackingStats }) {
  const hasActivity = stats.totalClicks > 0;
  const totalDeviceClicks = Object.values(stats.deviceBreakdown).reduce((a, b) => a + b, 0);

  const devices = Object.entries(stats.deviceBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    // Removed h-full to prevent vertical stretching
    <div className="group overflow-hidden rounded-2xl border bg-white transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100/80 px-7 py-5 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2 border border-slate-200 shadow-sm relative overflow-hidden bg-white" style={{ color: 'var(--brand-secondary, #6366F1)' }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundColor: 'var(--brand-secondary, #6366F1)' }} />
            <BarChart3 className="h-4 w-4 relative z-10" />
          </div>
          <h2 className="card-title">Analytics & Tracking</h2>
        </div>
        <Link
          href="/app/agency/analytics"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          Analyse détaillée <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="p-7 space-y-7">
        {/* Key metrics with subtle colors */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col rounded-xl border border-slate-100 bg-white px-4 py-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-md bg-slate-50 p-1.5">
                <Link2 className="h-3.5 w-3.5 text-slate-500" style={{ color: 'var(--brand-secondary, #6366F1)' }} />
              </div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Liens</span>
            </div>
            <span className="text-2xl font-semibold text-slate-900 tracking-tight tabular-nums">{stats.totalLinks}</span>
          </div>
          <div className="flex flex-col rounded-xl border border-slate-100 bg-white px-4 py-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-md bg-slate-50 p-1.5">
                <MousePointerClick className="h-3.5 w-3.5" style={{ color: 'var(--brand-secondary, #6366F1)' }} />
              </div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Clics</span>
            </div>
            <span className="text-2xl font-semibold text-slate-900 tracking-tight tabular-nums">{stats.totalClicks}</span>
          </div>
          <div className="flex flex-col rounded-xl border border-slate-100 bg-white px-4 py-4 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-md bg-emerald-50 p-1.5">
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Actifs</span>
            </div>
            <span className="text-2xl font-semibold text-slate-900 tracking-tight tabular-nums">{stats.activeLinks}</span>
          </div>
        </div>

        {hasActivity ? (
          <div className="space-y-7">
            {/* Device breakdown */}
            {devices.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Répartition par appareil
                  </p>
                </div>
                <div className="space-y-3.5">
                  {devices.map(([device, count]) => {
                    const config = DEVICE_CONFIG[device] ?? {
                      label: device,
                      icon: Monitor,
                      color: "text-slate-400",
                      bar: "bg-slate-400",
                    };
                    const Icon = config.icon;
                    const pct = totalDeviceClicks > 0 ? Math.round((count / totalDeviceClicks) * 100) : 0;
                    return (
                      <div key={device} className="flex items-center gap-3 group/device">
                        <Icon
                          className="h-4 w-4 shrink-0 transition-colors text-slate-400"
                          style={{ color: 'var(--brand-secondary, #6366F1)' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-slate-700">{config.label}</span>
                            <span className="text-xs font-medium tabular-nums text-slate-500">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                              style={{ width: `${pct}%`, backgroundColor: 'var(--brand-secondary, #6366F1)' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top links */}
            {stats.topLinks.some((l) => l.click_count > 0) && (
              <div className="pt-2">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Liens les plus performants
                </p>
                <div className="space-y-2">
                  {stats.topLinks
                    .filter((l) => l.click_count > 0)
                    .map((link) => {
                      const href = link.opportunity_slug ? `/app/opportunities/${link.opportunity_slug}` : null;
                      const inner = (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 rounded-md bg-slate-50 text-slate-400 group-hover/link:bg-slate-100 group-hover/link:text-slate-600 transition-colors">
                              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                            </div>
                            <span className="text-xs font-medium text-slate-700 truncate tracking-tight group-hover/link:text-slate-900">
                              {link.opportunity_name ?? "—"}
                            </span>
                          </div>
                          <span className="ml-3 rounded-md bg-white border border-slate-100 px-2 py-1 shrink-0 text-xs font-semibold tabular-nums text-slate-900 shadow-sm group-hover/link:border-slate-200">
                            {link.click_count}
                          </span>
                        </>
                      );
                      return href ? (
                        <Link
                          key={link.opportunity_slug}
                          href={href}
                          className="group/link flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3.5 py-3 hover:border-slate-200 hover:shadow-sm hover:bg-slate-50 transition-all"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div
                          key={link.opportunity_slug ?? link.click_count}
                          className="group/link flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3.5 py-3"
                        >
                          {inner}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Last activity */}
            {stats.lastClickedAt && (
              <div className="flex items-center justify-between pt-5 border-t border-slate-100/80">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Activité récente
                </div>
                <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  {dayjs(stats.lastClickedAt).locale("fr").fromNow()}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
              <MousePointerClick className="h-4 w-4 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-900 tracking-tight">Aucune donnée</p>
            <p className="mt-1 text-xs text-slate-500 max-w-[200px] leading-relaxed">
              Les statistiques apparaîtront ici dès qu'un lien sera cliqué.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}