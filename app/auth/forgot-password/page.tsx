"use client";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-[#FFFDF8] overflow-hidden px-4 py-12">
            {/* Background decorative gradients */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#EBF0FE] via-[#F1EFFD] to-[#FFFDF8] z-0" />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-md"
            >
                <ForgotPasswordForm />
            </motion.div>
        </div>
    );
}