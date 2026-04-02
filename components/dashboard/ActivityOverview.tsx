import Link from "next/link";
import type { ElementType } from "react";
import type {
  DashboardActivityMetric,
  DashboardActivityOverview,
} from "@/lib/dashboard/activity-overview";
import {
  CalendarRange,
  CheckSquare,
  FileEdit,
  Flame,
  Gauge,
  Medal,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<DashboardActivityMetric["key"], ElementType> = {
  task_created: CheckSquare,
  task_comment: MessageSquare,
  status_changed: Workflow,
  note_added: FileEdit,
  info_updated: FileEdit,
  ai_message_generated: Sparkles,
  tracking_link_created: TrendingUp,
  created: Target,
};

const METRIC_STYLES: Record<DashboardActivityMetric["key"], string> = {
  task_created: "bg-sky-400",
  task_comment: "bg-indigo-500",
  status_changed: "bg-emerald-500",
  note_added: "bg-amber-400",
  info_updated: "bg-rose-400",
  ai_message_generated: "bg-violet-500",
  tracking_link_created: "bg-cyan-500",
  created: "bg-orange-500",
};

function ActivityPill({ metric }: { metric: DashboardActivityMetric }) {
  const Icon = ICONS[metric.key] ?? CalendarRange;

  return (
    <Link
      href={metric.href}
      className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", METRIC_STYLES[metric.key])} />
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{metric.count}</span>
      <span className="text-muted-foreground">{metric.label}</span>
    </Link>
  );
}

export function ActivityOverview({ overview }: { overview: DashboardActivityOverview }) {
  const days = [...overview.recentDays].reverse().concat(overview.today);
  const maxTotal = Math.max(...days.map((day) => day.total), 1);
  const hasActivity = overview.totalLast7Days > 0;
  const average = Math.round(overview.totalLast7Days / 7);
  const bestDay = days.reduce((best, day) => (day.total > best.total ? day : best), days[0]);
  let streak = 0;
  for (const day of days.slice().reverse()) {
    if (day.total > 0) {
      streak += 1;
    } else {
      break;
    }
  }
  const todayDelta = overview.today.total - average;
  const trendLabel =
    !hasActivity
      ? "Aucun rythme detectable pour l'instant."
      : overview.today.total === 0
        ? "Journee calme pour le moment."
        : todayDelta > 0
          ? `Vous etes au-dessus de votre rythme moyen de ${todayDelta} action${todayDelta > 1 ? "s" : ""}.`
          : todayDelta < 0
            ? `Vous etes ${Math.abs(todayDelta)} action${Math.abs(todayDelta) > 1 ? "s" : ""} sous votre moyenne recente.`
            : "Vous etes exactement dans votre rythme moyen.";

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Votre rythme de travail</h2>
          <p className="text-sm text-muted-foreground">
            Une vue plus visuelle de votre activite sur les 7 derniers jours.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
          <span className="rounded-full border border-border bg-card px-3 py-1.5">
            {overview.activeDays} jour{overview.activeDays > 1 ? "s" : ""} actif{overview.activeDays > 1 ? "s" : ""}
          </span>
          <span className="rounded-full border border-border bg-card px-3 py-1.5">
            moyenne {average}/jour
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="border-b border-border/70 bg-gradient-to-br from-[#f8f6ff] via-white to-[#fff3e3] p-5 dark:from-white/5 dark:via-card dark:to-white/0 xl:border-b-0 xl:border-r">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Vue hebdo
                </p>
                <h3 className="mt-2 text-2xl text-foreground">Activite sur 7 jours</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Chaque barre correspond a une journee. Les couleurs indiquent le type d&apos;actions
                  que vous avez le plus realisees.
                </p>
              </div>

              <div className="hidden rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-right backdrop-blur-sm dark:border-white/10 dark:bg-white/5 sm:block">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Total 7 jours
                </p>
                <p className="mt-2 text-2xl font-black text-foreground">
                  {overview.totalLast7Days}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Flame className="h-4 w-4" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Serie</p>
                </div>
                <p className="mt-3 text-3xl font-black text-foreground">{streak}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  jour{streak > 1 ? "s" : ""} d&apos;activite consecutive
                </p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Medal className="h-4 w-4" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Pic</p>
                </div>
                <p className="mt-3 text-3xl font-black text-foreground">{bestDay.total}</p>
                <p className="mt-1 text-sm text-muted-foreground">{bestDay.shortLabel}</p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Cadence</p>
                </div>
                <p className="mt-3 text-3xl font-black text-foreground">{average}</p>
                <p className="mt-1 text-sm text-muted-foreground">actions par jour</p>
              </div>
            </div>

            <div className="mt-8">
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-8">
                  {[100, 66, 33, 0].map((mark) => (
                    <div
                      key={mark}
                      className="flex items-center gap-3"
                    >
                      <span className="w-10 shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                        {mark === 100 ? `${maxTotal}` : mark === 0 ? "0" : ""}
                      </span>
                      <div className="h-px flex-1 border-t border-dashed border-foreground/10" />
                    </div>
                  ))}
                </div>

                <div className="flex h-80 items-end gap-3 pl-14 md:h-96 md:gap-4">
                {days.map((day) => {
                  const height = day.total > 0 ? Math.max((day.total / maxTotal) * 100, 4) : 2;
                  const relativePercent = Math.round((day.total / maxTotal) * 100);
                  const isPeak = day.total === maxTotal && day.total > 0;

                  return (
                    <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center gap-3">
                      <div className="flex min-h-9 flex-col items-center justify-end">
                        <div className="text-xs font-semibold text-muted-foreground">{day.total}</div>
                        {isPeak ? (
                          <div className="mt-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-background">
                            Pic
                          </div>
                        ) : day.total > 0 ? (
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                            {relativePercent}%
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/40">
                            0%
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 w-full items-end justify-center">
                        <div
                          className={cn(
                            "flex w-full max-w-[72px] flex-col overflow-hidden rounded-t-[22px] rounded-b-[14px] border border-white/80 bg-white/80 shadow-[0_12px_30px_rgba(149,125,246,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5",
                            day.date === overview.today.date && "ring-2 ring-primary/30",
                            isPeak && "shadow-[0_16px_40px_rgba(76,76,76,0.16)] ring-2 ring-foreground/20"
                          )}
                          style={{ height: `${height}%` }}
                          title={day.summary}
                        >
                          {day.total > 0 ? (
                            day.metrics.map((metric) => (
                              <div
                                key={metric.key}
                                className={cn("w-full", METRIC_STYLES[metric.key])}
                                style={{ height: `${(metric.count / day.total) * 100}%` }}
                              />
                            ))
                          ) : (
                            <div className="h-full w-full bg-muted/70" />
                          )}
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">{day.shortLabel}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {day.date === overview.today.date ? "Aujourd'hui" : " "}
                        </p>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {days.flatMap((day) => day.metrics)
                .filter((metric, index, metrics) => metrics.findIndex((item) => item.key === metric.key) === index)
                .map((metric) => (
                  <div
                    key={metric.key}
                    className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full", METRIC_STYLES[metric.key])} />
                    <span className="text-muted-foreground">{metric.label}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="p-5">
            <div className="rounded-[24px] border border-border bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
                    Aujourd&apos;hui
                  </p>
                  <p className="mt-3 text-5xl font-black leading-none text-foreground">
                    {overview.today.total}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-foreground">
                  <CalendarRange className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {overview.today.total > 0
                  ? overview.today.summary
                  : "Pas encore d'activite attribuee a votre compte aujourd'hui."}
              </p>

              <div className="mt-4 rounded-2xl bg-accent/60 px-4 py-3 text-sm text-foreground">
                {trendLabel}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {overview.today.metrics.length > 0 ? (
                  overview.today.metrics.map((metric) => (
                    <ActivityPill key={metric.key} metric={metric} />
                  ))
                ) : (
                  <span className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">
                    Rien a afficher pour le moment
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {days
                .slice()
                .reverse()
                .filter((day) => day.total > 0)
                .slice(0, 3)
                .map((day) => (
                  <div
                    key={day.date}
                    className="rounded-2xl border border-border bg-background px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{day.label}</p>
                      <p className="text-sm font-black text-foreground">{day.total}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{day.summary}</p>
                  </div>
                ))}

              {!hasActivity ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Vos prochaines notes, commentaires et mouvements de pipeline apparaitront ici.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
