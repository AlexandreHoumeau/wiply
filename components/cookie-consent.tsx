"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import Link from "next/link";

const STORAGE_KEY = "cookie-consent";

// Reusing the shield icon style from the Wiply portal theme
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
  </svg>
);

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      // Small delay so it doesn't pop aggressively on page load
      setTimeout(() => setVisible(true), 500);
    } else if (stored === "accepted") {
      posthog.opt_in_capturing();
    }
  }, []);

  const handleClose = (action: string) => {
    setIsClosing(true);
    
    // Wait for the exit animation to finish before removing from DOM
    setTimeout(() => {
      if (action === "accept") {
        localStorage.setItem(STORAGE_KEY, "accepted");
        posthog.opt_in_capturing();
      } else {
        localStorage.setItem(STORAGE_KEY, "declined");
        posthog.opt_out_capturing();
      }
      setVisible(false);
    }, 300); 
  };

  if (!visible) return null;

  return (
    <div 
      className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm sm:bottom-6 sm:left-auto sm:right-6 transition-all duration-300 ease-out ${
        isClosing ? "translate-y-8 opacity-0" : "translate-y-0 opacity-100 animate-in slide-in-from-bottom-8 fade-in"
      }`}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="p-6">
          
          {/* Header */}
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <ShieldIcon />
            </div>
            <h3 className="text-base font-bold tracking-tight text-slate-900">
              Vie privée & Cookies
            </h3>
          </div>
          
          {/* Body */}
          <p className="mb-6 text-sm leading-relaxed text-slate-500">
            Nous utilisons PostHog uniquement pour améliorer l'expérience sur Wiply. 
            <strong className="font-semibold text-slate-700"> Aucun cookie publicitaire </strong> 
            n'est utilisé.{" "}
            <Link
              href="/politique-de-confidentialite"
              className="inline-block font-medium text-indigo-600 transition-colors hover:text-indigo-700 hover:underline hover:underline-offset-4"
            >
              En savoir plus
            </Link>
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:gap-3">
            <button
              onClick={() => handleClose("accept")}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
            >
              Accepter
            </button>
            <button
              onClick={() => handleClose("decline")}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
            >
              Refuser
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}