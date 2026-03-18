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
    <div className="group overflow-hidden rounded-2xl border bg-card transition-all duration-300">
      <div className="flex items-center justify-between border-b border-border/80 px-7 py-5 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card p-2 text-indigo-600 border border-border/50 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/10" />
            <Brain className="h-4 w-4 relative z-10" />
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="card-title">Agent IA</h2>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Configuré
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                À configurer
              </span>
            )}
          </div>
        </div>
        {isEditing ? (
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Annuler
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> {isConfigured ? "Modifier" : "Configurer"}
          </button>
        )}
      </div>

      {isEditing ? (
        <form action={formAction} className="space-y-6 p-7">
          {/* Context */}
          <div className="space-y-2">
            <Label htmlFor="context" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Contexte de l'agence
            </Label>
            <Textarea
              id="context"
              name="context"
              defaultValue={ai?.ai_context ?? ""}
              placeholder="Ex: Agence spécialisée dans le résidentiel haut de gamme à Paris..."
              className="min-h-[100px] resize-none border-border bg-muted/50 text-sm focus:bg-card focus:border-foreground focus:ring-foreground transition-all shadow-sm"
              disabled={isPending}
            />
          </div>

          {/* Key points */}
          <div className="space-y-2">
            <Label htmlFor="keyPoints" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Arguments clés (un par ligne)
            </Label>
            <Textarea
              id="keyPoints"
              name="keyPoints"
              defaultValue={ai?.key_points ?? ""}
              placeholder={"- Disponibilité 7j/7\n- Visites virtuelles 3D\n- Honoraires réduits"}
              className="min-h-[100px] resize-none border-border bg-muted/50 text-sm focus:bg-card focus:border-foreground focus:ring-foreground transition-all shadow-sm"
              disabled={isPending}
            />
          </div>

          {/* Tone */}
          <div className="space-y-3">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                        ? "border-foreground bg-foreground text-background shadow-md"
                        : "border-border bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted"
                    )}
                  >
                    <div className={cn("rounded-lg p-2", active ? "bg-background/10" : "bg-card border border-border shadow-sm")}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="tone" value={selectedTone} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
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
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Style de communication
              </p>
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
                <toneData.icon className="h-4 w-4 text-muted-foreground" />
                {toneData.label}
              </div>
            </div>
          )}

          {ai?.ai_context ? (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Contexte de l'agence
              </p>
              <p className="rounded-xl border border-border bg-muted p-4 text-sm leading-relaxed text-foreground/80 shadow-sm">
                {ai.ai_context}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center rounded-xl border border-dashed border-border bg-muted/50">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm border border-border">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">IA non configurée</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
                Personnalisez votre agent pour qu'il reflète l'identité de l'agence.
              </p>
            </div>
          )}

          {ai?.key_points && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Arguments clés
              </p>
              <div className="flex flex-wrap gap-2">
                {ai.key_points
                  .split("\n")
                  .filter(Boolean)
                  .map((point, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm"
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
