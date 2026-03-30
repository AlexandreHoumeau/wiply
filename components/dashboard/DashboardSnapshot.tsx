import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FileText,
  Mail,
  TriangleAlert,
  Users2,
  Workflow,
} from "lucide-react";
import type { DashboardSnapshot as DashboardSnapshotData } from "@/actions/dashboard.server";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    key: "sentQuotesCount",
    label: "Devis envoyés",
    subtitle: "en attente de réponse",
    href: "/app/quotes",
    icon: FileText,
    tone: "default",
  },
  {
    key: "draftQuotesCount",
    label: "Brouillons",
    subtitle: "à finaliser ou envoyer",
    href: "/app/quotes",
    icon: FileText,
    tone: "default",
  },
  {
    key: "inProgressTasksCount",
    label: "Tickets en cours",
    subtitle: "dans vos projets actifs",
    href: "/app/projects",
    icon: Workflow,
    tone: "default",
  },
  {
    key: "overdueTasksCount",
    label: "Tickets en retard",
    subtitle: "à traiter rapidement",
    href: "/app/projects",
    icon: TriangleAlert,
    tone: "warning",
  },
  {
    key: "memberCount",
    label: "Membres",
    subtitle: "dans l'agence",
    href: "/app/agency/settings",
    icon: Users2,
    tone: "success",
  },
  {
    key: "companyCount",
    label: "Clients",
    subtitle: "dans votre base",
    href: "/app/companies",
    icon: Building2,
    tone: "default",
  },
  {
    key: "trackingLinksThisMonth",
    label: "Liens trackés",
    subtitle: "créés ce mois-ci",
    href: "/app/opportunities",
    icon: Mail,
    tone: "default",
  },
] as const;

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

export function DashboardSnapshot({ snapshot }: { snapshot: DashboardSnapshotData }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Aperçu rapide</h2>
        <p className="text-sm text-muted-foreground">
          Plus de contexte sur votre commerce, votre delivery et votre équipe.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const value = snapshot[item.key];

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group rounded-2xl border p-4 transition-all hover:shadow-sm hover:-translate-y-0.5",
                TONE_STYLES[item.tone]
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", ICON_STYLES[item.tone])}>
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-foreground/70" />
              </div>

              <div className="mt-4">
                <p className="text-2xl font-black text-foreground">{value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
