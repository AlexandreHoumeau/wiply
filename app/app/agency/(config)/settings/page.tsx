"use client"

import { inviteTeamMember, updateAgencyProfile, updateAgencyLegal } from "@/actions/agency.server"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useActionState, useEffect, useState } from "react"
import { useSettings } from "@/app/app/settings/settings-context"
import { useUpgradeDialog } from "@/providers/UpgradeDialogProvider"
import GeneralAgencySettings from "./_components/GeneralAgencySettings"
import TeamMemberSettings from "./_components/TeamMemberSettings"

export default function AgencyPage() {
    // On récupère agency, team et invites depuis le contexte
    const { agency, team, invites = [], profile, billing } = useSettings()
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
    const { openUpgradeDialog } = useUpgradeDialog()

    function handleInviteClick() {
        if (billing?.plan !== 'PRO') {
            openUpgradeDialog("Le plan FREE ne permet pas d'inviter des collaborateurs.", agency.id)
        } else {
            setInviteDialogOpen(true)
        }
    }

    // Actions Server avec useActionState
    const [profileState, profileFormAction, isProfilePending] = useActionState(updateAgencyProfile, null)
    const [legalState, legalFormAction, isLegalPending] = useActionState(updateAgencyLegal, null)
    const [inviteState, inviteFormAction, isInvitePending] = useActionState(inviteTeamMember, null)

    // Fermeture automatique de la modale d'invitation en cas de succès
    useEffect(() => {
        if (inviteState?.success && inviteDialogOpen) {
            const timer = setTimeout(() => setInviteDialogOpen(false), 1500)
            return () => clearTimeout(timer)
        }
    }, [inviteState, inviteDialogOpen])

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="bg-slate-100/80 p-1 mb-8">
                    <TabsTrigger value="general" className="data-[state=active]:shadow-sm">Général</TabsTrigger>
                    <TabsTrigger value="team" className="data-[state=active]:shadow-sm">
                        Équipe ({team.length})
                    </TabsTrigger>
                </TabsList>
                <GeneralAgencySettings
                    agency={agency}
                    profileFormAction={profileFormAction}
                    isProfilePending={isProfilePending}
                    profileState={profileState}
                    legalFormAction={legalFormAction}
                    isLegalPending={isLegalPending}
                    legalState={legalState}
                />
                <TeamMemberSettings team={team} invites={invites} profile={profile} inviteState={inviteState} inviteFormAction={inviteFormAction} isInvitePending={isInvitePending} inviteDialogOpen={inviteDialogOpen} setInviteDialogOpen={setInviteDialogOpen} onInviteClick={handleInviteClick} />
            </Tabs>
        </div>
    )
}
