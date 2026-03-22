import { cn } from "@/lib/utils";
import {
  mapOpportunityStatusLabel,
  OpportunityStatus,
} from "@/lib/validators/oppotunities";

const STATUS_PILL_STYLES: Record<OpportunityStatus, { bg: string; text: string }> = {
  inbound: { bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-700 dark:text-cyan-400" },
  to_do: { bg: "bg-muted", text: "text-muted-foreground" },
  first_contact: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400" },
  second_contact: { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-400" },
  proposal_sent: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400" },
  negotiation: { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-400" },
  won: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400" },
  lost: { bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-600 dark:text-red-400" },
};

export function StatusPill({ status }: { status: OpportunityStatus }) {
  const { bg, text } = STATUS_PILL_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
        bg,
        text
      )}
    >
      {mapOpportunityStatusLabel[status]}
    </span>
  );
}
