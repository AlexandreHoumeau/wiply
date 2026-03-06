"use client";

import { inviteTeamMember, removeTeamMember, resendInvitation, updateMemberRole } from "@/actions/agency.server";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Profile } from "@/lib/validators/profile";
import { cn, getInitials } from "@/lib/utils";
import { Clock, Loader2, Mail, MoreHorizontal, RefreshCw, Send, Shield, ShieldOff, Trash2, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type TeamMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

function ResendInviteButton({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleResend() {
    startTransition(async () => {
      const result = await resendInvitation(inviteId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <button
      onClick={handleResend}
      disabled={isPending}
      className="shrink-0 flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="h-3 w-3" />
      )}
      Renvoyer
    </button>
  );
}

function MemberActions({ member, onRoleChange, onRemove }: {
  member: TeamMember;
  onRoleChange: (id: string, newRole: "agency_admin" | "agency_member") => void;
  onRemove: (member: TeamMember) => void;
}) {
  const isAdmin = member.role === "agency_admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors opacity-0 group-hover/row:opacity-100 focus:opacity-100">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200">
        <DropdownMenuItem
          className="gap-2 rounded-lg cursor-pointer text-sm"
          onClick={() => onRoleChange(member.id, isAdmin ? "agency_member" : "agency_admin")}
        >
          {isAdmin ? (
            <><ShieldOff className="h-3.5 w-3.5 text-slate-500" /> Rétrograder en membre</>
          ) : (
            <><Shield className="h-3.5 w-3.5 text-slate-500" /> Promouvoir admin</>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 rounded-lg cursor-pointer text-sm text-red-600 focus:text-red-600 focus:bg-red-50"
          onClick={() => onRemove(member)}
        >
          <Trash2 className="h-3.5 w-3.5" /> Retirer de l'agence
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AgencyTeamCard({
  team,
  invites,
  profile,
}: {
  team: TeamMember[];
  invites: any[];
  profile: Profile;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(inviteTeamMember, null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [isRemoving, startRemoveTransition] = useTransition();
  const [, startRoleTransition] = useTransition();

  const isAdmin = profile.role === "agency_admin";

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message ?? "Invitation envoyée avec succès");
      setDialogOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state]);

  function handleRoleChange(memberId: string, newRole: "agency_admin" | "agency_member") {
    startRoleTransition(async () => {
      const result = await updateMemberRole(memberId, newRole);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleRemoveConfirm() {
    if (!memberToRemove) return;
    startRemoveTransition(async () => {
      const result = await removeTeamMember(memberToRemove.id);
      if (result.success) {
        toast.success(result.message);
        setMemberToRemove(null);
        router.refresh();
      } else {
        toast.error(result.message);
        setMemberToRemove(null);
      }
    });
  }

  return (
    <>
      <div className="group overflow-hidden rounded-2xl border bg-white transition-all duration-300">
        <div className="flex items-center justify-between border-b border-slate-100/80 px-7 py-5 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white p-2 text-slate-600 border border-slate-200/50 shadow-sm">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Collaborateurs</h2>
              <span className="rounded-md bg-slate-200/50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {team.length}
              </span>
            </div>
          </div>

          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
                  <UserPlus className="h-3.5 w-3.5" /> Inviter
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] rounded-2xl p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-semibold tracking-tight">Inviter un membre</DialogTitle>
                  <DialogDescription className="text-sm text-slate-500">
                    Un email sera envoyé pour lui donner accès à l'espace agence.
                  </DialogDescription>
                </DialogHeader>

                <form action={formAction} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email" className="text-xs font-semibold text-slate-700">Adresse email</Label>
                    <Input
                      id="invite-email"
                      name="email"
                      type="email"
                      placeholder="collaborateur@agence.com"
                      disabled={isPending}
                      required
                      className="h-10 border-slate-200 focus:border-slate-900 focus:ring-slate-900 shadow-sm"
                    />
                    {state?.errors?.email && (
                      <p className="text-xs text-red-500 font-medium">{state.errors.email[0]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">Rôle d'accès</Label>
                    <Select name="role" defaultValue="agency_member">
                      <SelectTrigger className="h-10 border-slate-200 focus:ring-slate-900 shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="agency_admin" className="rounded-lg">Administrateur</SelectItem>
                        <SelectItem value="agency_member" className="rounded-lg">Membre standard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-10 transition-all"
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Envoyer l'invitation
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Team list */}
        <div className="divide-y divide-slate-100">
          {team.map((member) => {
            const isMe = member.email === profile.email;
            const initials = getInitials(member.first_name, member.last_name, member.email);

            return (
              <div key={member.id} className="group/row flex items-center gap-4 px-7 py-4 hover:bg-slate-50 transition-colors">
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-medium shadow-sm",
                      isMe
                        ? "border-slate-300 bg-slate-100 text-slate-700"
                        : "border-slate-200 bg-white text-slate-600"
                    )}
                  >
                    {initials}
                  </div>
                  {isMe && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white" style={{ backgroundColor: 'var(--brand-secondary, #6366F1)' }}>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {member.first_name} {member.last_name}
                    </p>
                    {isMe && (
                      <span className="shrink-0 rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        Vous
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">{member.email}</p>
                </div>

                <span
                  className={cn(
                    "shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                    member.role === "agency_admin"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  )}
                >
                  {member.role === "agency_admin" ? "Admin" : "Membre"}
                </span>

                {isAdmin && !isMe && (
                  <MemberActions
                    member={member}
                    onRoleChange={handleRoleChange}
                    onRemove={setMemberToRemove}
                  />
                )}
              </div>
            );
          })}

          {team.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <Users className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-900">Aucun collaborateur</p>
              <p className="text-xs text-slate-500 mt-1">Invitez des membres pour collaborer.</p>
            </div>
          )}
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="bg-slate-50/50 border-t border-slate-100 px-7 py-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {invites.length} invitation{invites.length > 1 ? "s" : ""} en attente
              </p>
            </div>
            <div className="space-y-2">
              {invites.slice(0, 3).map((invite: any) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-3 rounded-xl border bg-white p-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 border border-slate-100">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <p className="flex-1 truncate text-xs font-medium text-slate-700">{invite.email}</p>
                  <ResendInviteButton inviteId={invite.id} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && (
                <>
                  <strong>{memberToRemove.first_name} {memberToRemove.last_name}</strong> ({memberToRemove.email}) sera retiré de l'agence. Cette action est réversible via une nouvelle invitation.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
