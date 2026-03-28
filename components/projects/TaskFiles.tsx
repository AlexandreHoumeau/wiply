"use client";

import { useState, useEffect } from "react";
import { Link2, FileUp, X, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    getTaskFiles, getProjectFiles, getAgencyFiles, linkFileToTask, unlinkFileFromTask, getSignedUrl,
    type FileRecord,
} from "@/actions/files.server";
import { UploadFileDialog } from "@/components/files/UploadFileDialog";
import { AddLinkDialog } from "@/components/files/AddLinkDialog";
import { formatBytes } from "@/lib/utils";

interface TaskFilesProps {
    task: { id: string } | null;
    projectId: string;
}

export function TaskFiles({ task, projectId }: TaskFilesProps) {
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [projectFiles, setProjectFiles] = useState<FileRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);

    useEffect(() => {
        if (!task?.id) return;

        let cancelled = false;

        const fetchFiles = async () => {
            setIsLoading(true);
            const result = await getTaskFiles(task.id);
            if (!cancelled && result.success && result.data) {
                setFiles(result.data);
            }
            if (!cancelled) {
                setIsLoading(false);
            }
        };

        void fetchFiles();

        return () => {
            cancelled = true;
        };
    }, [task?.id]);

    const openAddModal = () => {
        // Load both project files and workspace files for "Lier existant" tab
        Promise.all([getProjectFiles(projectId), getAgencyFiles()]).then(([proj, agency]) => {
            const combined = [
                ...(proj.success && proj.data ? proj.data : []),
                ...(agency.success && agency.data ? agency.data : []),
            ];
            setProjectFiles(combined);
        });
        setAddModalOpen(true);
    };

    const handleUnlink = async (fileId: string) => {
        if (!task?.id) return;
        setUnlinkingId(fileId);
        const result = await unlinkFileFromTask(task.id, fileId);
        setUnlinkingId(null);
        if (result.success) {
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
        } else {
            toast.error(result.error ?? "Erreur lors de la dissociation");
        }
    };

    const handleLinkExisting = async (fileId: string) => {
        if (!task?.id) return;
        const result = await linkFileToTask(task.id, fileId);
        if (result.success) {
            const linked = projectFiles.find((f) => f.id === fileId);
            if (linked) setFiles((prev) => [...prev, linked]);
            setAddModalOpen(false);
            toast.success("Fichier lié au ticket");
        } else {
            toast.error(result.error ?? "Erreur lors de la liaison");
        }
    };

    const handleDownload = async (file: FileRecord) => {
        if (file.type === "link" && file.url) {
            window.open(file.url, "_blank");
            return;
        }
        if (file.storage_path) {
            // Open the tab immediately to preserve the user gesture — browsers block
            // window.open calls made after an async await.
            const tab = window.open("", "_blank");
            const result = await getSignedUrl(file.storage_path);
            if (result.success && result.url) {
                tab!.location.href = result.url;
            } else {
                tab?.close();
                toast.error("Impossible de générer le lien");
            }
        }
    };

    if (!task) return null;

    const alreadyLinkedIds = new Set(files.map((f) => f.id));
    const linkableFiles = projectFiles.filter((f) => !alreadyLinkedIds.has(f.id));

    return (
        <div className="px-10 pb-8">
            <div className="border-t border-border/30 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Fichiers</h3>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setLinkOpen(true)}>
                            <Link2 className="w-3 h-3 mr-1" /> Ajouter un lien
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={openAddModal}>
                            <Plus className="w-3 h-3 mr-1" /> Ajouter
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
                    </div>
                ) : files.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun fichier lié à ce ticket.</p>
                ) : (
                    <div className="space-y-2">
                        {files.map((file) => (
                            <div key={file.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors group">
                                {file.type === "link"
                                    ? <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                                    : <FileUp className="w-4 h-4 text-muted-foreground shrink-0" />
                                }
                                <button
                                    className="flex-1 text-sm font-medium text-left truncate hover:underline"
                                    onClick={() => handleDownload(file)}
                                >
                                    {file.name}
                                </button>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {file.size ? formatBytes(file.size) : "Lien externe"}
                                </span>
                                <button
                                    onClick={() => handleUnlink(file.id)}
                                    disabled={unlinkingId === file.id}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add file modal */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ajouter un fichier</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="upload">
                        <TabsList className="w-full">
                            <TabsTrigger value="upload" className="flex-1">Uploader</TabsTrigger>
                            <TabsTrigger value="existing" className="flex-1">Lier existant</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upload" className="pt-4">
                            <p className="text-sm text-muted-foreground mb-3">
                                Uploadez un nouveau fichier — il sera aussi disponible dans l'onglet Fichiers du projet.
                            </p>
                            <Button className="w-full" onClick={() => { setAddModalOpen(false); setUploadOpen(true); }}>
                                <FileUp className="w-4 h-4 mr-2" /> Choisir un fichier
                            </Button>
                        </TabsContent>
                        <TabsContent value="existing" className="pt-4">
                            {linkableFiles.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Aucun fichier disponible dans ce projet.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {linkableFiles.map((file) => (
                                        <button
                                            key={file.id}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border/40 hover:bg-muted/40 text-left transition-colors"
                                            onClick={() => handleLinkExisting(file.id)}
                                        >
                                            {file.type === "link"
                                                ? <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                                                : <FileUp className="w-4 h-4 text-muted-foreground shrink-0" />
                                            }
                                            <span className="flex-1 text-sm font-medium truncate">{file.name}</span>
                                            {file.size && <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <UploadFileDialog
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                projectId={projectId}
                taskId={task?.id}
                onUploaded={(file) => setFiles((prev) => [...prev, file])}
            />
            <AddLinkDialog
                open={linkOpen}
                onOpenChange={setLinkOpen}
                projectId={projectId}
                taskId={task?.id}
                onAdded={(file) => setFiles((prev) => [...prev, file])}
            />
        </div>
    );
}
