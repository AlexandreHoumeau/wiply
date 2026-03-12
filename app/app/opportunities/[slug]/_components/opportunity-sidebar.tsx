'use client'

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { OpportunityWithCompany } from "@/lib/validators/oppotunities"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Loader2, Pencil, Wand2 } from "lucide-react"
import OpportunityMetadata from "./opportunity-metadata"
import { OpportunityDialog } from "@/components/opportunities/OpportunityDialog"
import { useUserProfile } from "@/hooks/useUserProfile"
import { analyzeCompanyWebsiteAction } from "@/actions/ai.server"
import { updateOpportunity } from "@/actions/opportunity.client"
import { useUpgradeDialog } from "@/providers/UpgradeDialogProvider"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { mapOpportunityWithCompanyToFormValues } from "@/lib/validators/oppotunities"

export default function OpportunitySidebarInfo(opportunity: OpportunityWithCompany) {
    const [editOpen, setEditOpen] = useState(false)
    const [analysisOpen, setAnalysisOpen] = useState(false)
    const [analysisText, setAnalysisText] = useState("")
    const [isAnalyzing, startAnalysis] = useTransition()
    const [isSaving, startSaving] = useTransition()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { profile } = useUserProfile()
    const { openUpgradeDialog } = useUpgradeDialog()

    function handleSaved() {
        setEditOpen(false)
        queryClient.invalidateQueries({ queryKey: ["opportunities"] })
        router.refresh()
    }

    function handleAnalyze() {
        if (!opportunity.company?.website || !profile?.agency_id) return
        startAnalysis(async () => {
            const result = await analyzeCompanyWebsiteAction(
                opportunity.company!.website!,
                profile.agency_id!
            )
            if (result.success) {
                setAnalysisText(result.analysis)
                setAnalysisOpen(true)
            } else if (result.needsUpgrade) {
                openUpgradeDialog(result.error, profile.agency_id!)
            } else {
                toast.error(result.error)
            }
        })
    }

    function handleApplyDescription() {
        startSaving(async () => {
            const formValues = mapOpportunityWithCompanyToFormValues(opportunity)
            await updateOpportunity(opportunity.id, { ...formValues, description: analysisText })
            toast.success("Description mise à jour !")
            setAnalysisOpen(false)
            queryClient.invalidateQueries({ queryKey: ["opportunities"] })
            router.refresh()
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Détails
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-slate-900"
                    onClick={() => setEditOpen(true)}
                >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Modifier
                </Button>
            </div>

            <OpportunityMetadata {...opportunity} />

            {opportunity.company?.website && profile?.agency_id && (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs gap-1.5 text-muted-foreground"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                >
                    {isAnalyzing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Wand2 className="h-3 w-3" />
                    )}
                    {isAnalyzing ? "Analyse en cours…" : "Analyser le site web"}
                </Button>
            )}

            {opportunity.description && (
                <>
                    <Separator />
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                        <p className="text-sm leading-relaxed">{opportunity.description}</p>
                    </div>
                </>
            )}

            {profile && (
                <OpportunityDialog
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    initialData={opportunity}
                    userProfile={profile}
                    onSaved={handleSaved}
                />
            )}

            <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Analyse du site web</DialogTitle>
                        <DialogDescription>
                            {opportunity.company?.name} — {opportunity.company?.website}
                        </DialogDescription>
                    </DialogHeader>
                    <p className="text-sm leading-relaxed text-slate-700">{analysisText}</p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setAnalysisOpen(false)}>
                            Fermer
                        </Button>
                        <Button onClick={handleApplyDescription} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : null}
                            Utiliser comme description
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
