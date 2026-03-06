"use client";

import { useState } from "react";
import { useProject } from "@/providers/project-provider";
import { updateProjectSettings, generateProjectMagicLink, togglePortalStatus } from "@/actions/project.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, LinkIcon, Copy, Save, Sparkles, PlayCircle, PauseCircle, LayoutTemplate } from "lucide-react";

export default function ProjectSettingsPage() {
    const project = useProject();

    // États pour le formulaire
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingToken, setIsGeneratingToken] = useState(false);

    const [formData, setFormData] = useState({
        name: project?.name || "",
        description: project?.description || "",
        start_date: project?.start_date || "",
        figma_url: project?.figma_url || "",
        github_url: project?.github_url || "",
        deployment_url: project?.deployment_url || "",
        portal_message: project?.portal_message || "",
        portal_show_progress: project?.portal_show_progress ?? true,
    });

    if (!project) return null;

    // L'URL de base pour le portail client (à adapter avec ton vrai nom de domaine en prod)
    const clientPortalUrl = project.magic_token
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${project.magic_token}`
        : "";

    const handleCopyLink = () => {
        navigator.clipboard.writeText(clientPortalUrl);
        toast.success("Lien copié dans le presse-papier !");
    };

    const handleGenerateToken = async () => {
        setIsGeneratingToken(true);
        const result = await generateProjectMagicLink(project.id);
        setIsGeneratingToken(false);

        if (result.success) {
            toast.success("Nouveau lien magique généré avec succès !");
            // Le useProject provider devrait se rafraîchir grâce au revalidatePath
        } else {
            toast.error("Erreur lors de la génération du lien.");
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const result = await updateProjectSettings(project.id, formData);
        setIsLoading(false);

        if (result.success) {
            toast.success("Paramètres du projet mis à jour.");
        } else {
            toast.error("Erreur lors de la sauvegarde.");
        }
    };

    const handleTogglePause = async () => {
        const newStatus = !project.is_portal_active;
        const result = await togglePortalStatus(project.id, newStatus);
        if (result.success) {
            toast.success(newStatus ? "Portail réactivé !" : "Portail suspendu.");
        }
    };

    const inputClasses = "h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 shadow-none";

    return (
        <div className="max-w-[1000px] overflow-scroll mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">

            {/* 🎯 SECTION 1 : Le Portail Client (Anti-Geek) */}
            <div className={`p-6 md:p-8 rounded-3xl border shadow-sm relative overflow-hidden transition-colors ${project.is_portal_active === false ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-100'}`}>
                {project.is_portal_active !== false && <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-indigo-200/40 rotate-12" />}

                <div className="flex items-start justify-between mb-2">
                    <h2 className={`text-xl font-bold ${project.is_portal_active === false ? 'text-slate-500' : 'text-indigo-950'}`}>
                        Accès Client (Portail Magique)
                    </h2>
                    {project.magic_token && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${project.is_portal_active === false ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                            {project.is_portal_active === false ? "En Pause" : "Actif"}
                        </span>
                    )}
                </div>

                <p className={`text-sm mb-6 max-w-2xl ${project.is_portal_active === false ? 'text-slate-400' : 'text-indigo-900/60'}`}>
                    C'est ce lien que vous devez envoyer à votre client. Aucune inscription n'est requise.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            readOnly
                            value={clientPortalUrl || "Aucun lien généré pour le moment."}
                            className={`pl-11 h-12 border-indigo-100 font-medium rounded-xl shadow-sm ${project.is_portal_active === false ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-600'}`}
                        />
                    </div>

                    {project.magic_token ? (
                        <>
                            <Button onClick={handleCopyLink} disabled={project.is_portal_active === false} className="h-12 px-6 transition-all">
                                <Copy className="w-4 h-4 mr-2" /> Copier
                            </Button>
                            {/* Bouton Pause / Play */}
                            <Button onClick={handleTogglePause} variant="outline" className={`h-12 px-4 rounded-xl border-2 transition-all ${project.is_portal_active === false ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}`}>
                                {project.is_portal_active === false ? <><PlayCircle className="w-4 h-4 mr-2" /> Réactiver</> : <><PauseCircle className="w-4 h-4 mr-2" /> Suspendre</>}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleGenerateToken} disabled={isGeneratingToken} className="h-12 px-6 transition-all">
                            {isGeneratingToken ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Générer le lien
                        </Button>
                    )}
                </div>
            </div>
            {/* 🛠️ SECTION 2 : Paramètres généraux du projet */}
            <form onSubmit={handleSaveSettings} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Informations Générales</h2>
                    <p className="text-sm text-slate-500">Modifiez les détails fondamentaux de ce projet.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-semibold text-slate-700">Nom du projet</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={inputClasses} required
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-semibold text-slate-700">Description / Brief</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="min-h-[120px] rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 shadow-none resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Date de démarrage</Label>
                        <Input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            className={inputClasses}
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Ressources & Liens</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Maquettes (Figma)</Label>
                            <Input
                                placeholder="https://figma.com/..."
                                value={formData.figma_url}
                                onChange={(e) => setFormData({ ...formData, figma_url: e.target.value })}
                                className={inputClasses}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Repository (Github)</Label>
                            <Input
                                placeholder="https://github.com/..."
                                value={formData.github_url}
                                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                                className={inputClasses}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-sm font-semibold text-slate-700">Lien de production (Live)</Label>
                            <Input
                                placeholder="https://mon-super-site.com"
                                value={formData.deployment_url}
                                onChange={(e) => setFormData({ ...formData, deployment_url: e.target.value })}
                                className={inputClasses}
                            />
                        </div>
                    </div>
                </div>

                {/* Portal personalization */}
                <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                        <LayoutTemplate className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Personnalisation du Portail</h3>
                    </div>

                    <div className="space-y-5">
                        {/* Show progress toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="font-semibold text-slate-800 text-sm">Afficher la barre de progression</p>
                                <p className="text-xs text-slate-500 mt-0.5">Montrer au client l'avancement de la checklist</p>
                            </div>
                            <Switch
                                checked={formData.portal_show_progress}
                                onCheckedChange={(v) => setFormData({ ...formData, portal_show_progress: v })}
                            />
                        </div>

                        {/* Custom message */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Message pour le client</Label>
                            <Textarea
                                placeholder="Ex: Bonjour ! Voici votre espace de suivi. N'hésitez pas à nous contacter si vous avez des questions…"
                                value={formData.portal_message}
                                onChange={(e) => setFormData({ ...formData, portal_message: e.target.value })}
                                className="min-h-[100px] rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 shadow-none resize-none"
                            />
                            <p className="text-xs text-slate-400">Affiché en haut du portail client, sous le titre de bienvenue.</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isLoading} className="h-11 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all active:scale-95">
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Enregistrer les modifications
                    </Button>
                </div>
            </form>

        </div>
    );
}