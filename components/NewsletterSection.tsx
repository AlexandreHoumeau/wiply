"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { subscribeToNewsletter } from "@/actions/newsletter.server";

export function NewsletterSection() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus("loading");
        setErrorMessage("");

        const result = await subscribeToNewsletter(email);

        if ("error" in result) {
            setStatus("error");
            setErrorMessage(result.error);
        } else {
            setStatus("success");
            setEmail("");
        }
    }

    return (
        <section className="pt-8 px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-[2rem] p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center"
            >
                <p className="text-[#8B6DF8] text-sm font-semibold mb-3">Restez dans la boucle</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] tracking-wide mb-4">
                    Pas encore prêt ? On vous tient au courant.
                </h2>
                <p className="text-[#7A7A7A] text-base leading-relaxed max-w-xl mx-auto mb-8">
                    Laissez votre email pour être notifié en priorité des nouvelles fonctionnalités et du lancement officiel.
                </p>

                {status === "success" ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-50 border border-green-200 text-green-700 font-semibold text-sm"
                    >
                        <span>✓</span>
                        <span>C'est noté ! On vous tient au courant.</span>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="votre@agence.fr"
                            required
                            disabled={status === "loading"}
                            className="flex-1 px-5 py-3 rounded-full border border-slate-200 text-sm text-[#4C4C4C] placeholder-[#ADADAD] outline-none focus:border-[#967CFB] focus:ring-2 focus:ring-[#967CFB]/20 transition-all disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={status === "loading" || !email}
                            className="px-6 py-3 rounded-full bg-[#967CFB] text-white font-bold text-sm hover:bg-[#8364f9] transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {status === "loading" ? "..." : "Je m'abonne →"}
                        </button>
                    </form>
                )}

                {status === "error" && (
                    <p className="mt-3 text-sm text-red-500">{errorMessage}</p>
                )}
            </motion.div>
        </section>
    );
}
