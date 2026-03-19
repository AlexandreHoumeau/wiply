"use client";

import { useState } from "react";
import { useProject } from "@/providers/project-provider";
import { updateProjectSettings, generateProjectMagicLink, togglePortalStatus } from "@/actions/project.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";
import { Loader2, LinkIcon, Copy, Save, Sparkles, PlayCircle, PauseCircle, LayoutTemplate, Tag } from "lucide-react";

export default function ProjectSettingsPage() {
    const project = useProject();

    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingToken, setIsGeneratingToken] = useState(false);

    const [formData, setFormData] = useState({
        name: (project as any)?.name || "",
        description: (project as any)?.description || "",
        task_prefix: (project as any)?.task_prefix || "",
        start_date: (project as any)?.start_date || "",
        figma_url: (project as any)?.figma_url || "",
        github_url: (project as any)?.github_url || "",
        deployment_url: (project as any)?.deployment_url || "",
        portal_message: (project as any)?.portal_message || "",
        portal_show_progress: (project as any)?.portal_show_progress ?? true,
    });

    if (!project) return null;

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

    const inputClasses = "h-11 rounded-xl bg-muted/50 border-border focus-visible:ring-indigo-500 focus-visible:border-indigo-500 shadow-none";

    return (
        <div className="max-w-[1000px] overflow-scroll mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">

            {/* 🎯 SECTION 1 : Le Portail Client */}
            <div className={`p-6 md:p-8 rounded-3xl border shadow-sm relative overflow-hidden transition-colors ${
                project.is_portal_active === false
                    ? 'bg-muted border-border'
                    : 'bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-background border-indigo-100 dark:border-indigo-900/40'
            }`}>
                {project.is_portal_active !== false && <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-indigo-200/40 rotate-12" />}

                <div className="flex items-start justify-between mb-2">
                    <h2 className={`card-title ${project.is_portal_active === false ? 'text-muted-foreground' : 'text-indigo-950 dark:text-indigo-200'}`}>
                        Accès Client (Portail Magique)
                    </h2>
                    {project.magic_token && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            project.is_portal_active === false
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                        }`}>
                            {project.is_portal_active === false ? "En Pause" : "Actif"}
                        </span>
                    )}
                </div>

                <p className={`text-sm mb-6 max-w-2xl ${
                    project.is_portal_active === false
                        ? 'text-muted-foreground/70'
                        : 'text-indigo-900/60 dark:text-indigo-300/60'
                }`}>
                    C'est ce lien que vous devez envoyer à votre client. Aucune inscription n'est requise.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            readOnly
                            value={clientPortalUrl || "Aucun lien généré pour le moment."}
                            className={`pl-11 h-12 border-indigo-100 dark:border-indigo-900/40 font-medium rounded-xl shadow-sm ${
                                project.is_portal_active === false
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-card text-muted-foreground'
                            }`}
                        />
                    </div>

                    {project.magic_token ? (
                        <>
                            <Button onClick={handleCopyLink} disabled={project.is_portal_active === false} className="h-12 px-6 transition-all">
                                <Copy className="w-4 h-4 mr-2" /> Copier
                            </Button>
                            <Button onClick={handleTogglePause} variant="outline" className={`h-12 px-4 rounded-xl border-2 transition-all ${
                                project.is_portal_active === false
                                    ? 'border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                    : 'border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}>
                                {project.is_portal_active === false
                                    ? <><PlayCircle className="w-4 h-4 mr-2" /> Réactiver</>
                                    : <><PauseCircle className="w-4 h-4 mr-2" /> Suspendre</>}
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
            <form onSubmit={handleSaveSettings} className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm space-y-8">
                <div>
                    <h2 className="card-title mb-1">Informations Générales</h2>
                    <p className="text-sm text-muted-foreground">Modifiez les détails fondamentaux de ce projet.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-semibold text-foreground">Nom du projet</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={inputClasses} required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                            Préfixe des tickets
                        </Label>
                        <Input
                            value={formData.task_prefix}
                            onChange={(e) => setFormData({ ...formData, task_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) })}
                            placeholder="ex: WIP, PROJ, DEV"
                            maxLength={6}
                            className={inputClasses}
                        />
                        <p className="text-xs text-muted-foreground">Identifiant court affiché avant le numéro de ticket (ex: WIP-1, WIP-2).</p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-semibold text-foreground">Description / Brief</Label>
                        <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 min-h-[120px]">
                            <RichTextEditor
                                key="project-description"
                                content={formData.description}
                                onChange={(html) => setFormData({ ...formData, description: html })}
                                placeholder="Contexte, objectifs, brief client…"
                                minHeight="80px"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground">Date de démarrage</Label>
                        <Input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            className={inputClasses}
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-border">
                    <h3 className="card-title mb-4">Ressources & Liens</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-foreground">Maquettes (Figma)</Label>
                            <Input
                                placeholder="https://figma.com/..."
                                value={formData.figma_url}
                                onChange={(e) => setFormData({ ...formData, figma_url: e.target.value })}
                                className={inputClasses}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-foreground">Repository (Github)</Label>
                            <Input
                                placeholder="https://github.com/..."
                                value={formData.github_url}
                                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                                className={inputClasses}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-sm font-semibold text-foreground">Lien de production (Live)</Label>
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
                <div className="pt-6 border-t border-border">
                    <div className="flex items-center gap-2 mb-4">
                        <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
                        <h3 className="card-title">Personnalisation du Portail</h3>
                    </div>

                    <div className="space-y-5">
                        {/* Show progress toggle */}
                        <div className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
                            <div>
                                <p className="font-semibold text-foreground text-sm">Afficher la barre de progression</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Montrer au client l'avancement de la checklist</p>
                            </div>
                            <Switch
                                checked={formData.portal_show_progress}
                                onCheckedChange={(v) => setFormData({ ...formData, portal_show_progress: v })}
                            />
                        </div>

                        {/* Custom message */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-foreground">Message pour le client</Label>
                            <textarea
                                placeholder="Ex: Bonjour ! Voici votre espace de suivi. N'hésitez pas à nous contacter si vous avez des questions…"
                                value={formData.portal_message}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, portal_message: e.target.value })}
                                rows={4}
                                className="w-full min-h-[100px] rounded-xl bg-muted/50 border border-border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                            />
                            <p className="text-xs text-muted-foreground">Affiché en haut du portail client, sous le titre de bienvenue.</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isLoading} className="h-11 px-8 rounded-xl bg-foreground hover:bg-foreground/90 text-background shadow-sm transition-all active:scale-95">
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Enregistrer les modifications
                    </Button>
                </div>
            </form>

        </div>
    );
}
