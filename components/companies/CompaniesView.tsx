"use client";

import { useEffect, useState } from "react";
import {
  CompanyWithRelations,
  CompanyTab,
  CompanySortKey,
  SORT_LABELS,
} from "@/lib/validators/companies";
import { CompanyCard } from "./CompanyCard";
import { cn } from "@/lib/utils";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompaniesViewProps {
  companies: CompanyWithRelations[];
  total: number;
  allCount: number;
  clientsCount: number;
  prospectsCount: number;
  availableSectors: string[];
  search: string;
  tab: CompanyTab;
  sectors: string[];
  sort: CompanySortKey;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onSearch: (val: string) => void;
  onTabChange: (val: CompanyTab) => void;
  onSectorsChange: (val: string[]) => void;
  onSortChange: (val: CompanySortKey) => void;
  onPagination: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onReset: () => void;
}

export function CompaniesView({
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
  onSearch,
  onTabChange,
  onSectorsChange,
  onSortChange,
  onPagination,
  onPageSizeChange,
  onReset,
}: CompaniesViewProps) {
  const [searchInput, setSearchInput] = useState(search);
  const [sectorOpen, setSectorOpen] = useState(false);

  // Debounce search → URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) onSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, onSearch]);

  // Sync back on external reset
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const isFiltered = search.length > 0 || sectors.length > 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const tabs: { key: CompanyTab; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: allCount },
    { key: "clients", label: "Clients", count: clientsCount },
    { key: "prospects", label: "Prospects", count: prospectsCount },
  ];

  const toggleSector = (sector: string) => {
    onSectorsChange(
      sectors.includes(sector)
        ? sectors.filter((s) => s !== sector)
        : [...sectors, sector]
    );
  };

  return (
    <div className="space-y-5">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher une entreprise..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-8 h-9 bg-card border-border hover:border-border focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-50 rounded-xl text-sm placeholder:text-muted-foreground transition-all shadow-sm"
          />
          {searchInput.length > 0 && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">

          {/* Sector — searchable combobox */}
          {availableSectors.length > 0 && (
            <Popover open={sectorOpen} onOpenChange={setSectorOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border text-sm font-semibold transition-all shadow-sm",
                    sectors.length > 0
                      ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-400"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Secteur
                  {sectors.length > 0 && (
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                      {sectors.length}
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[220px] p-0 rounded-xl shadow-xl border-border"
                align="start"
              >
                <Command>
                  <CommandInput
                    placeholder="Rechercher un secteur..."
                    className="h-9 text-sm"
                  />
                  <CommandList>
                    <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                      Aucun secteur trouvé.
                    </CommandEmpty>
                    <CommandGroup>
                      {availableSectors.map((sector) => (
                        <CommandItem
                          key={sector}
                          value={sector}
                          onSelect={() => toggleSector(sector)}
                          className="cursor-pointer gap-2"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0",
                              sectors.includes(sector)
                                ? "opacity-100 text-indigo-600"
                                : "opacity-0"
                            )}
                          />
                          <span className="text-sm">{sector}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Sort */}
          <Select
            value={sort}
            onValueChange={(v) => onSortChange(v as CompanySortKey)}
          >
            <SelectTrigger className="h-9 w-auto gap-2 px-3.5 rounded-xl border-border bg-card shadow-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus:ring-indigo-50 focus:border-indigo-400 transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl border-border">
              {(Object.entries(SORT_LABELS) as [CompanySortKey, string][]).map(
                ([key, label]) => (
                  <SelectItem key={key} value={key} className="text-sm font-medium">
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          {/* Reset */}
          {isFiltered && (
            <>
              <div className="h-5 w-px bg-border" />
              <button
                onClick={() => {
                  setSearchInput("");
                  onReset();
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
              >
                <X className="h-3.5 w-3.5" />
                Réinitialiser
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Tabs + count ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl w-fit">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                tab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              <span
                className={cn(
                  "text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  tab === key
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted/70 text-muted-foreground/70"
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {!isLoading && total > 0 && (
          <p className="text-xs font-medium text-muted-foreground hidden sm:block">
            {total} résultat{total > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* ── Grid / loading / empty ───────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          <span className="text-sm font-medium">Chargement des entreprises...</span>
        </div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-card border border-border border-dashed rounded-3xl">
          <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center mb-4 border border-border">
            <Building2 className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            {isFiltered
              ? "Aucun résultat"
              : tab === "clients"
              ? "Aucun client pour l'instant"
              : tab === "prospects"
              ? "Aucun prospect pour l'instant"
              : "Aucune entreprise enregistrée"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isFiltered
              ? "Essayez d'ajuster votre recherche ou vos filtres."
              : tab === "clients"
              ? "Les entreprises associées à un projet apparaîtront ici."
              : tab === "prospects"
              ? "Les entreprises sans projet actif apparaîtront ici."
              : "Créez une opportunité ou un projet pour ajouter votre première entreprise."}
          </p>
          {isFiltered && (
            <button
              onClick={() => { setSearchInput(""); onReset(); }}
              className="mt-4 text-xs font-bold text-indigo-600 hover:underline"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────── */}
      {!isLoading && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground">
            Affichage de{" "}
            <span className="font-bold text-foreground">{companies.length}</span>{" "}
            sur{" "}
            <span className="font-bold text-foreground">{total}</span>{" "}
            entreprise{total > 1 ? "s" : ""}
          </p>

          <div className="flex items-center gap-6">
            {/* Page size */}
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:block">
                Par page
              </p>
              <Select
                value={`${pageSize}`}
                onValueChange={(v) => onPageSizeChange(parseInt(v, 10))}
              >
                <SelectTrigger className="h-8 w-[70px] rounded-lg border-border bg-card text-xs font-bold shadow-sm focus:ring-indigo-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top" className="rounded-xl shadow-xl border-border">
                  {[6, 12, 24, 48].map((size) => (
                    <SelectItem key={size} value={`${size}`} className="text-xs font-medium">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prev / page indicator / Next */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg border-border bg-card shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-all"
                onClick={() => onPagination(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex w-[80px] items-center justify-center text-xs font-bold text-foreground">
                Page {page} / {pageCount}
              </div>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg border-border bg-card shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-all"
                onClick={() => onPagination(page + 1)}
                disabled={page >= pageCount}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
