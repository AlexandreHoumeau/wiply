import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";

// ── Colors & Theme ───────────────────────────────────────────────────────────
const BG = "#FAFAFA";
const SLATE_900 = "#0F172A";
const SLATE_700 = "#334155";
const SLATE_600 = "#475569";
const SLATE_500 = "#64748B";
const SLATE_400 = "#94A3B8";
const SLATE_200 = "#E2E8F0";
const SLATE_100 = "#F1F5F9";
const SLATE_50 = "#F8FAFC";
const WHITE = "#FFFFFF";

const EMERALD_500 = "#10B981";
const EMERALD_600 = "#059669";
const EMERALD_100 = "#D1FAE5";
const EMERALD_50 = "#ECFDF5";

const VIOLET_600 = "#7C3AED";
const VIOLET_50 = "#F5F3FF";
const BLUE_600 = "#2563EB";
const BLUE_50 = "#EFF6FF";

// ── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  MousePointerClick: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-1.2"/><path d="m21.8 8-2.9-1.2"/><path d="M23.8 16.4 17 20.2"/><path d="M11.4 7.1 16.5 12"/><path d="m11.4 7.1-3.6 8.3c-.3.7.5 1.4 1.2 1l3-1.6 3 5.4c.2.4.9.4 1.1 0l1.6-3.1"/><path d="m20.3 3.7-2 2"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Link2: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>,
  Globe: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Zap: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Monitor: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>,
  Smartphone: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>,
  Bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  CursorArrow: () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: "-4px", marginTop: "-4px" }}><path d="M5.5 3.21V20.8C5.5 21.43 6.22 21.78 6.72 21.4L11.23 17.65C11.45 17.47 11.73 17.37 12.02 17.37H18.73C19.38 17.37 19.72 16.59 19.27 16.14L6.59 2.76C6.15 2.3 5.5 2.62 5.5 3.21Z" fill="#0F172A" stroke="white" strokeWidth="1.5"/></svg>
};

const GlobalStyles = () => (
  <style>
    {`
      @keyframes ping {
        75%, 100% { transform: scale(2); opacity: 0; }
      }
      .animate-ping { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
    `}
  </style>
);

export function TrackingComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Canvas Setup ──
  const COMP_W = 700;
  const VIRTUAL_W = 1050;
  const VIRTUAL_H = 750;
  const SCALE = COMP_W / VIRTUAL_W;

  // ── Phase 1: Creation & Link Entry ──
  const managerEntry = spring({ frame, fps, config: { damping: 20, stiffness: 150 } });
  
  const inputExpand = interpolate(frame, [15, 25], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const inputHeight = inputExpand * 56;
  
  const CAMPAIGN_NAME = "Relance J+3";
  const typedChars = Math.floor(interpolate(frame, [25, 45], [0, CAMPAIGN_NAME.length], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }));
  const cursorBlink = frame >= 20 && frame < 55 ? (frame % 10 < 5 ? 1 : 0) : 0;
  const showTypingCursor = frame >= 20 && frame < 55;
  
  const isGenerating = frame >= 50;
  const isGenerated = frame >= 60;
  const inputCollapse = interpolate(frame, [60, 68], [1, 0], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const finalInputHeight = isGenerated ? inputHeight * inputCollapse : inputHeight;
  const finalInputOpacity = isGenerated ? interpolate(frame, [60, 65], [1, 0], { extrapolateRight: "clamp" }) : 1;

  const linkDropProgress = interpolate(frame, [65, 80], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const newLinkHeight = linkDropProgress * 84; 
  const newLinkOpacity = interpolate(frame, [65, 75], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // ── Phase 2: Slower, Centered Camera Zoom & PERFECT Mouse Glide ──
  const zoomIn = interpolate(frame, [80, 110], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const zoomOut = interpolate(frame, [130, 155], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const combinedZoomProgress = zoomIn - zoomOut;
  
  const currentZoom = interpolate(combinedZoomProgress, [0, 1], [1, 1.4]);
  const currentZoomX = interpolate(combinedZoomProgress, [0, 1], [0, -250]); 
  const currentZoomY = interpolate(combinedZoomProgress, [0, 1], [0, 70]); 
  
  // FIXED MATHEMATICAL COORDINATES: (762, 219) lands exactly on the copy button.
  const mouseSlide = interpolate(frame, [80, 110], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const mouseX = interpolate(mouseSlide, [0, 1], [1050, 740]);
  const mouseY = interpolate(mouseSlide, [0, 1], [650, 219]);
  const mouseOpacity = interpolate(frame, [80, 85, 125, 135], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  
  const cursorScale = interpolate(frame, [110, 112, 115], [1, 0.8, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const isCopied = frame >= 112;

  // ── Phase 3: Transition to Dashboard ──
  const sceneTransition = interpolate(frame, [130, 155], [0, 1], { easing: Easing.inOut(Easing.ease), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const managerExitY = sceneTransition * -50;
  const managerOpacity = 1 - sceneTransition;

  const analyticsEnterY = interpolate(sceneTransition, [0, 1], [50, 0]);
  const analyticsOpacity = sceneTransition;

  // ── Phase 4: Dashboard Animation & Live Update ──
  const chartDraw = interpolate(frame, [155, 180], [0, 1], { easing: Easing.out(Easing.ease), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  
  const feedDropProgress = interpolate(frame, [170, 185], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const feedHeight = feedDropProgress * 72;
  const feedHighlight = interpolate(frame, [170, 210], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  
  const currentClicks = frame >= 175 ? 125 : 124;
  const currentUnique = frame >= 175 ? 86 : 85;
  const statScale = interpolate(frame, [175, 178, 185], [1, 1.05, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const toastEntry = spring({ frame: Math.max(0, frame - 180), fps, config: { damping: 14, stiffness: 160 } });
  const toastX = interpolate(toastEntry, [0, 1], [400, 0]);

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
      <GlobalStyles />
      
      {/* ── SCALED WRAPPER WITH CENTERED CAMERA ZOOM ── */}
      <div 
        style={{ 
          width: VIRTUAL_W, 
          height: VIRTUAL_H, 
          transform: `scale(${SCALE * currentZoom}) translate(${currentZoomX}px, ${currentZoomY}px)`, 
          transformOrigin: "center center", 
          position: "absolute", 
          display: "flex", 
          alignItems: "flex-start", 
          justifyContent: "center", 
          paddingTop: 80 
        }}
      >
        
        {/* ── SCENE 1: LINKS MANAGER ───────────────────────────────────── */}
        {frame < 155 && (
          <div style={{ width: 800, opacity: managerOpacity * managerEntry, transform: `translateY(${(1 - managerEntry) * 30 + managerExitY}px)`, display: "flex", flexDirection: "column", position: "absolute" }}>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 20, borderBottom: `1px solid ${SLATE_200}` }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: SLATE_900 }}>Liens de tracking</div>
                <div style={{ fontSize: 14, color: SLATE_500, marginTop: 4 }}>Générez des liens uniques pour suivre l'engagement</div>
              </div>
              {frame < 15 && (
                <div style={{ background: SLATE_900, color: WHITE, padding: "8px 16px", borderRadius: 999, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, transform: `scale(${interpolate(frame, [10, 15], [1, 0.95], { extrapolateRight: "clamp" })})` }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Créer un lien
                </div>
              )}
            </div>

            <div style={{ height: finalInputHeight, opacity: finalInputOpacity, overflow: "hidden", marginTop: finalInputHeight > 0 ? 16 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", background: WHITE, border: `1px solid ${SLATE_200}`, borderRadius: 16, padding: "6px", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}>
                <div style={{ padding: "0 12px", color: SLATE_400 }}><Icons.Link2 /></div>
                <div style={{ flex: 1, fontSize: 14, color: typedChars > 0 ? SLATE_900 : SLATE_400, display: "flex", alignItems: "center" }}>
                  {typedChars > 0 ? CAMPAIGN_NAME.slice(0, typedChars) : "Nom de la campagne..."}
                  {showTypingCursor && <span style={{ width: 2, height: 16, background: SLATE_900, marginLeft: 2, opacity: cursorBlink }} />}
                </div>
                <div style={{ display: "flex", gap: 6, marginRight: 4 }}>
                  <div style={{ padding: "6px 12px", fontSize: 13, color: SLATE_500, fontWeight: 500 }}>Annuler</div>
                  <div style={{ background: SLATE_900, color: WHITE, padding: "6px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    {isGenerating && !isGenerated ? <span style={{ fontSize: 11 }}>⏳</span> : null}
                    Générer
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ height: newLinkHeight, opacity: newLinkOpacity, overflow: "hidden" }}>
                <div style={{ background: WHITE, border: `1px solid ${isCopied ? EMERALD_100 : SLATE_200}`, borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)", transition: "all 0.2s ease" }}>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: SLATE_50, border: `1px solid ${SLATE_100}`, color: SLATE_600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icons.MousePointerClick />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: SLATE_900 }}>Relance J+3</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <div style={{ position: "relative", display: "flex", height: 8, width: 8 }}>
                          <span className="animate-ping" style={{ position: "absolute", height: "100%", width: "100%", borderRadius: "50%", background: EMERALD_500, opacity: 0.75 }}></span>
                          <span style={{ position: "relative", height: 8, width: 8, borderRadius: "50%", background: EMERALD_500 }}></span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: EMERALD_600 }}>Actif</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", background: SLATE_50, border: `1px solid ${SLATE_100}`, borderRadius: 12, padding: "4px 4px 4px 16px", gap: 16 }}>
                      <span style={{ fontSize: 14, fontFamily: "monospace", color: SLATE_600 }}>wiply.fr/t/xyz123</span>
                      <div
                        style={{
                          width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                          background: isCopied ? EMERALD_100 : WHITE,
                          color: isCopied ? EMERALD_600 : SLATE_400,
                          border: `1px solid ${isCopied ? "transparent" : SLATE_200}`,
                          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
                        }}
                      >
                        {isCopied ? <Icons.Check /> : <Icons.Copy />}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: SLATE_400, textTransform: "uppercase", letterSpacing: 1 }}>Statut</span>
                      <div style={{ width: 44, height: 24, background: SLATE_900, borderRadius: 999, position: "relative" }}>
                        <div style={{ position: "absolute", right: 2, top: 2, width: 20, height: 20, background: WHITE, borderRadius: "50%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ background: `${SLATE_50}80`, border: `1px solid ${SLATE_200}60`, borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${SLATE_100}50`, border: `1px solid ${SLATE_200}50`, color: SLATE_400, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icons.MousePointerClick />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: SLATE_500 }}>Premier contact — Plaquette</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: SLATE_400, marginTop: 4 }}>Désactivé</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                  <div style={{ display: "flex", alignItems: "center", background: SLATE_50, border: `1px solid ${SLATE_100}`, borderRadius: 12, padding: "4px 4px 4px 16px", gap: 16, opacity: 0.6 }}>
                    <span style={{ fontSize: 14, fontFamily: "monospace", color: SLATE_400 }}>wiply.fr/t/old789</span>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: SLATE_400 }}><Icons.Copy /></div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: SLATE_400, textTransform: "uppercase", letterSpacing: 1 }}>Statut</span>
                    <div style={{ width: 44, height: 24, background: SLATE_200, borderRadius: 999, position: "relative" }}>
                      <div style={{ position: "absolute", left: 2, top: 2, width: 20, height: 20, background: WHITE, borderRadius: "50%", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.1)" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MOUSE CURSOR ── */}
        {frame >= 80 && frame <= 135 && (
          <div style={{ position: "absolute", left: mouseX, top: mouseY, transform: `scale(${cursorScale})`, opacity: mouseOpacity, transformOrigin: "top left", zIndex: 50 }}>
            <Icons.CursorArrow />
          </div>
        )}

        {/* ── SCENE 2: ANALYTICS DASHBOARD ──────────────────────────────── */}
        {frame >= 130 && (
          <div style={{ width: 960, opacity: analyticsOpacity, transform: `translateY(${analyticsEnterY}px)`, display: "flex", flexDirection: "column", gap: 24, position: "absolute" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {(
                [
                  { label: "Clics Totaux", val: currentClicks, icon: Icons.MousePointerClick, color: VIOLET_600, bg: VIOLET_50, pulse: true },
                  { label: "Visiteurs uniques", val: currentUnique, icon: Icons.Users, color: BLUE_600, bg: BLUE_50, pulse: true },
                  { label: "Liens Actifs", val: 2, icon: Icons.Link2, color: EMERALD_600, bg: EMERALD_50 },
                  { label: "Top Pays", val: "FR", icon: Icons.Globe, color: "#D97706", bg: "#FEF3C7" },
                ]
              ).map((stat, i) => (
                <div key={i} style={{ background: WHITE, border: `1px solid ${SLATE_200}`, borderRadius: 20, padding: 24, boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: SLATE_400, textTransform: "uppercase", letterSpacing: 1 }}>{stat.label}</div>
                    <div style={{ background: stat.bg, color: stat.color, padding: 6, borderRadius: 8 }}><stat.icon /></div>
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: SLATE_900, transform: stat.pulse ? `scale(${statScale})` : "none", transformOrigin: "left center" }}>
                    {stat.val}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
              
              <div style={{ background: WHITE, border: `1px solid ${SLATE_200}`, borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "24px 32px", borderBottom: `1px solid ${SLATE_100}`, background: `${SLATE_50}80` }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: SLATE_900 }}>Trafic dans le temps</div>
                  <div style={{ fontSize: 13, color: SLATE_500, marginTop: 4 }}>Évolution journalière · 7 derniers jours</div>
                </div>
                <div style={{ padding: "32px", flex: 1, position: "relative" }}>
                  <div style={{ position: "absolute", inset: "32px 32px 48px 32px", borderBottom: `1px dashed ${SLATE_200}`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div style={{ borderBottom: `1px dashed ${SLATE_200}`, width: "100%", height: 0 }}></div>
                    <div style={{ borderBottom: `1px dashed ${SLATE_200}`, width: "100%", height: 0 }}></div>
                    <div style={{ borderBottom: `1px dashed ${SLATE_200}`, width: "100%", height: 0 }}></div>
                  </div>
                  <svg width="100%" height="180" viewBox="0 0 500 150" preserveAspectRatio="none" style={{ position: "relative", zIndex: 10 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={VIOLET_600} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={VIOLET_600} stopOpacity="0" />
                      </linearGradient>
                      <clipPath id="reveal">
                        <rect x="0" y="0" width={`${chartDraw * 100}%`} height="100%" />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#reveal)">
                      <path d="M 0 140 C 50 140, 100 90, 150 110 C 250 150, 300 40, 400 60 C 450 70, 480 20, 500 30 L 500 150 L 0 150 Z" fill="url(#grad)" />
                      <path d="M 0 140 C 50 140, 100 90, 150 110 C 250 150, 300 40, 400 60 C 450 70, 480 20, 500 30" fill="none" stroke={VIOLET_600} strokeWidth="4" />
                      {chartDraw > 0.95 && <circle cx="500" cy="30" r="6" fill={VIOLET_600} stroke={WHITE} strokeWidth="3" />}
                    </g>
                  </svg>
                </div>
              </div>

              <div style={{ background: WHITE, border: `1px solid ${SLATE_200}`, borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "24px 32px", borderBottom: `1px solid ${SLATE_100}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: `${SLATE_50}80` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ padding: 8, background: EMERALD_50, color: EMERALD_600, borderRadius: 12, border: `1px solid ${EMERALD_100}` }}><Icons.Zap /></div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: SLATE_900 }}>Flux en direct</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 999, background: WHITE, border: `1px solid ${SLATE_200}` }}>
                    <div style={{ position: "relative", display: "flex", height: 8, width: 8 }}>
                      <span className="animate-ping" style={{ position: "absolute", height: "100%", width: "100%", borderRadius: "50%", background: EMERALD_500, opacity: 0.75 }}></span>
                      <span style={{ position: "relative", height: 8, width: 8, borderRadius: "50%", background: EMERALD_500 }}></span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: SLATE_600, textTransform: "uppercase", letterSpacing: 1 }}>Live</span>
                  </div>
                </div>
                
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ height: feedHeight, overflow: "hidden", background: `rgba(209, 250, 229, ${feedHighlight * 0.5})`, borderBottom: `1px solid ${SLATE_50}` }}>
                    <div style={{ padding: "16px 32px", display: "flex", alignItems: "center", gap: 16, height: 72, boxSizing: "border-box" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${SLATE_200}`, background: WHITE, display: "flex", alignItems: "center", justifyContent: "center", color: SLATE_400 }}>
                        <Icons.Smartphone />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 600, color: SLATE_700, background: SLATE_100, padding: "2px 6px", borderRadius: 4 }}>192.168.1.1</span>
                          <span style={{ fontSize: 13, color: SLATE_500 }}>🇫🇷 France</span>
                        </div>
                        <div style={{ fontSize: 12, color: SLATE_400, marginTop: 4 }}>iOS • Relance J+3</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: EMERALD_600, textTransform: "uppercase" }}>À l'instant</div>
                    </div>
                  </div>

                  {[
                    { ip: "91.170.x.x", country: "🇫🇷 France", device: Icons.Monitor, os: "Mac OS • Premier contact", time: "il y a 5 min" },
                    { ip: "82.112.x.x", country: "🇧🇪 Belgique", device: Icons.Monitor, os: "Windows • Portfolio", time: "il y a 2h" },
                    { ip: "176.15.x.x", country: "🇫🇷 France", device: Icons.Smartphone, os: "Android • Plaquette", time: "il y a 4h" },
                  ].map((row, i) => (
                    <div key={i} style={{ padding: "16px 32px", display: "flex", alignItems: "center", gap: 16, borderBottom: `1px solid ${SLATE_50}`, height: 72, boxSizing: "border-box" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${SLATE_200}`, background: WHITE, display: "flex", alignItems: "center", justifyContent: "center", color: SLATE_400 }}>
                        <row.device />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 600, color: SLATE_700, background: SLATE_100, padding: "2px 6px", borderRadius: 4 }}>{row.ip}</span>
                          <span style={{ fontSize: 13, color: SLATE_500 }}>{row.country}</span>
                        </div>
                        <div style={{ fontSize: 12, color: SLATE_400, marginTop: 4 }}>{row.os}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: SLATE_400, textTransform: "uppercase" }}>{row.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* ── TOAST NOTIFICATION ── */}
        {frame >= 170 && (
          <div style={{ position: "absolute", top: 32, right: 32, transform: `translateX(${toastX}px)`, background: WHITE, border: `1px solid ${SLATE_200}`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 16, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", zIndex: 100 }}>
            <div style={{ padding: 8, background: BLUE_50, color: BLUE_600, borderRadius: 10 }}>
              <Icons.Bell />
            </div>
            <div style={{ paddingRight: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: SLATE_900 }}>Nouveau clic !</div>
              <div style={{ fontSize: 13, color: SLATE_500, marginTop: 4 }}>Un prospect vient de cliquer sur <br/><strong style={{ color: SLATE_700 }}>Relance J+3</strong>.</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}