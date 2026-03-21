"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { CompanyWithRelations } from "@/lib/validators/companies";
import { cn } from "@/lib/utils";
import { Globe, Loader2, Mail, MapPin, Phone, Trash2 } from "lucide-react";
import { deleteCompany, updateCompanyBillingAddress } from "@/actions/companies.server";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CompanyCard({ company }: { company: CompanyWithRelations }) {
  const isClient = company.projects.length > 0;
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const [billingDialog, setBillingDialog] = useState<{ open: boolean; companyId: string; current: string | null }>({
    open: false, companyId: "", current: null
  });
  const [billingValue, setBillingValue] = useState("");
  const [isSavingBilling, setIsSavingBilling] = useState(false);

  const handleSaveBilling = async () => {
    setIsSavingBilling(true);
    const result = await updateCompanyBillingAddress(billingDialog.companyId, billingValue || null);
    setIsSavingBilling(false);
    if ("error" in result) { toast.error(result.error); return; }
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    setBillingDialog({ open: false, companyId: "", current: null });
    toast.success("Adresse de facturation mise à jour");
  };

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteCompany(company.id);
        queryClient.invalidateQueries({ queryKey: ["companies"] });
        toast.success(`"${company.name}" a été supprimée.`);
      } catch {
        toast.error("Impossible de supprimer l'entreprise.");
      }
    });
  }

  return (
    <div className="bg-card border border-border/75 rounded-3xl p-6 flex flex-col h-full transition-all duration-300 hover:border-border hover:shadow-xl hover:-translate-y-1">

      {/* Top row: avatar + name + badge */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-sm shrink-0 text-white" style={{ backgroundColor: 'var(--brand-secondary, #6366F1)' }}>
            {company.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate leading-tight">{company.name}</p>
            {company.business_sector ? (
              <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">{company.business_sector}</p>
            ) : (
              <p className="text-xs text-muted-foreground/50 italic mt-0.5">Secteur non défini</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
              isClient
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isClient ? "Client" : "Prospect"}
          </span>

          <button
            onClick={() => {
              setBillingValue(company.billing_address ?? "");
              setBillingDialog({ open: true, companyId: company.id, current: company.billing_address });
            }}
            className="h-7 w-7 flex items-center justify-center rounded-xl text-muted-foreground/50 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            title="Adresse de facturation"
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="h-7 w-7 flex items-center justify-center rounded-xl text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                disabled={isPending}
                title="Supprimer l'entreprise"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer {company.name} ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. L&apos;entreprise sera définitivement supprimée ainsi que toutes ses données associées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-2 flex-1">
        {company.email && (
          <a
            href={`mailto:${company.email}`}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground" />
            <span className="truncate">{company.email}</span>
          </a>
        )}
        {company.phone_number && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
            <span>{company.phone_number}</span>
          </div>
        )}
        {company.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Globe className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground" />
            <span className="truncate">{company.website.replace(/^https?:\/\//, "")}</span>
          </a>
        )}
        {!company.email && !company.phone_number && !company.website && (
          <p className="text-xs text-muted-foreground/50 italic">Aucune information de contact</p>
        )}
      </div>

      {/* Billing address dialog */}
      <Dialog open={billingDialog.open} onOpenChange={open => setBillingDialog(s => ({ ...s, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adresse de facturation</DialogTitle>
          </DialogHeader>
          <Textarea
            value={billingValue}
            onChange={e => setBillingValue(e.target.value)}
            placeholder="Adresse de facturation (si différente du siège social)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillingDialog(s => ({ ...s, open: false }))}>Annuler</Button>
            <Button onClick={handleSaveBilling} disabled={isSavingBilling}>
              {isSavingBilling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom: projects or opportunities */}
      <div className="mt-5 pt-4 border-t border-border/50">
        {isClient ? (
          <>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Projets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {company.projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/app/projects/${p.slug}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                >
                  {p.name}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Opportunités
            </p>
            {company.opportunities.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {company.opportunities.slice(0, 2).map((o) => (
                  <Link
                    key={o.id}
                    href={`/app/opportunities/${o.slug}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
                  >
                    {o.name}
                  </Link>
                ))}
                {company.opportunities.length > 2 && (
                  <span className="text-xs text-muted-foreground font-semibold self-center">
                    +{company.opportunities.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/50 italic">Aucune opportunité</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
