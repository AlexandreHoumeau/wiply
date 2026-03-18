import Link from "next/link";
import { ArrowRight, Building2, Star } from "lucide-react";
import { OpportunityStatus } from "@/lib/validators/oppotunities";
import { StatusPill } from "./StatusPill";
import type { FavoriteOpp } from "@/actions/dashboard.server";

export function PriorityOpportunities({ opps }: { opps: FavoriteOpp[] }) {
  if (opps.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          <h2 className="card-title">
            Opportunités Prioritaires
          </h2>
        </div>
        <Link
          href="/app/opportunities"
          className="text-xs font-bold text-muted-foreground hover:text-blue-600 transition-colors flex items-center gap-1"
        >
          Voir tout <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {opps.map((opp) => (
          <Link
            key={opp.id}
            href={`/app/opportunities/${opp.slug}`}
            className="group p-4 rounded-xl border border-border hover:border-amber-200 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-bold text-foreground leading-tight group-hover:text-amber-700 transition-colors line-clamp-2">
                {opp.name}
              </p>
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{opp.company?.name ?? "—"}</span>
            </div>
            <StatusPill status={opp.status as OpportunityStatus} />
          </Link>
        ))}
      </div>
    </div>
  );
}
