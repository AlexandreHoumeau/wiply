"use client";

import { useState } from "react";
import { Link2, FileUp, Trash2, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { deleteFile, getSignedUrl } from "@/actions/files.server";
import { UploadFileDialog } from "./UploadFileDialog";
import { AddLinkDialog } from "./AddLinkDialog";
import type { FileRecord } from "@/actions/files.server";
import { formatBytes } from "@/lib/utils";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("fr");

interface FilesTableProps {
    initialFiles: FileRecord[];
    projectId: string | null; // null = workspace-level
}

export function FilesTable({ initialFiles, projectId }: FilesTableProps) {
    const [files, setFiles] = useState<FileRecord[]>(initialFiles);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDownload = async (file: FileRecord) => {
        if (file.type === "link" && file.url) {
            window.open(file.url, "_blank");
            return;
        }
        if (file.storage_path) {
            const result = await getSignedUrl(file.storage_path);
            if (result.success && result.url) {
                window.open(result.url, "_blank");
            } else {
                toast.error("Impossible de générer le lien de téléchargement");
            }
        }
    };

    const handleDelete = async (fileId: string) => {
        setDeletingId(fileId);
        const result = await deleteFile(fileId);
        setDeletingId(null);
        if (result.success) {
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
            toast.success("Fichier supprimé");
        } else {
            toast.error(result.error ?? "Erreur lors de la suppression");
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{files.length} fichier{files.length !== 1 ? "s" : ""}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
                        <Link2 className="w-4 h-4 mr-2" /> Ajouter un lien
                    </Button>
                    <Button size="sm" onClick={() => setUploadOpen(true)}>
                        <FileUp className="w-4 h-4 mr-2" /> Uploader un fichier
                    </Button>
                </div>
            </div>

            {/* Table */}
            {files.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                    Aucun fichier pour l&apos;instant. Uploadez un fichier ou ajoutez un lien.
                </div>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 border-b border-border">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nom</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Taille</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ajouté par</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tickets liés</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {files.map((file) => (
                                <tr key={file.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {file.type === "link"
                                                ? <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                                                : <FileUp className="w-4 h-4 text-muted-foreground shrink-0" />
                                            }
                                            <button
                                                className="font-medium hover:underline text-left truncate max-w-[280px]"
                                                onClick={() => handleDownload(file)}
                                            >
                                                {file.name}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {file.size ? formatBytes(file.size) : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {file.uploader
                                            ? `${file.uploader.first_name ?? ""} ${file.uploader.last_name ?? ""}`.trim() || file.uploader.email
                                            : "—"
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                        {dayjs(file.created_at).fromNow()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {(file.task_files ?? []).map((tf: any) => (
                                                <a
                                                    key={tf.task_id}
                                                    href={`/app/projects/${tf.task.project.slug}/board`}
                                                    className="inline-block"
                                                >
                                                    <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-muted">
                                                        {tf.task.project.task_prefix}-{tf.task.task_number}
                                                    </Badge>
                                                </a>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 justify-end">
                                            {file.type === "link" ? (
                                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                    <a href={file.url!} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(file)}>
                                                    <Download className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(file.id)}
                                                disabled={deletingId === file.id}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <UploadFileDialog
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                projectId={projectId}
                onUploaded={(file) => setFiles((prev) => [file, ...prev])}
            />
            <AddLinkDialog
                open={linkOpen}
                onOpenChange={setLinkOpen}
                projectId={projectId}
                onAdded={(file) => setFiles((prev) => [file, ...prev])}
            />
        </div>
    );
}
