"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContactVia, OpportunityStatus } from "@/lib/validators/oppotunities";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DataTableToolbar } from "./DataTableToolbar";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  statuses: OpportunityStatus[];
  contactVia: ContactVia[];
  starredOnly: boolean;
  isLoading: boolean;
  onSearch: (search: string) => void;
  onFilterChange: (key: string, values: string[]) => void;
  onToggleStarred: () => void;
  onPagination: (page: number) => void;
  onReset: () => void;
}

export function DataTable<TData, TValue>({
  columns, data, total, page, pageSize, search, statuses, contactVia,
  starredOnly, isLoading, onSearch, onFilterChange, onToggleStarred, onPagination, onReset,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [searchInput, setSearchInput] = React.useState(search);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) onSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, onSearch]);

  React.useEffect(() => { setSearchInput(search); }, [search]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-slate-100">
        <DataTableToolbar
          table={table}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          statuses={statuses}
          contactVia={contactVia}
          starredOnly={starredOnly}
          onFilterChange={onFilterChange}
          onToggleStarred={onToggleStarred}
          onReset={onReset}
        />
      </div>

      {/* TABLE CONTAINER */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan} className="h-11 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-[400px] text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    <span className="text-sm font-medium">Chargement de vos opportunités...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "border-b border-slate-50 last:border-0 transition-colors group",
                    (row.original as any).is_favorite
                      ? "border-l-4 border-l-amber-400 bg-amber-50/30 hover:bg-amber-50/50"
                      : "hover:bg-slate-50/80"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 px-4 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-[400px] text-center text-slate-500 text-sm">
                  Aucune opportunité trouvée. Ajustez vos filtres ou créez-en une nouvelle.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
        <div className="text-xs font-medium text-slate-500">
          Affichage de <span className="text-slate-900 font-bold">{data.length}</span> sur <span className="text-slate-900 font-bold">{total}</span> opportunités
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Lignes par page</p>
            <Select value={`${pageSize}`} onValueChange={(value) => onFilterChange("pageSize", [value])}>
              <SelectTrigger className="h-8 w-[70px] rounded-lg border-slate-200 bg-white text-xs font-bold focus:ring-blue-500 shadow-sm">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top" className="rounded-xl shadow-xl border-slate-100">
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`} className="text-xs font-medium">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-1">
            <Button variant="outline" className="h-8 w-8 p-0 rounded-lg border-slate-200 bg-white shadow-sm hover:text-blue-600 hover:border-blue-200 transition-all" onClick={() => onPagination(page - 1)} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex w-[80px] items-center justify-center text-xs font-bold text-slate-700">
              Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
            </div>
            <Button variant="outline" className="h-8 w-8 p-0 rounded-lg border-slate-200 bg-white shadow-sm hover:text-blue-600 hover:border-blue-200 transition-all" onClick={() => onPagination(page + 1)} disabled={page * pageSize >= total}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}