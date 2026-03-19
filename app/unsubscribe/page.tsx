import { Suspense } from 'react'
import UnsubscribeForm from './_components/UnsubscribeForm'
import { Loader2 } from 'lucide-react'

export default function UnsubscribePage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <Suspense fallback={
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                }>
                    <UnsubscribeForm />
                </Suspense>
            </div>
        </div>
    )
}
