"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectFromOpportunity } from "@/actions/project.server";
import type { OpportunityWithCompany } from "@/lib/validators/oppotunities";
import { toast } from "sonner";
import { Loader2, Rocket, Figma, Github, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";

export function ConvertProjectDialog({
    opportunity,
    open,
    onOpenChange
}: {
    opportunity: OpportunityWithCompany | null,
    open: boolean,
    onOpenChange: (v: boolean) => void
}) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    
    // Champs pré-remplis
    const [name, setName] = useState(opportunity?.name || "");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [figmaUrl, setFigmaUrl] = useState("");
    const [githubUrl, setGithubUrl] = useState("");

    // Met à jour le nom si l'opportunité change
    useState(() => {
        if (opportunity) setName(opportunity.name);
    });

    const handleConvert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!opportunity) return;
        
        setIsLoading(true);
        const result = await createProjectFromOpportunity({ ...opportunity, agency_id: opportunity.agency_id ?? '' }, {
            name, start_date: startDate, figma_url: figmaUrl, github_url: githubUrl
        });
        setIsLoading(false);

        if (result.success) {
            toast.success("Projet créé avec succès ! 🚀");
            onOpenChange(false);
            // Redirection magique vers le workspace du nouveau projet
            router.push(`/app/projects/${result.data.slug}`);
        } else {
            toast.error("Erreur lors de la création du projet.");
        }
    };

    if (!opportunity) return null;

    const inputClasses = "h-11 rounded-xl bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-colors shadow-none text-sm";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden border-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-3xl bg-white">
                
                {/* Header festif */}
                <div className="px-8 pt-8 pb-6 border-b border-slate-100 bg-gradient-to-b from-indigo-50/50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                            <Rocket className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-900">
                                Lancer le projet
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-sm mt-1">
                                L'opportunité <strong className="text-slate-700">"{opportunity.name}"</strong> est gagnée ! Initialisons l'espace de travail.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleConvert} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Nom du projet</Label>
                        <Input 
                            value={name} onChange={(e) => setName(e.target.value)}
                            className={inputClasses} required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-slate-400" /> Date de démarrage
                            </Label>
                            <Input 
                                type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                className={inputClasses} required
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ressources (Optionnel)</p>
                        
                        <div className="space-y-2">
                            <div className="relative">
                                <Figma className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)}
                                    placeholder="Lien de la maquette Figma..." className={`${inputClasses} pl-10`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="relative">
                                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
                                    placeholder="Lien du repository GitHub..." className={`${inputClasses} pl-10`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-11 rounded-xl px-6 font-semibold text-slate-500">
                            Plus tard
                        </Button>
                        <Button type="submit" disabled={isLoading} className="h-11 px-8 font-bold transition-all active:scale-95">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
                            Créer le workspace
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}