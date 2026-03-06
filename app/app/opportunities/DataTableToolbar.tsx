"use client";

import { Table } from "@tanstack/react-table";
import { Search, SlidersHorizontal, Star, X } from "lucide-react";

import { MultiSelectFilterDropdown } from "@/components/table/MultiSelectFilterDropdown";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ALL_CONTACT_VIA,
  ALL_STATUSES,
  ContactVia,
  OpportunityStatus,
  mapContactViaLabel,
  mapOpportunityStatusLabel,
} from "@/lib/validators/oppotunities";
import { CONTACT_COLORS, STATUS_COLORS } from "@/utils/general";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchInput: string;
  setSearchInput: (value: string) => void;
  statuses: OpportunityStatus[];
  contactVia: ContactVia[];
  starredOnly: boolean;
  onFilterChange: (key: string, values: string[]) => void;
  onToggleStarred: () => void;
  onReset: () => void;
}

export function DataTableToolbar<TData>({
  table: _table,
  searchInput,
  setSearchInput,
  statuses,
  contactVia,
  starredOnly,
  onFilterChange,
  onToggleStarred,
  onReset,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    statuses.length < ALL_STATUSES.length ||
    contactVia.length < ALL_CONTACT_VIA.length ||
    searchInput.length > 0 ||
    starredOnly;

  const activeFilterCount =
    (statuses.length < ALL_STATUSES.length ? 1 : 0) +
    (contactVia.length < ALL_CONTACT_VIA.length ? 1 : 0) +
    (starredOnly ? 1 : 0);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">

      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <Input
          placeholder="Rechercher..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 pr-4 h-9 w-full bg-slate-50 border-slate-200 hover:border-slate-300 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-50 rounded-lg text-sm placeholder:text-slate-400 transition-all"
        />
        {searchInput.length > 0 && (
          <button
            onClick={() => setSearchInput("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-8 w-px bg-slate-100" />

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest pr-1">
          <SlidersHorizontal className="h-3 w-3" />
          <span>Filtres</span>
          {activeFilterCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="h-5 w-px bg-slate-100" />

        <MultiSelectFilterDropdown
          label="Statut"
          values={ALL_STATUSES}
          selectedValues={statuses}
          setSelectedValues={(vals) => onFilterChange("status", vals)}
          renderItem={(status) => (
            <div className="flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[status].replace("text-", "bg-")}`} />
              <span className="text-xs font-medium">{mapOpportunityStatusLabel[status]}</span>
            </div>
          )}
        />

        <MultiSelectFilterDropdown
          label="Canal"
          values={ALL_CONTACT_VIA}
          selectedValues={contactVia}
          setSelectedValues={(vals) => onFilterChange("contact_via", vals)}
          renderItem={(method) => (
            <Badge className={`text-[10px] uppercase tracking-wider ${CONTACT_COLORS[method]}`}>
              {mapContactViaLabel[method]}
            </Badge>
          )}
        />

        <div className="h-5 w-px bg-slate-100" />

        <button
          onClick={onToggleStarred}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
            starredOnly
              ? "bg-amber-50 border-amber-300 text-amber-600"
              : "bg-transparent border-transparent text-slate-400 hover:text-amber-500 hover:bg-amber-50 hover:border-amber-200"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${starredOnly ? "fill-amber-400 text-amber-400" : ""}`} />
          Favoris
        </button>

        {isFiltered && (
          <>
            <div className="h-5 w-px bg-slate-100" />
            <button
              onClick={() => {
                setSearchInput("");
                onReset();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors px-1 py-1 rounded-md hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5" />
              Réinitialiser
            </button>
          </>
        )}
      </div>
    </div>
  );
}