"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addLink } from "@/actions/files.server";
import type { FileRecord } from "@/actions/files.server";

interface AddLinkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string | null;
    taskId?: string;
    onAdded: (file: FileRecord) => void;
}

export function AddLinkDialog({ open, onOpenChange, projectId, taskId, onAdded }: AddLinkDialogProps) {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !url.trim()) return;
        setIsLoading(true);
        const result = await addLink(projectId, name.trim(), url.trim(), taskId);
        setIsLoading(false);
        if (result.success && result.data) {
            toast.success("Lien ajouté");
            onAdded(result.data);
            setName(""); setUrl("");
            onOpenChange(false);
        } else {
            toast.error(result.error ?? "Erreur lors de l'ajout du lien");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ajouter un lien externe</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="link-name">Nom</Label>
                        <Input id="link-name" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="Maquettes Figma, Google Doc…" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="link-url">URL</Label>
                        <Input id="link-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://…" required />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Ajout…" : "Ajouter"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
