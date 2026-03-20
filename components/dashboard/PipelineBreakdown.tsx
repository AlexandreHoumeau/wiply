import { cn } from "@/lib/utils";
import {
  mapOpportunityStatusLabel,
  OpportunityStatus,
} from "@/lib/validators/oppotunities";
import Link from "next/link";
import { Activity, ArrowRight, Briefcase } from "lucide-react";
import type { PipelineRow } from "@/actions/dashboard.server";

const STATUS_BAR_COLORS: Record<OpportunityStatus, string> = {
  inbound: "bg-cyan-500",
  to_do: "bg-muted-foreground/50",
  first_contact: "bg-blue-500",
  second_contact: "bg-indigo-500",
  proposal_sent: "bg-amber-500",
  negotiation: "bg-violet-500",
  won: "bg-emerald-500",
  lost: "bg-red-400",
};

export function PipelineBreakdown({
  rows,
  total,
}: {
  rows: PipelineRow[];
  total: number;
}) {
  return (
    <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600" />
          <h2 className="card-title">État du Pipeline</h2>
        </div>
        <Link
          href="/app/opportunities"
          className="text-xs font-bold text-muted-foreground hover:text-blue-600 transition-colors flex items-center gap-1"
        >
          Voir tout <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Briefcase className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm font-medium">Aucune opportunité en cours</p>
          <Link
            href="/app/opportunities"
            className="mt-4 text-xs font-bold text-blue-600 hover:underline"
          >
            Ajouter une opportunité →
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map(({ status, count }) => (
            <div key={status} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-foreground">
                  {mapOpportunityStatusLabel[status]}
                </span>
                <span className="text-muted-foreground">
                  {count} {count === 1 ? "opportunité" : "opportunités"}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    STATUS_BAR_COLORS[status]
                  )}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-border flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>Total en cours</span>
            <span className="text-foreground">{total}</span>
          </div>
        </div>
      )}
    </div>
  );
}
