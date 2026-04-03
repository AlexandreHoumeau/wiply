"use client";

import { enrichOpportunityImportRowAction } from "@/actions/ai.server";
import { importOpportunitiesFromCsv } from "@/actions/opportunity.server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildOpportunityImportDuplicateKey,
  getOpportunityImportDuplicateKeys,
  normalizeOpportunityCsvRows,
  type CsvImportPreviewRow,
  validateOpportunityImportRow,
} from "@/lib/opportunities/csv";
import { cn } from "@/lib/utils";
import {
  ALL_CONTACT_VIA,
  ALL_STATUSES,
  mapContactViaLabel,
  mapOpportunityStatusLabel,
  OpportunityFormValues,
} from "@/lib/validators/oppotunities";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, EyeOff, FileSpreadsheet, Loader2, Sparkles, Upload } from "lucide-react";
import { ChangeEvent, memo, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

interface OpportunityCsvImportDialogProps {
  agencyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

type ReviewMode = "all" | "import" | "review" | "ignored";
type Decision = "import" | "skip";
type MissingFieldKey = "all" | "company_name" | "company_email" | "company_phone" | "name";

type EditableRow = CsvImportPreviewRow & {
  decision: Decision;
};

const PAGE_SIZE = 24;
const QUICK_COLUMNS = ["company", "email", "phone", "website", "name", "status", "contact"];

const MISSING_FIELD_LABELS: Record<Exclude<MissingFieldKey, "all">, string> = {
  company_name: "Entreprise",
  company_email: "Email",
  company_phone: "Téléphone",
  name: "Titre",
};

function getOptionalValue(value: string | undefined): string {
  return value ?? "";
}

function isFieldMissing(values: OpportunityFormValues, field: Exclude<MissingFieldKey, "all">): boolean {
  const companyEmail = getOptionalValue(values.company_email);
  const companyPhone = getOptionalValue(values.company_phone);

  if (field === "company_name") return !values.company_name.trim();
  if (field === "company_email") return !companyEmail.trim();
  if (field === "company_phone") return !companyPhone.trim();
  return !values.name.trim();
}

function getIssueTone(hasIssues: boolean, isSkipped: boolean): string {
  if (hasIssues) return "bg-amber-50/60";
  if (isSkipped) return "bg-slate-50/70";
  return "";
}

type InlineEditableRowProps = {
  row: EditableRow;
  hasDuplicate: boolean;
  isAiPending: boolean;
  onAiFill: (row: EditableRow) => void;
  onSetDecision: (rowNumber: number, decision: Decision) => void;
  onUpdateRow: (rowNumber: number, field: keyof OpportunityFormValues, value: string) => void;
};

const InlineEditableRow = memo(function InlineEditableRow({
  row,
  hasDuplicate,
  isAiPending,
  onAiFill,
  onSetDecision,
  onUpdateRow,
}: InlineEditableRowProps) {
  const hasIssues = row.errors.length > 0 || hasDuplicate;
  const companyEmail = getOptionalValue(row.values.company_email);
  const companyPhone = getOptionalValue(row.values.company_phone);
  const companyWebsite = getOptionalValue(row.values.company_website);

  return (
    <TableRow className={getIssueTone(hasIssues, row.decision === "skip")}>
      <TableCell className="font-medium">{row.rowNumber}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={row.decision === "import" ? "default" : "outline"}
            disabled={row.errors.length > 0 || hasDuplicate}
            onClick={() => onSetDecision(row.rowNumber, "import")}
          >
            Importer
          </Button>
          <Button
            type="button"
            size="sm"
            variant={row.decision === "skip" ? "secondary" : "outline"}
            onClick={() => onSetDecision(row.rowNumber, "skip")}
          >
            Ignorer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isAiPending || (!companyWebsite.trim() && !companyEmail.trim())}
            onClick={() => onAiFill(row)}
          >
            {isAiPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
      </TableCell>
      <TableCell className="min-w-[180px]">
        <Input
          value={row.values.company_name}
          onChange={(event) => onUpdateRow(row.rowNumber, "company_name", event.target.value)}
          placeholder="Entreprise"
          className="bg-white"
        />
      </TableCell>
      <TableCell className="min-w-[220px]">
        <Input
          value={row.values.name}
          onChange={(event) => onUpdateRow(row.rowNumber, "name", event.target.value)}
          placeholder="Titre"
          className="bg-white"
        />
      </TableCell>
      <TableCell className="min-w-[200px]">
        <Input
          value={companyEmail}
          onChange={(event) => onUpdateRow(row.rowNumber, "company_email", event.target.value)}
          placeholder="contact@..."
          className="bg-white"
        />
      </TableCell>
      <TableCell className="min-w-[160px]">
        <Input
          value={companyPhone}
          onChange={(event) => onUpdateRow(row.rowNumber, "company_phone", event.target.value)}
          placeholder="06..."
          className="bg-white"
        />
      </TableCell>
      <TableCell className="min-w-[200px]">
        <Input
          value={companyWebsite}
          onChange={(event) => onUpdateRow(row.rowNumber, "company_website", event.target.value)}
          placeholder="https://..."
          className="bg-white"
        />
      </TableCell>
      <TableCell className="min-w-[150px]">
        <Select value={row.values.contact_via} onValueChange={(value) => onUpdateRow(row.rowNumber, "contact_via", value)}>
          <SelectTrigger className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_CONTACT_VIA.map((value) => (
              <SelectItem key={value} value={value}>
                {mapContactViaLabel[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-[150px]">
        <Select value={row.values.status} onValueChange={(value) => onUpdateRow(row.rowNumber, "status", value)}>
          <SelectTrigger className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {mapOpportunityStatusLabel[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-[220px]">
        <div className="flex flex-wrap gap-1">
          {row.decision === "skip" ? <Badge variant="secondary">Ignorée</Badge> : null}
          {hasDuplicate ? <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Doublon</Badge> : null}
          {row.errors.length > 0 ? (
            <>
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">À corriger</Badge>
              <p className="w-full text-xs text-slate-500">{row.errors[0]}</p>
            </>
          ) : row.missingFields.length > 0 ? (
            row.missingFields.map((field) => (
              <Badge key={field} variant="outline" className="border-amber-300 text-amber-700">
                {field}
              </Badge>
            ))
          ) : !hasDuplicate ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Prête</Badge>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
});

export function OpportunityCsvImportDialog({
  agencyId,
  open,
  onOpenChange,
  onImported,
}: OpportunityCsvImportDialogProps) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode>("all");
  const [page, setPage] = useState(1);
  const [missingFilter, setMissingFilter] = useState<MissingFieldKey>("all");
  const [aiPendingRows, setAiPendingRows] = useState<number[]>([]);

  function resetState() {
    setFileName("");
    setRows([]);
    setParseError(null);
    setReviewMode("all");
    setPage(1);
    setMissingFilter("all");
    setAiPendingRows([]);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  }

  const duplicateKeys = useMemo(
    () => getOpportunityImportDuplicateKeys(rows.filter((row) => row.decision === "import").map((row) => row.values)),
    [rows]
  );

  const importMutation = useMutation({
    mutationFn: async () => {
      const rowsToImport = rows.filter((row) => row.decision === "import").map((row) => row.values);
      const duplicates = getOpportunityImportDuplicateKeys(rowsToImport);

      if (rowsToImport.length === 0) {
        throw new Error("Aucune ligne à importer");
      }

      if (duplicates.size > 0) {
        throw new Error("Des doublons restent dans les lignes à importer");
      }

      return importOpportunitiesFromCsv(rowsToImport);
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`${result.importedCount} opportunité(s) importée(s)`);
      if (result.skippedCount > 0) {
        toast.message(`${result.skippedCount} ligne(s) ignorée(s)`);
      }
      onImported();
      handleOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Import impossible");
    },
  });

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setParseError(null);
    setRows([]);

    if (!file) {
      setFileName("");
      return;
    }

    try {
      const text = await file.text();
      const preview = normalizeOpportunityCsvRows(text);

      if (preview.headers.length === 0) {
        setParseError("Le fichier est vide ou illisible.");
        return;
      }

      setFileName(file.name);
      setRows(
        preview.rows.map((row) => ({
          ...row,
          decision: row.errors.length === 0 ? "import" : "skip",
        }))
      );
      setReviewMode("all");
      setPage(1);
      setMissingFilter("all");
    } catch (error) {
      console.error(error);
      setParseError("Impossible de lire ce fichier CSV.");
    }
  }

  const updateRow = useCallback((rowNumber: number, field: keyof OpportunityFormValues, value: string) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.rowNumber !== rowNumber) return row;

        const validation = validateOpportunityImportRow({
          ...row.values,
          [field]: value,
        });

        return {
          ...row,
          values: validation.values,
          errors: validation.errors,
          missingFields: validation.missingFields,
          decision: validation.errors.length === 0 ? row.decision : "skip",
        };
      })
    );
  }, []);

  const setRowDecision = useCallback((rowNumber: number, decision: Decision) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.rowNumber !== rowNumber) return row;
        if (decision === "import" && row.errors.length > 0) return row;
        return { ...row, decision };
      })
    );
  }, []);

  async function runAiForRow(row: EditableRow) {
    if (!agencyId) {
      toast.error("Agence introuvable pour l'enrichissement IA");
      return;
    }

    setAiPendingRows((current) => (current.includes(row.rowNumber) ? current : [...current, row.rowNumber]));
    try {
      const result = await enrichOpportunityImportRowAction({
        agencyId,
        website: getOptionalValue(row.values.company_website),
        email: getOptionalValue(row.values.company_email),
        companyName: row.values.company_name,
        title: row.values.name,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setRows((currentRows) =>
        currentRows.map((currentRow) => {
          if (currentRow.rowNumber !== row.rowNumber) {
            return currentRow;
          }

          const validation = validateOpportunityImportRow({
            ...currentRow.values,
            company_name: currentRow.values.company_name || result.suggestions.company_name || "",
            name: currentRow.values.name || result.suggestions.name || "",
            description: currentRow.values.description || result.suggestions.description || "",
          });

          return {
            ...currentRow,
            values: validation.values,
            errors: validation.errors,
            missingFields: validation.missingFields,
            decision: validation.errors.length === 0 ? currentRow.decision : "skip",
          };
        })
      );

      toast.success("Suggestions IA appliquées");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de récupérer des suggestions IA");
    } finally {
      setAiPendingRows((current) => current.filter((item) => item !== row.rowNumber));
    }
  }

  async function runAiForVisibleRows() {
    const candidates = visibleRows.filter(
      (row) =>
        (row.missingFields.includes("Nom de l'entreprise") || row.missingFields.includes("Titre de l'opportunité")) &&
        (!!getOptionalValue(row.values.company_website).trim() || !!getOptionalValue(row.values.company_email).trim())
    );

    if (candidates.length === 0) {
      toast.message("Aucune ligne visible ne nécessite un enrichissement IA");
      return;
    }

    for (const row of candidates) {
      await runAiForRow(row);
    }
  }

  function ignoreRowsMissingField(field: Exclude<MissingFieldKey, "all">) {
    setRows((currentRows) =>
      currentRows.map((row) => (isFieldMissing(row.values, field) ? { ...row, decision: "skip" } : row))
    );
    setReviewMode("ignored");
  }

  function ignoreInvalidRows() {
    setRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        decision: row.errors.length > 0 ? "skip" : row.decision,
      }))
    );
    setReviewMode("ignored");
  }

  const stats = useMemo(() => {
    const importing = rows.filter((row) => row.decision === "import").length;
    const ignored = rows.filter((row) => row.decision === "skip").length;
    const review = rows.filter((row) => row.errors.length > 0 || (row.decision === "import" && duplicateKeys.has(buildOpportunityImportDuplicateKey(row.values) ?? ""))).length;
    return { importing, ignored, review };
  }, [duplicateKeys, rows]);

  const countsByMissingField = useMemo(
    () => ({
      company_name: rows.filter((row) => isFieldMissing(row.values, "company_name")).length,
      company_email: rows.filter((row) => isFieldMissing(row.values, "company_email")).length,
      company_phone: rows.filter((row) => isFieldMissing(row.values, "company_phone")).length,
      name: rows.filter((row) => isFieldMissing(row.values, "name")).length,
    }),
    [rows]
  );

  const filteredRows = rows.filter((row) => {
    const duplicateKey = buildOpportunityImportDuplicateKey(row.values);
    const hasDuplicate = row.decision === "import" && !!duplicateKey && duplicateKeys.has(duplicateKey);
    const needsReview = row.errors.length > 0 || hasDuplicate;

    if (reviewMode === "import" && row.decision !== "import") return false;
    if (reviewMode === "ignored" && row.decision !== "skip") return false;
    if (reviewMode === "review" && !needsReview) return false;
    if (missingFilter !== "all" && !isFieldMissing(row.values, missingFilter)) return false;

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const compactMode = rows.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("overflow-hidden p-0 border-0 shadow-2xl flex flex-col", compactMode ? "max-w-2xl" : "h-[92vh] max-w-[97vw] sm:max-w-[97vw]")}>
        <DialogHeader className="border-b bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-3 text-white shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-cyan-300" />
            Importer des opportunités
          </DialogTitle>
          <DialogDescription className="text-slate-300">Nettoyez le CSV puis importez.</DialogDescription>
        </DialogHeader>

        {compactMode ? (
          <div className="space-y-4 px-6 py-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-900">Ajouter un fichier CSV</p>
              <p className="mt-1 text-sm text-slate-500">
                Colonnes utiles: {QUICK_COLUMNS.join(", ")}.
              </p>
              <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="mt-4" />
            </div>

            {parseError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fichier invalide</AlertTitle>
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : (
          <>
            <div className="border-b bg-white px-6 py-2 shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-slate-900 text-white hover:bg-slate-900">{fileName}</Badge>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{stats.importing} à importer</Badge>
                <div className="ml-auto flex items-center gap-2">
                  <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="h-8 w-[220px]" />
                </div>
              </div>
            </div>

            <div className="border-b bg-slate-50/80 px-6 py-2 shrink-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant={reviewMode === "all" ? "default" : "outline"} onClick={() => { setReviewMode("all"); setPage(1); }}>
                  Toutes ({rows.length})
                </Button>
                <Button type="button" size="sm" variant={reviewMode === "import" ? "default" : "outline"} onClick={() => { setReviewMode("import"); setPage(1); }}>
                  À importer ({stats.importing})
                </Button>
                <Button type="button" size="sm" variant={reviewMode === "review" ? "default" : "outline"} onClick={() => { setReviewMode("review"); setPage(1); }}>
                  À revoir ({stats.review})
                </Button>
                <Button type="button" size="sm" variant={reviewMode === "ignored" ? "default" : "outline"} onClick={() => { setReviewMode("ignored"); setPage(1); }}>
                  Ignorées ({stats.ignored})
                </Button>

                <div className="ml-auto">
                  <Select value={missingFilter} onValueChange={(value) => { setMissingFilter(value as MissingFieldKey); setPage(1); }}>
                    <SelectTrigger className="w-[240px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les lignes</SelectItem>
                      {(Object.keys(MISSING_FIELD_LABELS) as Array<Exclude<MissingFieldKey, "all">>).map((field) => (
                        <SelectItem key={field} value={field}>
                          Manque {MISSING_FIELD_LABELS[field]} ({countsByMissingField[field]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(MISSING_FIELD_LABELS) as Array<Exclude<MissingFieldKey, "all">>).map((field) => (
                  <Button key={field} type="button" size="sm" variant="outline" onClick={() => ignoreRowsMissingField(field)}>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Si manque {MISSING_FIELD_LABELS[field]}
                  </Button>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={ignoreInvalidRows}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Les invalides
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={runAiForVisibleRows} disabled={aiPendingRows.length > 0}>
                  {aiPendingRows.length > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  IA sur les lignes visibles
                </Button>
              </div>
            </div>

            {duplicateKeys.size > 0 ? (
              <div className="border-b px-6 py-2 shrink-0">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Doublons détectés</AlertTitle>
                  <AlertDescription>
                    Des lignes marquées à importer sont en doublon. Passez-les en `Ignorer` ou corrigez leurs valeurs avant l'import.
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}

            <div className="flex items-center justify-between border-b px-6 py-2 text-sm text-slate-500 shrink-0">
              <div>{filteredRows.length} ligne(s) affichée(s)</div>
              <div className="flex items-center gap-2">
                <span>{currentPage} / {totalPages}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                  Préc.
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                  Suiv.
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-white px-3 pb-3">
              <Table className="min-w-[1500px]">
                <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
                  <TableRow className="border-b-slate-200">
                    <TableHead>Ligne</TableHead>
                    <TableHead>Décision</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Site web</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>État</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row) => {
                    const duplicateKey = buildOpportunityImportDuplicateKey(row.values);
                    const hasDuplicate = row.decision === "import" && !!duplicateKey && duplicateKeys.has(duplicateKey);

                    return (
                    <InlineEditableRow
                      key={row.rowNumber}
                      row={row}
                      hasDuplicate={hasDuplicate}
                      isAiPending={aiPendingRows.includes(row.rowNumber)}
                      onAiFill={runAiForRow}
                      onSetDecision={setRowDecision}
                      onUpdateRow={updateRow}
                    />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter className="border-t bg-white px-6 py-3 shrink-0">
          <div className="mr-auto text-sm text-slate-500">{stats.importing} ligne(s) prêtes à être importées</div>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => importMutation.mutate()} disabled={stats.importing === 0 || duplicateKeys.size > 0 || importMutation.isPending}>
            {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
