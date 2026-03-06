"use client";

import { updateAIConfigAction } from "@/actions/ai.server";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AgencyAiConfig } from "@/lib/validators/ai";
import { cn } from "@/lib/utils";
import {
  Brain,
  Check,
  CheckCircle2,
  Coffee,
  Loader2,
  Pencil,
  Shield,
  Smile,
  Sparkles,
  UserCircle,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

const TONE_OPTIONS = [
  { label: "Professionnel", value: "professional", icon: Shield, theme: "blue" },
  { label: "Convivial", value: "friendly", icon: Smile, theme: "emerald" },
  { label: "Formel", value: "formal", icon: UserCircle, theme: "indigo" },
  { label: "Décontracté", value: "casual", icon: Coffee, theme: "amber" },
];

export function AgencyAICard({ ai }: { ai: AgencyAiConfig | null }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTone, setSelectedTone] = useState(ai?.tone ?? "professional");
  const [state, formAction, isPending] = useActionState(updateAIConfigAction, null);

  const isConfigured = !!(ai?.ai_context || ai?.key_points);
  const toneData = TONE_OPTIONS.find((t) => t.value === (ai?.tone ?? "professional"));

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message ?? "Configuration IA enregistrée");
      setIsEditing(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="group overflow-hidden rounded-2xl border bg-white transition-all duration-300">
      <div className="flex items-center justify-between border-b border-slate-100/80 px-7 py-5 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-2 text-indigo-600 border border-slate-200/50 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/10" />
            <Brain className="h-4 w-4 relative z-10" />
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Agent IA</h2>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Configuré
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                À configurer
              </span>
            )}
          </div>
        </div>
        {isEditing ? (
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Annuler
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> {isConfigured ? "Modifier" : "Configurer"}
          </button>
        )}
      </div>

      {isEditing ? (
        <form action={formAction} className="space-y-6 p-7">
          {/* Context */}
          <div className="space-y-2">
            <Label htmlFor="context" className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Contexte de l'agence
            </Label>
            <Textarea
              id="context"
              name="context"
              defaultValue={ai?.ai_context ?? ""}
              placeholder="Ex: Agence spécialisée dans le résidentiel haut de gamme à Paris..."
              className="min-h-[100px] resize-none border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-slate-900 focus:ring-slate-900 transition-all shadow-sm"
              disabled={isPending}
            />
          </div>

          {/* Key points */}
          <div className="space-y-2">
            <Label htmlFor="keyPoints" className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Arguments clés (un par ligne)
            </Label>
            <Textarea
              id="keyPoints"
              name="keyPoints"
              defaultValue={ai?.key_points ?? ""}
              placeholder={"- Disponibilité 7j/7\n- Visites virtuelles 3D\n- Honoraires réduits"}
              className="min-h-[100px] resize-none border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-slate-900 focus:ring-slate-900 transition-all shadow-sm"
              disabled={isPending}
            />
          </div>

          {/* Tone */}
          <div className="space-y-3">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Style de communication
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {TONE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = selectedTone === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedTone(option.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200",
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-md"
                        : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn("rounded-lg p-2", active ? "bg-white/10" : "bg-white border border-slate-100 shadow-sm")}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="tone" value={selectedTone} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
              className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="transition-all"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6 p-7">
          {toneData && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Style de communication
              </p>
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                <toneData.icon className="h-4 w-4 text-slate-500" />
                {toneData.label}
              </div>
            </div>
          )}

          {ai?.ai_context ? (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Contexte de l'agence
              </p>
              <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 shadow-sm">
                {ai.ai_context}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
                <Sparkles className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900">IA non configurée</p>
              <p className="mt-1 text-xs text-slate-500 max-w-[200px]">
                Personnalisez votre agent pour qu'il reflète l'identité de l'agence.
              </p>
            </div>
          )}

          {ai?.key_points && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Arguments clés
              </p>
              <div className="flex flex-wrap gap-2">
                {ai.key_points
                  .split("\n")
                  .filter(Boolean)
                  .map((point, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                    >
                      {point.replace(/^[-•*]\s*/, "")}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}