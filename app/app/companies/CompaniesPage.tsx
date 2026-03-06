"use client";

import { useAgency } from "@/providers/agency-provider";
import { useCompanies } from "@/hooks/useCompanies";
import { useLoadingBar } from "@/hooks/useLoadingBar";
import { CompaniesView } from "@/components/companies/CompaniesView";
import {
  DEFAULT_TAB,
  DEFAULT_SORT,
} from "@/lib/validators/companies";
import { Building2 } from "lucide-react";

export default function CompaniesPage() {
  const { agency_id } = useAgency();

  const {
    companies,
    total,
    allCount,
    clientsCount,
    prospectsCount,
    availableSectors,
    search,
    tab,
    sectors,
    sort,
    page,
    pageSize,
    isLoading,
    updateURL,
  } = useCompanies({ agencyId: agency_id, enabled: !!agency_id });

  useLoadingBar(isLoading);

  return (
    <div className="w-full flex-1 p-6 md:p-8 space-y-8 animate-in fade-in duration-500">

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-center shrink-0">
          <Building2 className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl text-slate-900 tracking-tight">Entreprises</h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            {allCount === 0
              ? "Aucune entreprise enregistrée."
              : `${allCount} entreprise${allCount > 1 ? "s" : ""} — ${clientsCount} client${clientsCount > 1 ? "s" : ""}, ${prospectsCount} prospect${prospectsCount > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <CompaniesView
        companies={companies}
        total={total}
        allCount={allCount}
        clientsCount={clientsCount}
        prospectsCount={prospectsCount}
        availableSectors={availableSectors}
        search={search}
        tab={tab}
        sectors={sectors}
        sort={sort}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        onSearch={(val) => updateURL({ search: val, page: "1" })}
        onTabChange={(val) => updateURL({ tab: val, page: "1" })}
        onSectorsChange={(val) => updateURL({ sectors: val, page: "1" })}
        onSortChange={(val) => updateURL({ sort: val, page: "1" })}
        onPagination={(p) => updateURL({ page: p.toString() })}
        onPageSizeChange={(s) => updateURL({ pageSize: s.toString(), page: "1" })}
        onReset={() =>
          updateURL({ search: "", tab: DEFAULT_TAB, sectors: [], sort: DEFAULT_SORT, page: "1" })
        }
      />
    </div>
  );
}
