"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

export function PublicNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let previous = window.scrollY;

    const handleScroll = () => {
      const latest = window.scrollY;

      if (latest > previous && latest > 150) {
        setIsMobileMenuOpen(false);
        setIsHidden(true);
      } else if (latest < previous) {
        setIsHidden(false);
      }

      previous = latest;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 flex justify-center transition-transform duration-300 ease-in-out ${isHidden ? "-translate-y-[150%]" : "translate-y-0"}`}>
      <nav className="w-full max-w-7xl h-16 bg-gradient-to-r from-[#FFDEAF] to-[#F1EFFE] rounded-full px-6 md:px-8 flex items-center justify-between shadow-sm">
        <div className="hidden md:flex items-center gap-8 flex-1">
          <Link href="#features" className="text-sm font-semibold text-[#4C4C4C] hover:text-black transition-colors">
            Fonctionnalités
          </Link>
          <Link href="#pricing" className="text-sm font-semibold text-[#4C4C4C] hover:text-black transition-colors">
            Tarifs
          </Link>
        </div>

        <div className="flex-1 flex justify-center">
          <Link href="/" className="flex items-center justify-center group">
            <Image
              src="/logo.svg"
              alt="Logo Wiply"
              width={40}
              height={40}
              className="group-hover:scale-105 transition-transform"
              priority
            />
          </Link>
        </div>

        <div className="hidden md:flex items-center justify-end gap-6 flex-1">
          <Link href="/auth/login" className="text-sm font-semibold text-[#4C4C4C] hover:text-black transition-colors">
            Connexion
          </Link>
          <Link href="/auth/signup" className="bg-[#FAD09E] hover:bg-[#f3c187] text-[#4C4C4C] text-sm font-bold px-6 py-2 rounded-full transition-colors shadow-sm">
            Essayer
          </Link>
        </div>

        <div className="md:hidden flex flex-1 justify-end">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-[#4C4C4C]">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="absolute top-20 left-4 right-4 bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4 border border-slate-100 md:hidden">
          <Link href="#features" className="font-semibold text-[#4C4C4C]" onClick={() => setIsMobileMenuOpen(false)}>Fonctionnalités</Link>
          <Link href="#pricing" className="font-semibold text-[#4C4C4C]" onClick={() => setIsMobileMenuOpen(false)}>Tarifs</Link>
          <div className="h-px w-full bg-slate-100 my-2"></div>
          <Link href="/auth/login" className="font-semibold text-[#4C4C4C]" onClick={() => setIsMobileMenuOpen(false)}>Connexion</Link>
          <Link href="/auth/signup" className="bg-[#FAD09E] text-[#4C4C4C] font-bold px-4 py-3 rounded-xl text-center" onClick={() => setIsMobileMenuOpen(false)}>
            Essayer
          </Link>
        </div>
      )}
    </div>
  );
}
