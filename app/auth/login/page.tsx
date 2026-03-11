"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { RecoveryRedirect } from "@/components/auth/RecoveryRedirect";
import { Suspense } from "react";
import { motion } from "framer-motion";

export default function LoginPage() {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-[#FFFDF8] overflow-hidden px-4 py-12">
            {/* Background decorative gradients to match Hero */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#EBF0FE] via-[#F1EFFD] to-[#FFFDF8] z-0" />

            <RecoveryRedirect />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-md"
            >
                <Suspense>
                    <LoginForm />
                </Suspense>
            </motion.div>
        </div>
    );
}