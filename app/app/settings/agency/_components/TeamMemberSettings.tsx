import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { removeTeamMember } from "@/actions/agency.server";
import { useTransition } from "react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { getInitials } from "@/lib/utils";
import dayjs from "dayjs";
import { Clock, Loader2, Mail, MoreVertical, Send, ShieldCheck, Sparkles, Trash2, UserPlus } from "lucide-react";

type TeamMemberSettingsProps = {
    team: any[]
    profile: any
    invites: any[]
    inviteState: any
    isInvitePending: boolean
    inviteFormAction: (payload: FormData) => void
    inviteDialogOpen: boolean
    setInviteDialogOpen: (open: boolean) => void
    onInviteClick: () => void
}
export default function TeamMemberSettings({ team, profile, inviteDialogOpen, setInviteDialogOpen, inviteState, isInvitePending, inviteFormAction, invites, onInviteClick }: TeamMemberSettingsProps) {
    const [isRemoving, startRemoveTransition] = useTransition()

    function handleRemoveMember(memberId: string) {
        startRemoveTransition(async () => {
            const result = await removeTeamMember(memberId)
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.message)
            }
        })
    }

    return (
        <TabsContent value="team" className="space-y-8">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg">Membres actifs</CardTitle>
                        </div>
                        <CardDescription>Personnes ayant un accès actuel à l'agence.</CardDescription>
                    </div>

                    <Button variant="outline" className="border-slate-200 hover:bg-slate-50 shadow-sm" onClick={onInviteClick}>
                        <UserPlus className="h-4 w-4 mr-2 text-blue-600" /> Inviter un membre
                    </Button>

                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Inviter un collaborateur</DialogTitle>
                                <DialogDescription>Un email sera envoyé pour activer l'accès à votre tableau de bord.</DialogDescription>
                            </DialogHeader>

                            {inviteState?.message && (
                                <Alert variant={inviteState.success ? "default" : "destructive"} className="my-2 border-2">
                                    <AlertDescription className="font-medium">{inviteState.message}</AlertDescription>
                                </Alert>
                            )}

                            <form action={inviteFormAction} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Adresse email professionnelle</Label>
                                    <Input id="email" name="email" placeholder="nom@agence.fr" disabled={isInvitePending} required />
                                    {inviteState?.errors?.email && <p className="text-xs text-destructive">{inviteState.errors.email[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Rôle attribué</Label>
                                    <Select name="role" defaultValue="agency_member">
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="agency_admin">Administrateur (Tous droits)</SelectItem>
                                            <SelectItem value="agency_member">Membre (Accès limité)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button type="submit" className="w-full" disabled={isInvitePending}>
                                    {isInvitePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                    Envoyer l'invitation
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>

                <CardContent className="p-0">
                    {team.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 mb-4">
                                <UserPlus className="h-6 w-6 text-slate-300" />
                            </div>
                            <p className="text-sm font-medium text-slate-900">Aucun membre actif</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {team.map((member) => {
                                const isMe = member.email === profile.email;

                                return (
                                    <div key={member.id || member.email} className={`flex items-center justify-between p-4 transition-colors group ${isMe ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar className={`h-10 w-10 border-2 shadow-sm ${isMe ? 'border-blue-400' : 'border-white'}`}>
                                                    <AvatarFallback className={`${isMe ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'} text-xs font-bold`}>
                                                        {getInitials(member.first_name, member.last_name, member.email)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {isMe && (
                                                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 border-2 border-white">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {member.first_name} {member.last_name}
                                                    </p>
                                                    {isMe && (
                                                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] h-4 px-1.5 uppercase font-bold tracking-tighter">
                                                            Vous
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Mail className="h-3 w-3" /> {member.email}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className={member.role === 'agency_admin' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}>
                                                {member.role === 'agency_admin' ? 'Admin' : 'Membre'}
                                            </Badge>

                                            {/* On cache les actions pour soi-même ou on limite les droits */}
                                            {!isMe && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer"
                                                            disabled={isRemoving}
                                                            onClick={() => handleRemoveMember(member.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> Retirer du compte
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* INVITATIONS EN ATTENTE (Apparaît seulement si > 0) */}
            {invites.length > 0 && (
                <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 px-1">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Invitations envoyées</h3>
                    </div>

                    <div className="grid gap-3">
                        {invites.map((invite: any) => (
                            <div key={invite.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 border-dashed rounded-xl shadow-sm hover:border-blue-200 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                        <Mail className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{invite.email}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <Sparkles className="h-3 w-3 text-amber-500" />
                                            Expire le {dayjs(invite.expires_at).locale('fr').format('D MMM YYYY')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="bg-slate-50/50 text-slate-500 border-slate-200 font-normal">
                                        {invite.role === 'agency_admin' ? 'Futur Admin' : 'Futur Membre'}
                                    </Badge>
                                    <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold uppercase text-destructive hover:bg-destructive/5 tracking-tighter">
                                        Annuler
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </TabsContent>
    )
}