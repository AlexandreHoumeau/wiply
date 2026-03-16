import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";

// ── Colors & Theme ───────────────────────────────────────────────────────────
const SLATE_900 = "#0F172A";
const SLATE_700 = "#334155";
const SLATE_500 = "#64748B";
const SLATE_400 = "#94A3B8";
const SLATE_300 = "#CBD5E1";
const SLATE_200 = "#E2E8F0";
const SLATE_100 = "#F1F5F9";
const SLATE_50 = "#F8FAFC";
const WHITE = "#FFFFFF";

const PRIMARY = "#0F172A";
const SECONDARY = "#6366F1";
const GRADIENT_TEXT = `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`;
const GRADIENT_BAR = `linear-gradient(to right, ${PRIMARY}, ${SECONDARY})`;

const EMERALD_600 = "#059669";
const EMERALD_100 = "#D1FAE5";
const EMERALD_50 = "#ECFDF5";

// ── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  Shield: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>,
  Check: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  CheckCircle2: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>,
  ImageIcon: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  FileType2: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/></svg>,
  UploadCloud: () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>,
  FileSvg: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="#6366F1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><line x1="10" y1="17" x2="14" y2="13"/><circle cx="14" cy="17" r="2"/></svg>,
  CursorArrow: () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: "-4px", marginTop: "-4px" }}><path d="M5.5 3.21V20.8C5.5 21.43 6.22 21.78 6.72 21.4L11.23 17.65C11.45 17.47 11.73 17.37 12.02 17.37H18.73C19.38 17.37 19.72 16.59 19.27 16.14L6.59 2.76C6.15 2.3 5.5 2.62 5.5 3.21Z" fill="#0F172A" stroke="white" strokeWidth="1.5"/></svg>,
  Loader: ({ frame }: { frame: number }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${frame * 12}deg)` }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
};

const GlobalStyles = () => (
  <style>
    {`
      @keyframes gradient-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .bg-animated {
        background: linear-gradient(-45deg, #e0e7ff, #f3e8ff, #ede9fe, #dbeafe);
        background-size: 400% 400%;
        animation: gradient-shift 15s ease infinite;
      }
    `}
  </style>
);

export function PortailComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Canvas Setup ──
  const COMP_W = 700;
  const VIRTUAL_W = 1600; // Massive canvas for desktop illusion
  const VIRTUAL_H = 1100;
  const SCALE = COMP_W / VIRTUAL_W; 

  // ── 1. Cinematic Browser Entrance (0 to 40) ──
  const entrance = interpolate(frame, [0, 40], [0, 1], { easing: Easing.bezier(0.25, 1, 0.5, 1), extrapolateRight: "clamp" });
  const browserScale = interpolate(entrance, [0, 1], [0.85, 1]);
  const browserY = interpolate(entrance, [0, 1], [100, 0]);
  const browserRotateX = interpolate(entrance, [0, 1], [5, 0]);

  // ── 2. Initial Progress & UI Fade (40 to 80) ──
  const uiFade = interpolate(frame, [40, 70], [0, 1], { easing: Easing.out(Easing.ease), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const initialProgress = interpolate(frame, [50, 80], [0, 50], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  
  // ── 3. Scroll Down to Checklist (90 to 140) ──
  const scrollDown = interpolate(frame, [90, 140], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const scrollY = interpolate(scrollDown, [0, 1], [0, -420]); // Increased scroll distance

  // ── 4. Drag and Drop Choreography (140 to 220) ──
  const isDragging = frame >= 170 && frame < 220;
  const hasDropped = frame >= 220;

  let mouseX = 1800; let mouseY = 1200;
  let fileX = 1400; let fileY = 600;
  let cursorScale = 1;

  if (frame >= 140 && frame < 170) {
    const move = interpolate(frame, [140, 170], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = interpolate(move, [0, 1], [1800, 1400]);
    mouseY = interpolate(move, [0, 1], [1200, 600]);
  } else if (isDragging) {
    cursorScale = 0.9; 
    const drag = interpolate(frame, [170, 215], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = interpolate(drag, [0, 1], [1400, 800]); 
    mouseY = interpolate(drag, [0, 1], [600, 740]);
    fileX = mouseX; fileY = mouseY;
  } else if (hasDropped) {
    const exit = interpolate(frame, [220, 260], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = interpolate(exit, [0, 1], [800, 1800]);
    mouseY = interpolate(exit, [0, 1], [740, 1200]);
  }

  const dropzoneHover = isDragging && mouseX < 1100;
  
  // ── 5. Uploading & Done State (220 to 280) ──
  const fileDropScale = hasDropped ? interpolate(frame, [220, 230], [1, 0], { extrapolateRight: "clamp" }) : 1;
  const uploadProgress = interpolate(frame, [230, 270], [0, 100], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const isUploadComplete = frame >= 270;

  const collapseAnim = interpolate(frame, [275, 295], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const dynamicBoxHeight = interpolate(collapseAnim, [0, 1], [280, 104]);

  // ── 6. Scroll Back & 100% Celebration (310 to 400) ──
  const scrollUp = interpolate(frame, [310, 360], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const finalScrollY = scrollY + interpolate(scrollUp, [0, 1], [0, 420]); // Matched return scroll distance

  const finalProgress = interpolate(frame, [370, 410], [0, 50], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const totalProgress = initialProgress + finalProgress;
  const completedItems = totalProgress === 100 ? 2 : 1;

  const popScale = interpolate(frame, [410, 415, 425], [1, 1.05, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
      <GlobalStyles />
      
      <div 
        style={{ 
          width: VIRTUAL_W,
          height: VIRTUAL_H,
          transform: `scale(${SCALE})`, 
          transformOrigin: "center center", 
          position: "absolute", 
          display: "flex", 
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        
        <div style={{
          width: 1100,
          background: "white",
          height: 850,
          borderRadius: 24,
          boxShadow: "0 30px 60px -12px rgba(0,0,0,0.25), 0 18px 36px -18px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transform: `scale(${browserScale}) translateY(${browserY}px) perspective(1000px) rotateX(${browserRotateX}deg)`,
          opacity: entrance
        }}>
          
          {/* Browser Top Bar */}
          <div style={{ height: 48, background: WHITE, borderBottom: `1px solid ${SLATE_200}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 8, zIndex: 200, flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F56" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27C93F" }} />
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div style={{ background: SLATE_100, borderRadius: 8, padding: "6px 120px", fontSize: 13, color: SLATE_400, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Shield /> wiply.fr/portal/agence-martin
              </div>
            </div>
          </div>

          {/* Portal Header */}
          <div style={{ height: 72, background: "rgba(255,255,255,0.9)", borderBottom: `1px solid ${SLATE_200}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", flexShrink: 0, zIndex: 100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: PRIMARY, color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>A</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: SLATE_900 }}>Agence Martin</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: `${PRIMARY}10`, color: PRIMARY, fontSize: 13, fontWeight: 600 }}>
              <Icons.Shield /> Espace Client
            </div>
          </div>
          <div style={{ height: 3, background: GRADIENT_BAR, flexShrink: 0, zIndex: 100 }} />

          {/* ── SCROLLING VIEWPORT ── */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <div style={{ width: "100%", padding: "48px 0 240px 0", display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${finalScrollY}px)` }}>
              
              <div style={{ width: "100%", maxWidth: 800, display: "flex", flexDirection: "column", gap: 40, opacity: uiFade }}>
                
                {/* Hero */}
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 42, fontWeight: 500, color: SLATE_900, letterSpacing: "-0.02em" }}>
                    Bonjour, <span style={{ background: GRADIENT_TEXT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>Studio Pixel</span> 👋
                  </div>
                  <div style={{ fontSize: 18, color: SLATE_500, lineHeight: 1.6 }}>
                    Bienvenue sur votre espace de suivi. Voici les avancées de votre projet.
                  </div>
                </div>

                {/* Progress Card */}
                <div style={{ background: WHITE, borderRadius: 24, padding: 32, border: `1px solid ${SLATE_200}`, boxShadow: "0 8px 30px rgb(0 0 0 / 0.04)", transform: `scale(${popScale})` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: SLATE_900 }}>Progression des contenus</div>
                      <div style={{ fontSize: 14, color: SLATE_500, marginTop: 4 }}>Éléments fournis à l'agence</div>
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: totalProgress === 100 ? EMERALD_600 : PRIMARY }}>{Math.round(totalProgress)}%</div>
                  </div>
                  <div style={{ height: 14, background: SLATE_100, borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${totalProgress}%`, background: totalProgress === 100 ? EMERALD_600 : GRADIENT_BAR, borderRadius: 999 }} />
                  </div>
                  <div style={{ textAlign: "right", fontSize: 13, color: SLATE_400, marginTop: 12, fontWeight: 600 }}>
                    {completedItems} / 2 éléments fournis
                  </div>
                </div>

                {/* Checklist */}
                <div style={{ borderTop: `1px solid ${SLATE_200}`, paddingTop: 40, display: "flex", flexDirection: "column", gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: SLATE_900 }}>À vous de jouer</div>
                    <div style={{ fontSize: 16, color: SLATE_500, marginTop: 6 }}>Les éléments dont nous avons besoin pour avancer.</div>
                  </div>

                  {/* Task 1: Done */}
                  <div style={{ background: SLATE_50, borderRadius: 24, padding: 32, border: `1px solid ${SLATE_200}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: EMERALD_100, color: EMERALD_600, display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.Check /></div>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: SLATE_500, textDecoration: "line-through" }}>Contenu de la page À propos</div>
                        <div style={{ fontSize: 14, color: SLATE_500, marginTop: 4 }}>Texte de présentation de l'équipe.</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, background: WHITE, borderRadius: 16, padding: 16, border: `1px solid ${SLATE_200}` }}>
                      <div style={{ width: 40, height: 40, background: SLATE_50, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: SLATE_400 }}><Icons.FileType2 /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: SLATE_400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Fourni par vous</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: SLATE_700 }}>"Studio Pixel est une agence créative..."</div>
                      </div>
                    </div>
                  </div>

                  {/* Task 2: Upload Zone -> Done */}
                  <div style={{ height: dynamicBoxHeight, overflow: "hidden", background: isUploadComplete ? SLATE_50 : WHITE, borderRadius: 24, border: `1px solid ${isUploadComplete ? SLATE_200 : SLATE_300}`, boxShadow: isUploadComplete ? "none" : "0 20px 25px -5px rgb(0 0 0 / 0.05)" }}>
                    <div style={{ padding: 32 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: isUploadComplete ? EMERALD_100 : `${PRIMARY}10`, color: isUploadComplete ? EMERALD_600 : PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isUploadComplete ? <Icons.Check /> : <Icons.ImageIcon />}
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: isUploadComplete ? SLATE_500 : SLATE_900, textDecoration: isUploadComplete ? "line-through" : "none" }}>Logo vectoriel</div>
                          <div style={{ fontSize: 14, color: SLATE_500, marginTop: 4 }}>Format SVG transparent uniquement.</div>
                        </div>
                      </div>

                      {!isUploadComplete ? (
                        <div style={{ border: `2px dashed ${dropzoneHover ? SECONDARY : SLATE_300}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: dropzoneHover ? `${SECONDARY}08` : SLATE_50, transition: "all 0.2s" }}>
                          {uploadProgress > 0 ? (
                            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, color: SLATE_700, fontWeight: 600 }}>
                                <div><Icons.Loader frame={frame} /></div> Envoi en cours...
                              </div>
                              <div style={{ width: "80%", height: 8, background: SLATE_200, borderRadius: 999, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${uploadProgress}%`, background: SECONDARY, borderRadius: 999 }} />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ width: 48, height: 48, background: WHITE, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: dropzoneHover ? SECONDARY : SLATE_400, boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}>
                                <Icons.UploadCloud />
                              </div>
                              <div style={{ fontSize: 16, fontWeight: 600, color: dropzoneHover ? SECONDARY : SLATE_700 }}>Glissez-déposez votre fichier ici</div>
                              <div style={{ fontSize: 13, color: SLATE_400 }}>SVG (Max 5Mo)</div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 16, background: WHITE, borderRadius: 16, padding: 16, border: `1px solid ${SLATE_200}` }}>
                          <div style={{ width: 40, height: 40, background: SLATE_50, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: SLATE_400 }}><Icons.UploadCloud /></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: SLATE_400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Fourni par vous</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: SLATE_400 }}>logo_studio_pixel.svg (Voir le fichier)</div>
                          </div>
                          <div style={{ color: EMERALD_600 }}><Icons.CheckCircle2 /></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── DRAGGED FILE (Floats above the browser) ── */}
        {(isDragging || hasDropped) && fileDropScale > 0 && (
          <div style={{ position: "absolute", left: fileX - 30, top: fileY - 30, transform: `scale(${fileDropScale})`, zIndex: 300, pointerEvents: "none" }}>
            <div style={{ background: WHITE, padding: 12, borderRadius: 16, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)", border: `1px solid ${SLATE_200}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Icons.FileSvg />
              <span style={{ fontSize: 10, fontWeight: 700, color: SLATE_700 }}>logo.svg</span>
            </div>
          </div>
        )}

        {/* ── MOUSE CURSOR ── */}
        {frame >= 140 && (
          <div style={{ position: "absolute", left: mouseX, top: mouseY, transform: `scale(${cursorScale})`, transformOrigin: "top left", zIndex: 400 }}>
            <Icons.CursorArrow />
          </div>
        )}

      </div>
    </div>
  );
}