import Link from "next/link";
import { ArrowRight, Bell, MousePointerClick } from "lucide-react";
import { StatusPill } from "./StatusPill";
import type { RelanceOpp } from "@/actions/dashboard.server";
import { OpportunityStatus } from "@/lib/validators/oppotunities";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return `il y a ${minutes}min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days === 1) return "hier";
  return `il y a ${days}j`;
}

export function RelanceSuggestions({ relances }: { relances: RelanceOpp[] }) {
  if (relances.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-100 rounded-xl">
            <Bell className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h2 className="card-title">Relances suggérées</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ces prospects ont cliqué sur un de vos liens ces 7 derniers jours
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
          {relances.length} opportunité{relances.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {relances.map((opp) => (
          <Link
            key={opp.id}
            href={`/app/opportunities/${opp.slug}`}
            className="group flex items-start justify-between bg-white rounded-xl border border-amber-100 hover:border-amber-300 p-4 transition-all hover:shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <StatusPill status={opp.status as OpportunityStatus} />
              </div>
              <p className="text-sm font-bold text-slate-900 truncate">{opp.name}</p>
              {opp.company_name && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{opp.company_name}</p>
              )}
              <div className="flex items-center gap-3 mt-2.5">
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                  <MousePointerClick className="w-3 h-3" />
                  {opp.clicks_7d} clic{opp.clicks_7d > 1 ? "s" : ""}
                </span>
                <span className="text-xs text-slate-400">{timeAgo(opp.last_click_at)}</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-300 group-hover:text-amber-500 transition-colors mt-0.5 shrink-0 ml-2" />
          </Link>
        ))}
      </div>
    </div>
  );
}
