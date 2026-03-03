import { LoginForm } from "@/components/auth/LoginForm";
import { RecoveryRedirect } from "@/components/auth/RecoveryRedirect";
import { Suspense } from "react";

export default function LoginPage() {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden px-4 py-12">
            <RecoveryRedirect />
            <div className="absolute top-[-15%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-15%] right-[-10%] w-96 h-96 bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
            <Suspense>
                <LoginForm />
            </Suspense>
        </div>
    );
}
