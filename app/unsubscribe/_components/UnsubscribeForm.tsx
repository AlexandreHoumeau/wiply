'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { unsubscribeFromNewsletter } from '@/actions/newsletter.server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, MailX } from 'lucide-react'

export default function UnsubscribeForm() {
    const searchParams = useSearchParams()
    const [email, setEmail] = useState(searchParams.get('email') ?? '')
    const [done, setDone] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
            const result = await unsubscribeFromNewsletter(email)
            if ('error' in result) {
                setError(result.error)
            } else {
                setDone(true)
            }
        })
    }

    return (
        <>
            <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-gray-100 rounded-full">
                    <MailX className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">Se désabonner</h1>
                    <p className="text-sm text-gray-500 mt-1">Wiply — Newsletter</p>
                </div>
            </div>

            {done ? (
                <div className="mt-8 flex flex-col items-center gap-3 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    <p className="text-gray-700 font-medium">Vous avez été désabonné.</p>
                    <p className="text-sm text-gray-500">
                        Vous ne recevrez plus d'emails de la newsletter Wiply.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                            Adresse email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="vous@exemple.fr"
                            required
                            disabled={isPending}
                            autoComplete="email"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    )}

                    <Button
                        type="submit"
                        variant="outline"
                        className="w-full"
                        disabled={isPending || !email}
                    >
                        {isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Désabonnement...</>
                        ) : (
                            'Me désabonner'
                        )}
                    </Button>

                    <p className="text-xs text-gray-400 text-center">
                        Vous continuerez à recevoir les emails transactionnels liés à votre compte.
                    </p>
                </form>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <a
                    href="https://wiply.fr"
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                    wiply.fr
                </a>
            </div>
        </>
    )
}
