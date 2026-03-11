"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Building2, Mail, Link2, BarChart3, Calendar, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  mapOpportunityStatusLabel,
  OpportunityWithCompany,
  OpportunityStatus,
} from "@/lib/validators/oppotunities";

const STATUS_STYLES: Record<OpportunityStatus, { bg: string; text: string; dot: string }> = {
  to_do: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  first_contact: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  second_contact: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  proposal_sent: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  negotiation: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  won: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  lost: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
};

export type OpportunityTabId = "overview" | "message" | "tracking" | "analytics" | "timeline";

const TABS: { id: OpportunityTabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Aperçu", icon: LayoutDashboard },
  { id: "message", label: "Message IA", icon: Mail },
  { id: "tracking", label: "Liens & Tracking", icon: Link2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "timeline", label: "Timeline", icon: Calendar },
];

export default function OpportunityHeader({ opportunity }: { opportunity: OpportunityWithCompany }) {
  const pathname = usePathname();
  const status = opportunity.status as OpportunityStatus;
  const { bg, text, dot } = STATUS_STYLES[status];
  const companyInitial = opportunity.company?.name?.charAt(0).toUpperCase() ?? "O";
  const baseUrl = `/app/opportunities/${opportunity.slug}`;

  function getTabHref(id: OpportunityTabId) {
    return id === "overview" ? baseUrl : `${baseUrl}/${id}`;
  }

  function isTabActive(id: OpportunityTabId) {
    return id === "overview" ? pathname === baseUrl : pathname === `${baseUrl}/${id}`;
  }

  return (
    <div className="bg-white border-b border-slate-200">
      {/* TOP BAR : Breadcrumb & Links */}
      <div className="max-w-[1400px] mx-auto px-6 pt-6 pb-4">
        <Link
          href="/app/opportunities"
          className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-1 transition-transform" />
          Toutes les opportunités
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          {/* Opportunity Title & Company */}
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm shrink-0 text-white"
              style={{ backgroundColor: 'var(--brand-secondary, #6366F1)' }}
            >
              {companyInitial}
            </div>
            <div>
              <h1 className="text-2xl font-regular text-slate-900">
                {opportunity.name}
              </h1>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 mt-0.5">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-slate-700">{opportunity.company?.name ?? "—"}</span>
                {opportunity.company?.business_sector && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span>{opportunity.company.business_sector}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center">
            <span className={cn(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-bold border",
              bg, text,
              status === "won" ? "border-emerald-200" :
              status === "lost" ? "border-red-200" :
              "border-transparent"
            )}>
              <span className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
              {mapOpportunityStatusLabel[status]}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR : Navigation Tabs */}
      <div className="max-w-[1400px] mx-auto">
        <nav className="flex items-center gap-1 overflow-x-auto px-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = isTabActive(tab.id);

            return (
              <Link
                key={tab.id}
                href={getTabHref(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                  isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon
                  className="w-4 h-4"
                  style={isActive ? { color: 'var(--brand-secondary, #6366F1)' } : undefined}
                />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeOppTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                    style={{ backgroundColor: 'var(--brand-secondary, #6366F1)' }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
