"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadFile } from "@/actions/files.server";
import type { FileRecord } from "@/actions/files.server";

interface UploadFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string | null;
    taskId?: string;
    onUploaded: (file: FileRecord) => void;
}

export function UploadFileDialog({ open, onOpenChange, projectId, taskId, onUploaded }: UploadFileDialogProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;
        setIsLoading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (projectId) formData.append("projectId", projectId);
        if (taskId) formData.append("taskId", taskId);
        const result = await uploadFile(formData);
        setIsLoading(false);
        if (result.success && result.data) {
            toast.success("Fichier uploadé");
            onUploaded(result.data);
            setSelectedFile(null);
            onOpenChange(false);
        } else {
            toast.error(result.error ?? "Erreur lors de l'upload");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Uploader un fichier</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input ref={inputRef} type="file" className="hidden"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
                    <div
                        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => inputRef.current?.click()}
                    >
                        {selectedFile ? (
                            <p className="text-sm font-medium">{selectedFile.name}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">Cliquez pour sélectionner un fichier</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={!selectedFile || isLoading}>
                            {isLoading ? "Upload…" : "Uploader"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
