import Link from "next/link";
import { ArrowRight, BellRing, Building2, HardDrive, Users2, FileText } from "lucide-react";
import type { DashboardActionItem } from "@/actions/dashboard.server";
import { cn } from "@/lib/utils";

const ICONS = {
  "stale-opportunities": BellRing,
  "sent-quotes": FileText,
  "agency-profile": Building2,
  "storage-usage": HardDrive,
  "invite-team": Users2,
} as const;

const TONE_STYLES = {
  default: "border-border bg-card",
  warning: "border-amber-200 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/20",
  success: "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/70 dark:bg-emerald-950/20",
} as const;

const ICON_STYLES = {
  default: "bg-muted text-muted-foreground",
  warning: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  success: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
} as const;

export function PriorityActions({ items }: { items: DashboardActionItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Actions prioritaires</h2>
          <p className="text-sm text-muted-foreground">
            Les prochains gestes qui peuvent faire avancer votre agence aujourd&apos;hui.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((item) => {
          const Icon = ICONS[item.id as keyof typeof ICONS] ?? BellRing;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "group rounded-2xl border p-5 transition-all hover:shadow-sm hover:-translate-y-0.5",
                TONE_STYLES[item.tone]
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", ICON_STYLES[item.tone])}>
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/70" />
              </div>

              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>

              <div className="mt-5 text-sm font-semibold text-foreground">
                {item.ctaLabel}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
