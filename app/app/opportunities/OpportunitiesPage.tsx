"use client";
import { deleteOpportunities, updateOpportunityFavorite } from "@/actions/opportunity.client";
import { updateOpportunityStatus } from "@/actions/opportunity.server";
import { OpportunityDialog } from "@/components/opportunities/OpportunityDialog";
import { Button } from "@/components/ui/button";
import { useLoadingBar } from "@/hooks/useLoadingBar";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  ALL_CONTACT_VIA,
  ALL_STATUSES,
  mapOpportunityStatusLabel,
  OpportunityStatus,
  OpportunityWithCompany,
} from "@/lib/validators/oppotunities";
import { STATUS_COLORS } from "@/utils/general";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus } from "lucide-react";
import { useState } from "react";
import { getColumns } from "./columns";
import { DataTable } from "./data-table";
import { ConvertProjectDialog } from "@/components/projects/ConvertProjectDialog";

export default function OpportunitiesPage() {
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [convertingOpp, setConvertingOpp] = useState<OpportunityWithCompany | null>(null);
  const [editing, setEditing] = useState<OpportunityWithCompany | null>(null);

  const {
    opportunities, total, page, pageSize, search, statuses, contactVia,
    isLoading, statusCounts, starredOnly, updateURL,
  } = useOpportunities({
    pageSize: 10,
    agencyId: profile?.agency_id || "",
    enabled: !!profile?.agency_id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OpportunityStatus }) => updateOpportunityStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities-status-counts"] });
    },
  });

  useLoadingBar(isLoading);

  const columns = getColumns({
    onStatusChange: (id, status, opportunity) => {
      updateStatusMutation.mutate({ id, status });
      if (status === "won") {
        setConvertingOpp(opportunity);
      }
    },
    onDeleteOpportunities: (ids) =>
      deleteOpportunities(ids).then(() => {
        queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        queryClient.invalidateQueries({ queryKey: ["opportunities-status-counts"] });
      }),
    editOpportunity: (opp) => { setEditing(opp); setDialogOpen(true); },
    onFavoriteChange: (id, isFavorite) =>
      updateOpportunityFavorite(id, isFavorite).then(() => queryClient.invalidateQueries({ queryKey: ["opportunities"] })),
    onConvert: (opp) => setConvertingOpp(opp),
  });

  if (!profile?.agency_id) return null;

  return (
    <div className="max-w-[1400px] w-full mx-auto p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 h-full flex flex-col">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2 bg-blue-600 rounded-xl shadow-sm">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-2xl text-slate-900">Pipeline Commercial</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">Gérez vos prospects et maximisez vos conversions.</p>
        </div>

        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="px-5 transition-all active:scale-95 shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="font-bold text-sm">Nouvelle opportunité</span>
        </Button>
      </div>

      {/* STATUS METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
        {(["to_do", "first_contact", "proposal_sent", "won", "lost"] as OpportunityStatus[]).map((status) => {
          const count = statusCounts[status] || 0;
          const colorClass = STATUS_COLORS[status].split(" ")[0];
          return (
            <div key={status} className="bg-white border p-3 rounded-xl flex items-center gap-3 hover:border-primary/40 transition-colors">
              <div className={`h-2.5 w-2.5 rounded-full ${colorClass.replace("text-", "bg-")}`} />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                  {mapOpportunityStatusLabel[status]}
                </p>
                <p className="text-xl font-black text-slate-900 leading-none mt-0.5">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border overflow-hidden flex-1 flex flex-col min-h-[500px]">
        <DataTable
          columns={columns}
          data={opportunities}
          total={total}
          page={page}
          pageSize={pageSize}
          search={search}
          statuses={statuses}
          contactVia={contactVia}
          starredOnly={starredOnly}
          isLoading={isLoading}
          onSearch={(val) => updateURL({ search: val, page: "1" })}
          onFilterChange={(key, values) => updateURL({ [key]: values, page: "1" })}
          onToggleStarred={() => updateURL({ starred: starredOnly ? "" : "true", page: "1" })}
          onPagination={(newPage) => updateURL({ page: newPage.toString() })}
          onReset={() => updateURL({ search: "", status: ALL_STATUSES, contact_via: ALL_CONTACT_VIA, starred: "", page: "1" })}
        />
      </div>

      <OpportunityDialog
        userProfile={profile}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editing}
        onSaved={() => {
        queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        queryClient.invalidateQueries({ queryKey: ["opportunities-status-counts"] });
        setDialogOpen(false);
      }}
      />
      <ConvertProjectDialog
        opportunity={convertingOpp}
        open={!!convertingOpp}
        onOpenChange={(isOpen) => !isOpen && setConvertingOpp(null)}
      />
    </div>
  );
}