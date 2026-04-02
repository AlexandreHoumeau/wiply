export type DashboardActivityType =
  | "task_created"
  | "task_comment"
  | "status_changed"
  | "note_added"
  | "info_updated"
  | "ai_message_generated"
  | "tracking_link_created"
  | "created";

export type DashboardActivityMetric = {
  key: DashboardActivityType;
  label: string;
  count: number;
  href: string;
};

export type DashboardActivityDay = {
  date: string;
  label: string;
  shortLabel: string;
  total: number;
  summary: string;
  metrics: DashboardActivityMetric[];
};

export type DashboardActivityOverview = {
  today: DashboardActivityDay;
  recentDays: DashboardActivityDay[];
  totalLast7Days: number;
  activeDays: number;
  topActivityLabel: string | null;
};

export type DashboardActivityEventInput = {
  key: DashboardActivityType;
  created_at: string;
};

const DASHBOARD_ACTIVITY_CONFIG: Record<
  DashboardActivityType,
  { label: string; href: string }
> = {
  task_created: { label: "tache creee", href: "/app/projects" },
  task_comment: { label: "commentaire", href: "/app/projects" },
  status_changed: { label: "statut mis a jour", href: "/app/opportunities" },
  note_added: { label: "note ajoutee", href: "/app/opportunities" },
  info_updated: { label: "fiche mise a jour", href: "/app/opportunities" },
  ai_message_generated: { label: "message IA genere", href: "/app/opportunities" },
  tracking_link_created: { label: "lien tracke cree", href: "/app/opportunities" },
  created: { label: "opportunite creee", href: "/app/opportunities" },
};

const PARIS_TIMEZONE = "Europe/Paris";

export function isDashboardActivityType(value: string): value is DashboardActivityType {
  return value in DASHBOARD_ACTIVITY_CONFIG;
}

function getDateKey(date: Date, timeZone = PARIS_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function getStartOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDayLabel(date: Date, diffFromToday: number): { label: string; shortLabel: string } {
  if (diffFromToday === 0) {
    return { label: "Aujourd'hui", shortLabel: "Aujourd'hui" };
  }

  if (diffFromToday === -1) {
    return { label: "Hier", shortLabel: "Hier" };
  }

  const shortFormatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const fullFormatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return {
    label: fullFormatter.format(date),
    shortLabel: shortFormatter.format(date),
  };
}

function formatCountLabel(count: number, singular: string, plural?: string): string {
  return `${count} ${count > 1 ? plural ?? `${singular}s` : singular}`;
}

function buildSummary(total: number, metrics: DashboardActivityMetric[], isToday: boolean): string {
  if (total === 0) {
    return isToday
      ? "Aucune action enregistree aujourd'hui."
      : "Aucune action enregistree ce jour-la.";
  }

  const topMetrics = metrics.slice(0, 2);
  const details = topMetrics
    .map((metric) => formatCountLabel(metric.count, metric.label))
    .join(" et ");

  return isToday
    ? `${formatCountLabel(total, "action")} aujourd'hui, surtout ${details}.`
    : `${formatCountLabel(total, "action")}, surtout ${details}.`;
}

export function buildDashboardActivityOverview(
  events: DashboardActivityEventInput[],
  now = new Date()
): DashboardActivityOverview {
  const today = getStartOfDay(now);
  const countsByDay = new Map<string, Map<DashboardActivityType, number>>();

  for (const event of events) {
    const dateKey = getDateKey(new Date(event.created_at));
    const dayCounts = countsByDay.get(dateKey) ?? new Map<DashboardActivityType, number>();
    dayCounts.set(event.key, (dayCounts.get(event.key) ?? 0) + 1);
    countsByDay.set(dateKey, dayCounts);
  }

  const days: DashboardActivityDay[] = [];
  const totalsByType = new Map<DashboardActivityType, number>();

  for (let offset = 0; offset >= -6; offset -= 1) {
    const day = addDays(today, offset);
    const dateKey = getDateKey(day);
    const rawCounts = countsByDay.get(dateKey) ?? new Map<DashboardActivityType, number>();

    const metrics = [...rawCounts.entries()]
      .map(([key, count]) => ({
        key,
        count,
        label: DASHBOARD_ACTIVITY_CONFIG[key].label,
        href: DASHBOARD_ACTIVITY_CONFIG[key].href,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    for (const metric of metrics) {
      totalsByType.set(metric.key, (totalsByType.get(metric.key) ?? 0) + metric.count);
    }

    const total = metrics.reduce((sum, metric) => sum + metric.count, 0);
    const labels = formatDayLabel(day, offset);

    days.push({
      date: dateKey,
      label: labels.label,
      shortLabel: labels.shortLabel,
      total,
      summary: buildSummary(total, metrics, offset === 0),
      metrics,
    });
  }

  const [todaySummary, ...recentDays] = days;
  const totalLast7Days = days.reduce((sum, day) => sum + day.total, 0);
  const activeDays = days.filter((day) => day.total > 0).length;
  const topActivityEntry = [...totalsByType.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )[0];

  return {
    today: todaySummary,
    recentDays,
    totalLast7Days,
    activeDays,
    topActivityLabel: topActivityEntry
      ? DASHBOARD_ACTIVITY_CONFIG[topActivityEntry[0]].label
      : null,
  };
}
