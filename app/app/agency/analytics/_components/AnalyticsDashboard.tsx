"use client";

import {
  fetchAgencyAnalytics,
  type AgencyAnalyticsData,
  type AnalyticsRange,
} from "@/actions/tracking.server";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Globe,
  Link2,
  Monitor,
  MousePointerClick,
  Smartphone,
  Tablet,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

dayjs.extend(relativeTime);

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
];

const COUNTRY_NAMES: Record<string, string> = {
  FR: "France", US: "États-Unis", DE: "Allemagne", GB: "Royaume-Uni",
  ES: "Espagne", IT: "Italie", BE: "Belgique", CH: "Suisse",
  CA: "Canada", NL: "Pays-Bas", PT: "Portugal", LU: "Luxembourg",
  MA: "Maroc", SN: "Sénégal", CI: "Côte d'Ivoire", TN: "Tunisie",
  DZ: "Algérie", JP: "Japon", BR: "Brésil", AU: "Australie",
};

const DEVICE_ICONS: Record<string, React.ElementType> = {
  Mobile: Smartphone,
  Tablet: Tablet,
  Desktop: Monitor,
};

const DEVICE_COLORS: Record<string, string> = {
  Mobile: "bg-primary text-primary",
  Tablet: "bg-secondary text-amber-600",
  Desktop: "bg-accent text-primary",
};

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

function ChartTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm px-4 py-3 shadow-xl">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(149,125,246,0.6)]" />
        <p className="text-sm font-semibold text-foreground">
          {payload[0].value} <span className="text-muted-foreground font-medium">clic{payload[0].value !== 1 ? "s" : ""}</span>
        </p>
      </div>
    </div>
  );
}

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-muted", className)} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Bone key={i} className="h-32" />)}
      </div>
      <Bone className="h-[340px]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Bone className="h-[400px]" />
        <Bone className="h-[400px]" />
      </div>
    </div>
  );
}

function EmptyState({ range }: { range: AnalyticsRange }) {
  const label =
    range === "24h" ? "dernières 24h" : range === "7d" ? "7 derniers jours" : "30 derniers jours";
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center rounded-3xl border border-dashed border-border bg-muted/30">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <MousePointerClick className="h-6 w-6 text-indigo-300" />
      </div>
      <p className="text-lg font-semibold text-foreground tracking-tight">Aucune activité enregistrée</p>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
        Nous n'avons détecté aucun trafic sur vos liens de tracking lors des {label}.
      </p>
    </div>
  );
}

export function AnalyticsDashboard({
  agencyId,
  agencyName,
}: {
  agencyId: string;
  agencyName: string;
}) {
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [data, setData] = useState<AgencyAnalyticsData | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!agencyId) return;
    startTransition(async () => {
      const result = await fetchAgencyAnalytics(agencyId, range);
      setData(result);
    });
  }, [agencyId, range]);

  const isLoading = isPending || (data === null && !!agencyId);
  const isEmpty = !isLoading && data !== null && data.totalClicks === 0;

  const rangeLabel =
    range === "24h" ? "dernières 24h" : range === "7d" ? "7 derniers jours" : "30 derniers jours";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header with premium segmented control ── */}
      <div className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/app/agency"
              className="flex items-center gap-1.5 font-medium text-muted-foreground hover:text-indigo-600 transition-colors bg-muted hover:bg-muted px-2.5 py-1.5 rounded-md border border-border/50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {agencyName}
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-semibold text-foreground tracking-tight">Vue d'ensemble</span>
          </div>

          <div className="flex items-center p-1 rounded-xl border border-border bg-muted/50">
            {RANGES.map((r) => {
              const isActive = range === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  disabled={isPending}
                  className={cn(
                    "relative px-4 py-1.5 text-xs font-semibold transition-all duration-300 rounded-lg disabled:opacity-50",
                    isActive
                      ? "text-indigo-700 dark:text-indigo-400 shadow-sm bg-card"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isEmpty ? (
          <EmptyState range={range} />
        ) : data ? (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(
                [
                  { label: "Clics Totaux", value: data.totalClicks, sub: rangeLabel, icon: MousePointerClick, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-100 dark:border-violet-800/40" },
                  { label: "Visiteurs uniques", value: data.uniqueIPs, sub: "IPs distinctes", icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-100 dark:border-blue-800/40" },
                  { label: "Liens Actifs", value: data.activeLinks, sub: "en ce moment", icon: Link2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-100 dark:border-emerald-800/40" },
                  {
                    label: "Top Pays",
                    value: data.topCountry
                      ? `${countryFlag(data.topCountry)} ${COUNTRY_NAMES[data.topCountry] ?? data.topCountry}`
                      : "—",
                    sub: "le plus d'engagement",
                    icon: Globe,
                    color: "text-amber-600 dark:text-amber-400",
                    bg: "bg-amber-50 dark:bg-amber-950/40",
                    border: "border-amber-100 dark:border-amber-800/40",
                  },
                ] as const
              ).map((stat) => {
                const Icon = stat.icon;
                const isStr = typeof stat.value === "string";
                return (
                  <div
                    key={stat.label}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                      <div className={cn("rounded-lg p-1.5 border transition-colors", stat.bg, stat.border, stat.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <p
                      className={cn(
                        "font-semibold text-foreground tracking-tight",
                        isStr ? "text-xl truncate" : "text-4xl tabular-nums"
                      )}
                    >
                      {stat.value}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Chart Area */}
            <div className="rounded-3xl border border-border bg-card overflow-hidden">
              <div className="px-8 py-6 border-b border-border/50 bg-muted/20">
                <h2 className="card-title">Trafic dans le temps</h2>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  {range === "24h"
                    ? "Évolution horaire · Dernières 24h"
                    : range === "7d"
                    ? "Évolution journalière · 7 derniers jours"
                    : "Évolution journalière · 30 derniers jours"}
                </p>
              </div>
              <div className="px-6 py-8">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={data.clicksByTime}
                    margin={{ top: 5, right: 0, bottom: 0, left: -25 }}
                  >
                    <defs>
                      <linearGradient id="clicksGradColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#957DF6" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#957DF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={12}
                      interval={range === "24h" ? 3 : range === "30d" ? 4 : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={12}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stroke="#957DF6"
                      strokeWidth={3}
                      fill="url(#clicksGradColor)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#957DF6", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Countries + Devices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Countries */}
              <div className="rounded-3xl border border-border bg-card flex flex-col">
                <div className="px-8 py-6 border-b border-border/50 flex items-center gap-3 bg-muted/20">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-800/40 shadow-sm">
                    <Globe className="h-4 w-4" />
                  </div>
                  <h2 className="card-title">Régions</h2>
                </div>
                <div className="p-8 space-y-6 flex-1">
                  {data.countryBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-medium">Aucune donnée de localisation</p>
                  ) : (
                    data.countryBreakdown.map((c) => (
                      <div key={c.code} className="flex items-center gap-4 group/country">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border border-border text-lg shadow-sm">
                          {countryFlag(c.code)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {COUNTRY_NAMES[c.code] ?? c.code}
                            </span>
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground tabular-nums">
                              {c.clicks}
                              <span className="text-xs font-medium text-muted-foreground w-8 text-right">{c.pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden shadow-inner">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000 ease-out"
                              style={{ width: `${c.pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Devices */}
              <div className="rounded-3xl border border-border bg-card flex flex-col">
                <div className="px-8 py-6 border-b border-border/50 flex items-center gap-3 bg-muted/20">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/40 shadow-sm">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <h2 className="card-title">Plateformes</h2>
                </div>
                <div className="p-8 space-y-6 flex-1">
                  {data.deviceBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-medium">Aucune donnée technique</p>
                  ) : (
                    data.deviceBreakdown.map((d) => {
                      const Icon = DEVICE_ICONS[d.device] ?? Monitor;
                      const theme = DEVICE_COLORS[d.device] ?? "bg-slate-500 text-slate-600";
                      const [bgColor, textColor] = theme.split(" ");
                      return (
                        <div key={d.device} className="flex items-center gap-4 group/device">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border shadow-sm transition-colors group-hover/device:border-border">
                            <Icon className={cn("h-4 w-4 transition-colors", textColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-foreground">{d.device}</span>
                              <div className="flex items-center gap-2 text-sm font-semibold text-foreground tabular-nums">
                                {d.clicks}
                                <span className="text-xs font-medium text-muted-foreground w-8 text-right">{d.pct}%</span>
                              </div>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden shadow-inner">
                              <div
                                className={cn("h-full rounded-full transition-all duration-1000 ease-out", bgColor)}
                                style={{ width: `${d.pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top links */}
              {data.topLinks.some((l) => l.click_count > 0) && (
                <div className="rounded-3xl border border-border bg-card overflow-hidden flex flex-col">
                  <div className="px-8 py-6 border-b border-border/50 flex items-center gap-3 bg-muted/20">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/40 shadow-sm">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <h2 className="card-title">Top Liens</h2>
                  </div>
                  <div className="divide-y divide-border/50 flex-1">
                    {data.topLinks
                      .filter((l) => l.click_count > 0)
                      .map((link, i) => {
                        const maxClicks = data.topLinks[0]?.click_count || 1;
                        const pct = Math.round((link.click_count / maxClicks) * 100);
                        const href = link.opportunity_slug ? `/app/opportunities/${link.opportunity_slug}` : null;
                        return (
                          <div key={link.opportunity_slug ?? i} className="px-8 py-5 flex items-center gap-5 hover:bg-muted/30 transition-colors group/link">
                            <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground/40 tabular-nums group-hover/link:text-blue-500 transition-colors">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                {href ? (
                                  <Link
                                    href={href}
                                    className="text-sm font-semibold text-foreground truncate tracking-tight hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-2 transition-colors"
                                  >
                                    {link.opportunity_name ?? "—"}
                                  </Link>
                                ) : (
                                  <span className="text-sm font-semibold text-foreground truncate tracking-tight">
                                    {link.opportunity_name ?? "—"}
                                  </span>
                                )}
                                <span className="ml-3 shrink-0 rounded-md bg-card border border-border px-2.5 py-0.5 text-xs font-semibold tabular-nums text-foreground shadow-sm group-hover/link:border-blue-200">
                                  {link.click_count} clics
                                </span>
                              </div>
                              {link.links_count > 1 && (
                                <p className="text-[10px] text-muted-foreground mb-2">{link.links_count} liens trackés</p>
                              )}
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-2">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-out"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Recent activity */}
              {data.recentClicks.length > 0 && (
                <div className="rounded-3xl border border-border bg-card overflow-hidden flex flex-col">
                  <div className="px-8 py-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800/40 shadow-sm">
                        <Zap className="h-4 w-4" />
                      </div>
                      <h2 className="card-title">Flux en direct</h2>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-card border border-border shadow-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Live
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-border/50 flex-1">
                    {data.recentClicks.slice(0, 6).map((click, i) => {
                      const DevIcon = DEVICE_ICONS[click.device_type ?? "Desktop"] ?? Monitor;
                      return (
                        <div
                          key={i}
                          className="px-8 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors group/click"
                        >
                          <div className="h-9 w-9 shrink-0 rounded-xl border border-border bg-card shadow-sm flex items-center justify-center group-hover/click:border-emerald-200 transition-colors">
                            <DevIcon className="h-4 w-4 text-muted-foreground group-hover/click:text-emerald-600 dark:group-hover/click:text-emerald-400 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono text-xs font-semibold text-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
                                {click.ip_address}
                              </span>
                              {click.country_code && (
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                  {countryFlag(click.country_code)}
                                  {COUNTRY_NAMES[click.country_code] ?? click.country_code}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground tracking-tight">
                              {click.os_type && <span>{click.os_type}</span>}
                              {click.os_type && click.opportunity_name && <span>•</span>}
                              {click.opportunity_name && (
                                click.opportunity_slug ? (
                                  <Link
                                    href={`/app/opportunities/${click.opportunity_slug}`}
                                    className="text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-2 transition-colors"
                                  >
                                    {click.opportunity_name}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">{click.opportunity_name}</span>
                                )
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right w-16">
                            {dayjs(click.clicked_at).locale("fr").fromNow(true)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
