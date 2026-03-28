"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameFolderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentName: string;
    onConfirm: (name: string) => Promise<void>;
}

export function RenameFolderDialog({ open, onOpenChange, currentName, onConfirm }: RenameFolderDialogProps) {
    const [name, setName] = useState(currentName);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => { if (open) setName(currentName); }, [open, currentName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || name.trim() === currentName) { onOpenChange(false); return; }
        setIsLoading(true);
        try {
            await onConfirm(name.trim());
            onOpenChange(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Renommer le dossier</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="rename-folder">Nouveau nom</Label>
                        <Input
                            id="rename-folder"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={!name.trim() || name.trim() === currentName || isLoading}>
                            {isLoading ? "Renommage…" : "Renommer"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
