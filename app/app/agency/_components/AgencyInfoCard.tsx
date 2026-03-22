"use client";

import { updateAgencyProfile } from "@/actions/agency.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Agency } from "@/lib/validators/agency";
import {
  Building2,
  Check,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

export function AgencyInfoCard({ agency }: { agency: Agency }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateAgencyProfile, null);

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message ?? "Informations mises à jour");
      setIsEditing(false);
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const fields = [
    { icon: Globe, label: "Site internet", value: agency.website, isLink: true },
    { icon: Mail, label: "Email de contact", value: agency.email, isLink: false },
    { icon: Phone, label: "Téléphone", value: agency.phone, isLink: false },
    { icon: MapPin, label: "Siège social", value: agency.address, isLink: false },
  ];

  return (
    <div className="group overflow-hidden rounded-2xl border bg-card transition-all duration-300">
      <div className="flex items-center justify-between border-b border-border/80 px-7 py-5 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card p-2 text-foreground/70 border border-border/50 shadow-sm">
            <Building2 className="h-4 w-4" />
          </div>
          <h2 className="card-title">Identité & Coordonnées</h2>
        </div>
        {isEditing ? (
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Annuler
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Éditer
          </button>
        )}
      </div>

      {isEditing ? (
        <form action={formAction} className="space-y-5 p-7">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Nom commercial
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={agency.name}
                disabled={isPending}
                className="h-10 text-sm border-border bg-muted/50 focus:bg-card focus:border-foreground focus:ring-foreground transition-all shadow-sm"
              />
              {state?.errors?.name && (
                <p className="text-xs text-red-500 font-medium">{state.errors.name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Site internet
              </Label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://"
                defaultValue={agency.website ?? ""}
                disabled={isPending}
                className="h-10 text-sm border-border bg-muted/50 focus:bg-card focus:border-foreground focus:ring-foreground transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Email de contact
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={agency.email ?? ""}
                disabled={isPending}
                className="h-10 text-sm border-border bg-muted/50 focus:bg-card focus:border-foreground focus:ring-foreground transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Téléphone
              </Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={agency.phone ?? ""}
                disabled={isPending}
                className="h-10 text-sm border-border bg-muted/50 focus:bg-card focus:border-foreground focus:ring-foreground transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Siège social
              </Label>
              <Input
                id="address"
                name="address"
                defaultValue={agency.address ?? ""}
                disabled={isPending}
                className="h-10 text-sm border-border bg-muted/50 focus:bg-card focus:border-foreground focus:ring-foreground transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-5 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="transition-all"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 gap-6 p-7 sm:grid-cols-2">
          {fields.map(({ icon: Icon, label, value, isLink }) => (
            <div key={label} className="flex items-start gap-3.5">
              <div className="shrink-0 rounded-lg bg-muted border border-border p-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
                {value ? (
                  isLink ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link flex items-center gap-1.5 truncate text-sm font-medium text-foreground hover:text-blue-600 transition-colors"
                    >
                      {value} <ExternalLink className="h-3 w-3 shrink-0 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                    </a>
                  ) : (
                    <p className="truncate text-sm font-medium text-foreground">{value}</p>
                  )
                ) : (
                  <p className="text-sm italic text-muted-foreground">Non renseigné</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
