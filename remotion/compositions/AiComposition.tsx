import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";

// ── Colors & Theme ───────────────────────────────────────────────────────────
const SLATE_900 = "#0F172A";
const SLATE_600 = "#475569";
const SLATE_500 = "#64748B";
const SLATE_400 = "#94A3B8";
const SLATE_200 = "#E2E8F0";
const SLATE_100 = "#F1F5F9";
const SLATE_50 = "#F8FAFC";
const WHITE = "#FFFFFF";

const BLUE_700 = "#1D4ED8";
const BLUE_500 = "#3B82F6";
const BLUE_50 = "#EFF6FF";

const EMERALD_600 = "#059669";
const EMERALD_100 = "#D1FAE5";
const EMERALD_50 = "#ECFDF5";
// ── Generated Text ───────────────────────────────────────────────────────────
const SUBJECT_TEXT = "Votre stratégie d'acquisition – Retour sur notre échange";
const BODY_TEXT = `Bonjour Sophie,

Je fais suite à notre excellent échange concernant la refonte de votre pipeline commercial.
Comme discuté, l'automatisation via Wiply pourrait vous faire gagner jusqu'à 15h/semaine, avec un ROI mesurable dès le 1er mois grâce à notre dashboard.

Avez-vous pu aborder le sujet en interne ? Je reste à votre entière disposition pour une courte démo avec votre équipe.

Excellente journée,
Thomas`;

const CUSTOM_CONTEXT = "Mettre l'accent sur le ROI";

// ── Icons (Lucide mocks) ─────────────────────────────────────────────────────
const Icons = {
  Mail: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  Linkedin: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>,
  Phone: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Wand2: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>,
  CheckCircle2: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  Link2: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>,
  Loader2: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
};

export function AiComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Canvas Setup ──
  const COMP_W = 700;
  const VIRTUAL_W = 1050;
  const VIRTUAL_H = 750;
  const SCALE = COMP_W / VIRTUAL_W;

  // ── Animations ──
  const compEntry = spring({ frame, fps, config: { damping: 20, stiffness: 150 } });
  
  // Custom Context Typing
  const contextProgress = interpolate(frame, [30, 45], [0, CUSTOM_CONTEXT.length], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const contextChars = Math.floor(contextProgress);
  const contextCursor = frame >= 25 && frame <= 50 ? (frame % 10 < 5 ? 1 : 0) : 0;

  // Generate Button Click
  const btnClickScale = spring({ frame: Math.max(0, frame - 50), fps, config: { damping: 12, stiffness: 300 } });
  const generateBtnScale = interpolate(btnClickScale, [0, 0.5, 1], [1, 0.95, 1]);
  
  const isGenerating = frame >= 50 && frame < 70;
  const hasGenerated = frame >= 70;

  const spinnerRotation = frame * 10;

  // Typing
  const subjectProgress = Math.floor(interpolate(frame, [70, 90], [0, SUBJECT_TEXT.length], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }));
  const subjectCursor = frame >= 70 && frame < 90 ? (frame % 8 < 4 ? 1 : 0) : 0;

  const bodyProgress = Math.floor(interpolate(frame, [95, 190], [0, BODY_TEXT.length], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }));
  const bodyCursor = frame >= 95 && frame < 195 ? (frame % 8 < 4 ? 1 : 0) : 0;

  // Bottom buttons
  const savedOpacity = interpolate(frame, [190, 195], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
      
      {/* ── SCALED WRAPPER ── */}
      <div 
        style={{ 
          width: VIRTUAL_W, 
          height: VIRTUAL_H, 
          transform: `scale(${SCALE}) translateY(${(1 - compEntry) * 40}px)`, 
          opacity: compEntry,
          transformOrigin: "center center", 
          position: "absolute", 
          display: "flex", 
          flexDirection: "column",
          gap: 14, // Tighter gap
          padding: "32px 48px" // Reduced wrapper padding
        }}
      >
        
        {/* ── STAGE PICKER ── */}
        <div style={{ background: WHITE, borderRadius: 16, border: `1px solid ${SLATE_200}`, padding: "12px 16px", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: SLATE_400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Message pour le statut</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["À faire", "Premier contact", "Proposition", "Gagné"].map((stage, i) => {
              const isSelected = i === 1;
              return (
                <div key={i} style={{ 
                  display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: `1px solid ${isSelected ? "transparent" : SLATE_200}`,
                  background: isSelected ? "#6366F1" : SLATE_50, color: isSelected ? WHITE : SLATE_600, boxShadow: isSelected ? "0 1px 2px 0 rgb(0 0 0 / 0.05)" : "none"
                }}>
                  {stage}
                  {i === 1 && <span style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(255,255,255,0.25)", color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>1</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CONFIG TOOLBAR ── */}
        <div style={{ background: WHITE, borderRadius: 16, border: `1px solid ${SLATE_200}`, padding: "14px 16px", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: BLUE_50, border: `1px solid ${BLUE_500}`, color: BLUE_700 }}><Icons.Mail /> Email</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: WHITE, border: `1px solid ${SLATE_200}`, color: SLATE_600 }}><Icons.Linkedin /> LinkedIn</div>
            </div>

            <div style={{ width: 1, height: 20, background: SLATE_200 }} />

            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: WHITE, border: `1px solid ${SLATE_200}`, color: SLATE_600 }}>Formel</div>
              <div style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: BLUE_50, border: `1px solid ${BLUE_500}`, color: BLUE_700 }}>Aimable</div>
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ background: SLATE_900, color: WHITE, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, transform: `scale(${generateBtnScale})` }}>
              {isGenerating ? <><div style={{ transform: `rotate(${spinnerRotation}deg)` }}><Icons.Loader2 /></div> Génération...</> : <><Icons.Wand2 /> Générer</>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1, border: `1px solid ${contextChars > 0 ? BLUE_500 : SLATE_200}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, color: contextChars > 0 ? SLATE_900 : SLATE_400, display: "flex", alignItems: "center", boxShadow: contextChars > 0 ? `0 0 0 2px ${BLUE_500}22` : "none" }}>
              {contextChars > 0 ? CUSTOM_CONTEXT.slice(0, contextChars) : "Contexte additionnel pour « Premier contact » (optionnel)..."}
              {contextCursor === 1 && <span style={{ width: 2, height: 14, background: SLATE_900, marginLeft: 2 }} />}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: EMERALD_50, border: `1px solid ${EMERALD_100}`, color: EMERALD_600, padding: "0 12px", borderRadius: 8, fontSize: 12, fontWeight: 500 }}>
              <Icons.Link2 /> Tracking inclus
            </div>
          </div>
        </div>

        {/* ── GENERATED MESSAGE PANEL ── */}
        <div style={{ flex: 1, minHeight: 0, background: WHITE, borderRadius: 16, border: `1px solid ${SLATE_200}`, display: "flex", flexDirection: "column", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${SLATE_100}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: EMERALD_50, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: EMERALD_600 }}>
                <Icons.CheckCircle2 />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: SLATE_900 }}>Message — Premier contact</div>
                <div style={{ fontSize: 12, color: SLATE_500 }}>
                  {isGenerating ? "Génération en cours..." : hasGenerated ? "Modifiez et envoyez" : "En attente de génération"}
                </div>
              </div>
            </div>
            {hasGenerated && (
              <div style={{ opacity: savedOpacity, display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", border: `1px solid ${SLATE_200}`, borderRadius: 6, fontSize: 12, fontWeight: 500, color: SLATE_600 }}>
                <Icons.Copy /> Copier
              </div>
            )}
          </div>

          <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", minHeight: 0 }}>
            {isGenerating && !hasGenerated ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: SLATE_400 }}>
                <div style={{ transform: `rotate(${spinnerRotation}deg) scale(1.5)` }}><Icons.Loader2 /></div>
                <div style={{ fontSize: 14 }}>Génération du message...</div>
              </div>
            ) : !hasGenerated ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: SLATE_400 }}>
                <div style={{ width: 48, height: 48, background: SLATE_50, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icons.Wand2 />
                </div>
                <div style={{ fontSize: 14 }}>Aucun message pour « Premier contact » — cliquez sur Générer</div>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: SLATE_500, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Sujet</div>
                  <div style={{ border: `1px solid ${SLATE_200}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 500, color: SLATE_900, display: "flex", alignItems: "center" }}>
                    {SUBJECT_TEXT.slice(0, subjectProgress)}
                    {subjectCursor === 1 && <span style={{ width: 2, height: 16, background: SLATE_900, marginLeft: 2 }} />}
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: SLATE_500, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Message</div>
                  <div style={{ flex: 1, border: `1px solid ${SLATE_200}`, borderRadius: 8, padding: "12px", fontSize: 13, color: SLATE_900, lineHeight: 1.5, whiteSpace: "pre-wrap", overflow: "hidden" }}>
                    {BODY_TEXT.slice(0, bodyProgress)}
                    {bodyCursor === 1 && <span style={{ width: 2, height: 14, background: SLATE_900, marginLeft: 2, display: "inline-block", verticalAlign: "middle" }} />}
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${SLATE_100}`, paddingTop: 12, display: "flex", alignItems: "center", gap: 10, opacity: savedOpacity, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${SLATE_200}`, borderRadius: 6, fontSize: 12, fontWeight: 500, color: SLATE_600 }}>
                    <Icons.Wand2 /> Régénérer
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${SLATE_200}`, borderRadius: 6, fontSize: 12, fontWeight: 500, color: SLATE_600 }}>
                    <Icons.Copy /> Copier
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${EMERALD_100}`, background: EMERALD_50, borderRadius: 6, fontSize: 12, fontWeight: 500, color: EMERALD_600 }}>
                    <Icons.CheckCircle2 /> Sauvegardé
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
