"use client";

import { createTrackingLink, getTrackingLinks, toggleTrackingLink } from "@/actions/tracking.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAgency } from "@/providers/agency-provider";
import { useUpgradeDialog } from "@/providers/UpgradeDialogProvider";
import {
    Activity,
    Check,
    Copy,
    Link2,
    Loader2,
    Plus,
    ShieldAlert,
    MousePointerClick
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TrackingLinkItem = {
    id: string;
    short_code: string;
    campaign_name: string;
    is_active: boolean;
};

export function TrackingLinksManager({ opportunityId, agencyId }: { opportunityId: string, agencyId: string }) {
    const { agency } = useAgency();
    const { openUpgradeDialog } = useUpgradeDialog();
    const [links, setLinks] = useState<TrackingLinkItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showInput, setShowInput] = useState(false);
    const [campaignName, setCampaignName] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const loadLinks = async () => {
        setIsLoading(true);
        const result = await getTrackingLinks(opportunityId);
        if (result.success) setLinks((result.data ?? []) as TrackingLinkItem[]);
        setIsLoading(false);
    };

    useEffect(() => {
        let cancelled = false;

        const fetchLinks = async () => {
            setIsLoading(true);
            const result = await getTrackingLinks(opportunityId);
            if (!cancelled && result.success) {
                setLinks((result.data ?? []) as TrackingLinkItem[]);
            }
            if (!cancelled) {
                setIsLoading(false);
            }
        };

        void fetchLinks();

        return () => {
            cancelled = true;
        };
    }, [opportunityId]);

    const handleToggleStatus = async (linkId: string, currentStatus: boolean) => {
        setTogglingId(linkId);
        const result = await toggleTrackingLink(linkId, !currentStatus);

        if (result.success) {
            setLinks(prev => prev.map(l => l.id === linkId ? { ...l, is_active: !currentStatus } : l));
            toast.success(!currentStatus ? "Lien activé" : "Lien désactivé");
        } else {
            toast.error("Erreur lors du changement de statut");
        }
        setTogglingId(null);
    };

    const handleCreateLink = async () => {
        if (!campaignName.trim()) return toast.error("Le nom de la campagne est requis");
        setIsCreating(true);
        const result = await createTrackingLink({
            opportunityId,
            agencyId,
            originalUrl: agency?.website || "",
            campaignName: campaignName,
        });

        if (result.success) {
            toast.success("Lien généré avec succès");
            setCampaignName("");
            setShowInput(false);
            await loadLinks();
        } else {
            const isLimitError = result.error?.includes('limite') || result.error?.includes('plan FREE')
            if (isLimitError && agencyId) {
                openUpgradeDialog(result.error ?? "Limite atteinte sur le plan FREE.", agencyId)
            } else {
                toast.error(result.error ?? "Erreur lors de la création du lien")
            }
        }
        setIsCreating(false);
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Lien copié dans le presse-papier");
        setTimeout(() => setCopiedId(null), 2000);
    };

    // --- Empty State: No Website ---
    if (!agency?.website) {
        return (
            <div className="w-full max-w-3xl mx-auto py-6 animate-in fade-in duration-500">
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-3xl border border-dashed border-border bg-muted/50">
                    <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-sm border border-border mb-4">
                        <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1">Configuration requise</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Veuillez configurer le site web de votre agence dans les paramètres avant de pouvoir générer des liens de tracking.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto py-6 space-y-6 animate-in fade-in duration-500">

            {/* --- HEADER --- */}
            <div className="flex items-center justify-between pb-4 border-b border-border/80">
                <div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">Liens de tracking</h3>
                    <p className="text-sm text-muted-foreground">Générez des liens uniques pour suivre l'engagement</p>
                </div>
                {!showInput && (
                    <Button
                        onClick={() => setShowInput(true)}
                        className="bg-foreground hover:bg-foreground/90 text-background shadow-sm transition-all duration-300 rounded-full h-9 px-4 text-sm font-medium"
                    >
                        <Plus className="h-4 w-4 mr-1.5" /> Créer un lien
                    </Button>
                )}
            </div>

            {/* --- ZONE DE CRÉATION (Sleek Inline Input) --- */}
            {showInput && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="flex items-center bg-card border border-border/80 rounded-2xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-foreground/5 focus-within:border-border transition-all">
                        <div className="pl-3 pr-2 text-muted-foreground">
                            <Link2 className="h-4 w-4" />
                        </div>
                        <Input
                            autoFocus
                            placeholder="Nom de la campagne (ex: Relance J+3, Email Mars...)"
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent h-9 text-sm px-0 placeholder:text-muted-foreground"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateLink()}
                            disabled={isCreating}
                        />
                        <div className="flex items-center gap-1.5 pr-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setShowInput(false); setCampaignName(""); }}
                                className="h-8 px-2 text-muted-foreground hover:text-foreground rounded-xl"
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleCreateLink}
                                disabled={isCreating || !campaignName.trim()}
                                className="h-8 bg-foreground hover:bg-foreground/90 text-background rounded-xl px-4 text-xs font-medium shadow-sm"
                            >
                                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                                Générer
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LISTE DES LIENS --- */}
            <div className="space-y-3">
                {links.map((link) => {
                    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/t/${link.short_code}`;
                    const isActive = link.is_active;

                    return (
                        <div
                            key={link.id}
                            className={cn(
                                "group relative flex items-center bg-card border rounded-2xl p-4 transition-all duration-300",
                                isActive
                                    ? "border-border/70 shadow-sm hover:shadow-md hover:border-border"
                                    : "border-border/40 bg-muted/50 opacity-80"
                            )}
                        >
                            {/* Grid Layout for perfect alignment across all rows */}
                            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_2fr_auto] gap-4 w-full items-center">

                                {/* 1. Campaign Info */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                                        isActive
                                            ? "bg-muted border-border text-muted-foreground"
                                            : "bg-muted/50 border-border/50 text-muted-foreground/50"
                                    )}>
                                        <MousePointerClick className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className={cn(
                                            "font-semibold text-sm truncate tracking-tight",
                                            isActive ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            {link.campaign_name}
                                        </h4>
                                        <div className="flex items-center mt-0.5">
                                            {isActive ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="relative flex h-1.5 w-1.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                    </span>
                                                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Actif</span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-medium text-muted-foreground">Désactivé</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 2. URL Field & Copy Button */}
                                <div className="flex items-center min-w-0 pr-4">
                                    <div className="flex flex-1 items-center justify-between bg-muted/80 border border-border rounded-xl pl-3 pr-1 py-1 group-hover:bg-muted transition-colors min-w-0">
                                        <span className={cn(
                                            "text-xs font-mono truncate mr-2",
                                            isActive ? "text-muted-foreground" : "text-muted-foreground/50"
                                        )}>
                                            {url}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={!isActive}
                                            className={cn(
                                                "h-7 w-7 rounded-lg shrink-0 transition-all",
                                                copiedId === link.id
                                                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 hover:text-emerald-700"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-card hover:shadow-sm hover:border hover:border-border"
                                            )}
                                            onClick={() => copyToClipboard(url, link.id)}
                                        >
                                            {copiedId === link.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* 3. Controls (Switch) */}
                                <div className="flex items-center justify-end gap-3 shrink-0">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest hidden md:block">
                                        Statut
                                    </span>
                                    <div className="flex items-center h-8">
                                        {togglingId === link.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                                        ) : null}
                                        <Switch
                                            checked={isActive}
                                            onCheckedChange={() => handleToggleStatus(link.id, isActive)}
                                            disabled={togglingId === link.id}
                                            className="data-[state=checked]:bg-foreground"
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>
                    );
                })}

                {/* --- Empty State: No Links --- */}
                {!isLoading && links.length === 0 && !showInput && (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-3xl border border-dashed border-border bg-muted/50">
                        <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-sm border border-border mb-4">
                            <Activity className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground mb-1">Aucun lien actif</h3>
                        <p className="text-sm text-muted-foreground max-w-[250px] mb-5">
                            Créez votre premier lien de tracking pour analyser l'engagement de cette opportunité.
                        </p>
                        <Button
                            onClick={() => setShowInput(true)}
                            variant="outline"
                            className="hover:bg-muted border-border text-foreground rounded-full h-9 px-5 text-sm font-medium shadow-sm"
                        >
                            <Plus className="h-4 w-4 mr-1.5" /> Créer un lien
                        </Button>
                    </div>
                )}
            </div>

            {/* --- WARNING ALERT --- */}
            {!isLoading && links.length > 0 && !links.some(l => l.is_active) && (
                <div className="bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-bottom-2 mt-6">
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 tracking-tight">
                            Tous les liens sont désactivés
                        </p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-500/80 font-medium mt-0.5 leading-relaxed">
                            Vos prospects cliquant sur ces URLs seront redirigés vers une page d'erreur. Réactivez-les pour rétablir la redirection.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
