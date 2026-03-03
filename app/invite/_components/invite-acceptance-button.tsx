'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowRight, AlertTriangle, LogIn, UserPlus } from "lucide-react"
import { acceptInvitation } from "@/actions/invite.server"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"

interface InviteAcceptanceButtonProps {
  token: string
  isLoggedIn: boolean
  userEmail: string | null
  inviteEmail: string
}

export default function InviteAcceptanceButton({ token, isLoggedIn, userEmail, inviteEmail }: InviteAcceptanceButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const next = encodeURIComponent(`/invite?token=${token}`)

  // Not logged in — show login/signup CTAs
  if (!isLoggedIn) {
    return (
      <div className="w-full space-y-4">
        <p className="text-sm text-slate-500 text-center">
          Connectez-vous avec <span className="font-semibold text-slate-800">{inviteEmail}</span> pour rejoindre l&apos;équipe.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="outline" className="h-11">
            <Link href={`/auth/login?next=${next}`}>
              <LogIn className="h-4 w-4 mr-2" />
              Se connecter
            </Link>
          </Button>
          <Button asChild className="h-11 bg-blue-600 hover:bg-blue-700">
            <Link href={`/auth/signup?next=${next}`}>
              <UserPlus className="h-4 w-4 mr-2" />
              Créer un compte
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Logged in with wrong email — show error
  if (userEmail !== inviteEmail) {
    return (
      <div className="w-full rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Cette invitation est destinée à <span className="font-semibold">{inviteEmail}</span>.
          Vous êtes connecté en tant que <span className="font-semibold">{userEmail}</span>.
        </p>
      </div>
    )
  }

  // Logged in with correct email — show accept button
  const handleAccept = async () => {
    setIsLoading(true)
    try {
      const result = await acceptInvitation(token)

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Bienvenue dans l'équipe !")
        router.push('/app')
      }
    } catch {
      toast.error("Une erreur s'est produite.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleAccept}
      className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-md font-semibold group shadow-lg shadow-blue-200"
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          Accepter et rejoindre
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </>
      )}
    </Button>
  )
}
