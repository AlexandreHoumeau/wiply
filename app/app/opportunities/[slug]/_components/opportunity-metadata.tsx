"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  mapContactViaLabel,
  mapOpportunityStatusLabel,
  OpportunityStatus,
  OpportunityWithCompany,
} from "@/lib/validators/oppotunities";
import { CONTACT_COLORS, STATUS_COLORS } from "@/utils/general";
import { toast } from "sonner";
import { updateOpportunityStatus } from "@/actions/opportunity.client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Building2,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Tag,
} from "lucide-react";

const STATUS_OPTIONS: OpportunityStatus[] = [
  "inbound",
  "to_do",
  "first_contact",
  "second_contact",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

export default function OpportunityMetadata(opportunity: OpportunityWithCompany) {
  const [emailCopied, setEmailCopied] = useState(false);
  const [status, setStatus] = useState(opportunity.status as OpportunityStatus);
  const [isUpdatingStatus, startStatusUpdate] = useTransition();
  const router = useRouter();

  const handleCopyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email);
    setEmailCopied(true);
    toast.success("Email copié");
    setTimeout(() => setEmailCopied(false), 1500);
  };

  const handleStatusChange = (nextStatus: string) => {
    if (nextStatus === status) return;

    const previousStatus = status;
    const castStatus = nextStatus as OpportunityStatus;
    setStatus(castStatus);

    startStatusUpdate(async () => {
      try {
        await updateOpportunityStatus(opportunity.id, castStatus);
        toast.success(`Statut mis à jour : ${mapOpportunityStatusLabel[castStatus]}`);
        router.refresh();
      } catch {
        setStatus(previousStatus);
        toast.error("Impossible de mettre à jour le statut");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Company Name */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          <span>Entreprise</span>
        </div>
        <p className="text-sm font-semibold">{opportunity.company?.name}</p>
      </div>

      {/* Industry */}
      {opportunity.company?.business_sector && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Secteur</span>
          </div>
          <p className="text-sm">{opportunity.company.business_sector}</p>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-3">
        {opportunity.company?.email && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 break-all text-sm text-foreground/85">
                {opportunity.company.email}
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleCopyEmail(opportunity.company!.email!)}
                aria-label="Copier l'adresse email"
              >
                {emailCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}

        {opportunity.company?.phone_number && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>Téléphone</span>
            </div>
            <a
              href={`tel:${opportunity.company.phone_number}`}
              className="text-sm text-primary hover:underline"
            >
              {opportunity.company.phone_number}
            </a>
          </div>
        )
        }

        {
          opportunity.company?.website && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                <span>Site web</span>
              </div>
              <a
                href={opportunity.company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Visiter
                <ExternalLink className="h-3 w-3" />
              </a>
            </div >
          )
        }

        {
          opportunity.company?.address && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>Adresse</span>
              </div>
              <p className="text-sm">{opportunity.company.address}</p>
            </div>
          )
        }
      </div >

      {/* Status & Contact Method */}
      < div className="space-y-3 pt-2" >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            <span>Statut</span>
          </div>
          <div className="space-y-2">
            <Select value={status} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
              <SelectTrigger className="h-9 rounded-xl text-left">
                <SelectValue placeholder="Choisir un statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {mapOpportunityStatusLabel[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge className={STATUS_COLORS[status]}>
              {mapOpportunityStatusLabel[status]}
            </Badge>
            {isUpdatingStatus && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Mise à jour du statut…
              </div>
            )}
          </div>
        </div>

        {
          opportunity.contact_via && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>Contact via</span>
              </div>
              <Badge variant="outline" className={CONTACT_COLORS[opportunity.contact_via]}>
                {mapContactViaLabel[opportunity.contact_via]}
              </Badge>
            </div>
          )
        }
      </div >
    </div >
  );
}
