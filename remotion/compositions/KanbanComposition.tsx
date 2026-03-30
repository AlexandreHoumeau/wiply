import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";

// ── Colors & Theme ───────────────────────────────────────────────────────────
const SLATE_900 = "#0F172A";
const SLATE_800 = "#1E293B";
const SLATE_700 = "#334155";
const SLATE_600 = "#475569";
const SLATE_500 = "#64748B";
const SLATE_400 = "#94A3B8";
const SLATE_300 = "#CBD5E1";
const SLATE_200 = "#E2E8F0";
const SLATE_100 = "#F1F5F9";
const SLATE_50 = "#F8FAFC";
const WHITE = "#FFFFFF";

const BLUE_600 = "#2563EB";
const BLUE_100 = "#DBEAFE";
const BLUE_50 = "#EFF6FF";

const EMERALD_600 = "#059669";
const EMERALD_100 = "#D1FAE5";
const PURPLE_600 = "#9333EA";
const PURPLE_50 = "#FAF5FF";

const ORANGE_600 = "#EA580C";
const ORANGE_100 = "#FFEDD5";
const RED_600 = "#DC2626";
const RED_100 = "#FEE2E2";
const RED_50 = "#FEF2F2";

// ── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  AlignLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></svg>,
  LayoutTemplate: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/></svg>,
  Bug: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c-2 2.1-3.6 3.8-5.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>,
  ArrowUp: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>,
  Equal: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" x2="19" y1="9" y2="9"/><line x1="5" x2="19" y1="15" y2="15"/></svg>,
  MessageSquare: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Inbox: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  UserRound: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>,
  CursorArrow: () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: "-4px", marginTop: "-4px" }}><path d="M5.5 3.21V20.8C5.5 21.43 6.22 21.78 6.72 21.4L11.23 17.65C11.45 17.47 11.73 17.37 12.02 17.37H18.73C19.38 17.37 19.72 16.59 19.27 16.14L6.59 2.76C6.15 2.3 5.5 2.62 5.5 3.21Z" fill="#0F172A" stroke="white" strokeWidth="1.5"/></svg>
};

type CompositionTaskCard = {
  id: string;
  title: string;
  description?: string;
  type: "feature" | "design" | "bug" | "setup" | "content";
  priority: "medium" | "high" | "urgent";
  comments: number;
  assignee?: string;
};

// ── Components ───────────────────────────────────────────────────────────────
function TaskCard({ id, title, description, type, priority, comments, assignee }: CompositionTaskCard) {
  return (
    <div style={{ padding: 20, borderRadius: 16, background: WHITE, border: `1px solid ${SLATE_200}`, boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: SLATE_400, textTransform: "uppercase", letterSpacing: 1 }}>{id}</span>
        {type === "feature" && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: BLUE_50, color: BLUE_600 }}><Icons.AlignLeft /> Feature</div>}
        {type === "design" && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: PURPLE_50, color: PURPLE_600 }}><Icons.LayoutTemplate /> Design</div>}
        {type === "bug" && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: RED_50, color: RED_600 }}><Icons.Bug /> Bug</div>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: SLATE_900, lineHeight: 1.3, marginBottom: 8 }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: SLATE_400, lineHeight: 1.5, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{description}</div>}
      
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: `1px solid ${SLATE_50}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {priority === "medium" ? <div style={{ color: SLATE_500 }}><Icons.Equal /></div> : priority === "high" ? <div style={{ color: ORANGE_600 }}><Icons.ArrowUp /></div> : <div style={{ color: RED_600 }}><Icons.ArrowUp /></div>}
          <span style={{ fontSize: 12, fontWeight: 600, color: SLATE_400, textTransform: "capitalize" }}>{priority === "high" ? "Haute" : priority === "medium" ? "Moyenne" : "Urgente"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {comments > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6, color: SLATE_400 }}><Icons.MessageSquare /> <span style={{ fontSize: 12, fontWeight: 700 }}>{comments}</span></div>}
          {assignee ? (
            <div style={{ height: 28, width: 28, borderRadius: "50%", background: "#6366F1", color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, border: `2px solid ${WHITE}`, boxShadow: "0 0 0 1px #E2E8F0" }}>{assignee}</div>
          ) : (
            <div style={{ height: 28, width: 28, borderRadius: "50%", border: `2px dashed ${SLATE_300}`, display: "flex", alignItems: "center", justifyContent: "center", color: SLATE_400, fontSize: 16 }}>+</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function KanbanComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Canvas Setup ──
  const COMP_W = 700;
  const VIRTUAL_W = 1400; 
  const VIRTUAL_H = 1000;
  const SCALE = COMP_W / VIRTUAL_W;

  // ── State Drivers ──
  const boardEntry = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const slideOverOpen = interpolate(frame, [45, 75], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const slideOverClose = interpolate(frame, [290, 320], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const slideOverProgress = slideOverOpen - slideOverClose;
  const slideOverX = interpolate(slideOverProgress, [0, 1], [800, 0]);

  const TITLE = "Erreur 500 sur le checkout";
  const typedTitleChars = Math.floor(interpolate(frame, [80, 110], [0, TITLE.length], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }));
  const isTypingTitle = frame >= 80 && frame <= 115;

  const DESC = "Un client m'a signalé une erreur lors de la validation du panier. Urgent à corriger.";
  const typedDescChars = Math.floor(interpolate(frame, [115, 145], [0, DESC.length], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }));
  const isTypingDesc = frame >= 115 && frame <= 150;

  // Dropdown states
  const isTypeDropdownOpen = frame >= 175 && frame < 200;
  const selectedType = frame >= 200 ? "bug" : "feature";
  
  const isAssignDropdownOpen = frame >= 230 && frame < 255;
  const isAssigned = frame >= 255;

  const createBtnClick = spring({ frame: Math.max(0, frame - 285), fps, config: { damping: 12, stiffness: 400 } });
  const createBtnScale = interpolate(createBtnClick, [0, 0.5, 1], [1, 0.95, 1]);

  const newCardDrop = interpolate(frame, [320, 335], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const newCardHeight = newCardDrop * 196; 
  const newCardOpacity = interpolate(frame, [320, 330], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const isDragging = frame >= 380 && frame < 425;
  const hasDropped = frame >= 425;

  const dropGapOpen = interpolate(frame, [380, 400], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const dropGapHeight = dropGapOpen * 192;
  
  const pickupGapClose = interpolate(frame, [380, 400], [1, 0], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const pickupGapHeight = pickupGapClose * 192;

  // Board layout math
  const PADDING = 40;
  const COL_WIDTH = 310;
  const GAP = 24;
  const HEADER_HEIGHT = 70;

  // Dragged Card Target Pos 
  const startCardX = PADDING + 16;
  const startCardY = PADDING + HEADER_HEIGHT + 16 + 192; 
  const targetCardX = PADDING + COL_WIDTH + GAP + 16;
  const targetCardY = PADDING + HEADER_HEIGHT + 16;

  // ── MOUSE CHOREOGRAPHY ──
  let mouseX = 1400; let mouseY = 1000; let cursorScale = 1;

  if (frame < 10) {
    mouseX = 1400; mouseY = 1000;
  } else if (frame < 40) {
    const move = interpolate(frame, [10, 40], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = interpolate(move, [0, 1], [1400, 315]); // '+' button
    mouseY = interpolate(move, [0, 1], [1000, 75]);
  } else if (frame < 75) {
    mouseX = 315; mouseY = 75;
    cursorScale = interpolate(frame, [45, 47, 50], [1, 0.8, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  } else if (frame < 100) {
    const move = interpolate(frame, [75, 100], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = interpolate(move, [0, 1], [315, 700]); // Title input
    mouseY = interpolate(move, [0, 1], [75, 140]);
  } else if (frame < 150) {
    mouseX = 700; mouseY = 140;
  } else if (frame < 170) {
    const move = interpolate(frame, [150, 170], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = interpolate(move, [0, 1], [700, 1256]); // Catégorie dropdown
    mouseY = interpolate(move, [0, 1], [140, 430]); 
  } else if (frame < 180) {
    mouseX = 1256; mouseY = 430;
    cursorScale = interpolate(frame, [173, 175, 178], [1, 0.8, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }); 
  } else if (frame < 195) {
    const move = interpolate(frame, [180, 195], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = 1256; mouseY = interpolate(move, [0, 1], [430, 495]); // Bug option
  } else if (frame < 205) {
    mouseX = 1256; mouseY = 495;
    cursorScale = interpolate(frame, [198, 200, 203], [1, 0.8, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }); 
  } else if (frame < 225) {
    const move = interpolate(frame, [205, 225], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = 1256; mouseY = interpolate(move, [0, 1], [495, 182]); // Assignee dropdown
  } else if (frame < 235) {
    mouseX = 1256; mouseY = 182;
    cursorScale = interpolate(frame, [228, 230, 233], [1, 0.8, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }); 
  } else if (frame < 250) {
    const move = interpolate(frame, [235, 250], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = 1256; mouseY = interpolate(move, [0, 1], [182, 245]); // Sophie option
  } else if (frame < 260) {
    mouseX = 1256; mouseY = 245;
    cursorScale = interpolate(frame, [253, 255, 258], [1, 0.8, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }); 
  } else if (frame < 280) {
    const move = interpolate(frame, [260, 280], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = interpolate(move, [0, 1], [1256, 1250]); // Save Button
    mouseY = interpolate(move, [0, 1], [245, 32]); 
  } else if (frame < 300) {
    mouseX = 1250; mouseY = 32;
    cursorScale = interpolate(frame, [283, 285, 288], [1, 0.8, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }); 
  } else if (frame < 340) {
    const move = interpolate(frame, [300, 330], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = interpolate(move, [0, 1], [1250, 800]); 
    mouseY = interpolate(move, [0, 1], [32, 500]);
  } else if (frame < 375) {
    const move = interpolate(frame, [340, 370], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = interpolate(move, [0, 1], [800, startCardX + 150]); // Card 2 for drag
    mouseY = interpolate(move, [0, 1], [500, startCardY + 60]);
  } else if (frame < 425) {
    const dragMove = interpolate(frame, [380, 420], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = interpolate(dragMove, [0, 1], [startCardX + 150, targetCardX + 150]);
    mouseY = interpolate(dragMove, [0, 1], [startCardY + 60, targetCardY + 60]);
    cursorScale = isDragging ? 0.9 : 1; 
  } else if (frame < 435) {
    mouseX = targetCardX + 150; mouseY = targetCardY + 60;
    cursorScale = hasDropped ? 1 : 0.9;
  } else {
    const move = interpolate(frame, [435, 460], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    mouseX = interpolate(move, [0, 1], [targetCardX + 150, 1400]); // Exit
    mouseY = interpolate(move, [0, 1], [targetCardY + 60, 1000]);
  }

  // ── Drag Logic ──
  const draggedCardX = isDragging ? mouseX - 140 : hasDropped ? targetCardX : startCardX;
  const draggedCardY = isDragging ? mouseY - 86 : hasDropped ? targetCardY : startCardY;

  const grabSpring = spring({ frame: Math.max(0, frame - 380), fps, config: { damping: 14, stiffness: 200 } });
  const dropSpring = spring({ frame: Math.max(0, frame - 425), fps, config: { damping: 14, stiffness: 200 } });
  const dragScale = isDragging ? interpolate(grabSpring, [0, 1], [1, 1.05]) : hasDropped ? interpolate(dropSpring, [0, 1], [1.05, 1]) : 1;
  const dragRotate = isDragging ? interpolate(grabSpring, [0, 1], [0, 3]) : hasDropped ? interpolate(dropSpring, [0, 1], [3, 0]) : 0;
  const dragShadow = isDragging ? "0 25px 50px -12px rgb(0 0 0 / 0.25)" : "0 1px 2px 0 rgb(0 0 0 / 0.05)";
  const dragZIndex = isDragging || hasDropped && frame < 430 ? 50 : 1;

  const typeLabel = selectedType === "bug" ? "Bug" : "Fonctionnalité";
  const typeIcon = selectedType === "bug" ? <Icons.Bug /> : <Icons.AlignLeft />;

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
      
      {/* ── SCALED WRAPPER ── */}
      <div 
        style={{ 
          width: VIRTUAL_W, 
          height: VIRTUAL_H, 
          transform: `scale(${SCALE})`, 
          opacity: boardEntry,
          transformOrigin: "center center", 
          position: "absolute", 
          display: "flex", 
          padding: 40,
          gap: 24,
          alignItems: "flex-start"
        }}
      >
        
        {/* ── COLUMNS ── */}
        {[
          { id: "todo", title: "À faire", color: "bg-slate-200 text-slate-700", bg: SLATE_200, text: SLATE_700 },
          { id: "in_progress", title: "En cours", color: "bg-blue-100 text-blue-700", bg: BLUE_100, text: BLUE_600 },
          { id: "review", title: "En revue", color: "bg-amber-100 text-amber-700", bg: ORANGE_100, text: ORANGE_600 },
          { id: "done", title: "Terminé", color: "bg-emerald-100 text-emerald-700", bg: EMERALD_100, text: EMERALD_600 },
        ].map((col, colIdx) => {
          const colTasks = colIdx === 0 ? 3 : colIdx === 1 ? 2 : 1;

          return (
            <div key={col.id} style={{ width: COL_WIDTH, background: `${SLATE_100}80`, borderRadius: 20, border: `1px solid ${SLATE_200}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "16px 20px", background: WHITE, borderRadius: "20px 20px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${SLATE_200}80`, height: HEADER_HEIGHT, boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: SLATE_900 }}>{col.title}</div>
                  <div style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: col.bg, color: col.text }}>{colTasks}</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: SLATE_400, background: WHITE, border: "1px solid transparent", fontSize: 20 }}>+</div>
              </div>

              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20, minHeight: 200 }}>
                {colIdx === 0 && (
                  <>
                    <div style={{ 
                      height: newCardDrop >= 1 ? "auto" : newCardHeight, 
                      opacity: newCardOpacity, 
                      overflow: newCardDrop >= 1 ? "visible" : "hidden" 
                    }}>
                      <TaskCard id="TCK-9012" title={TITLE} description={DESC} type={selectedType} priority="urgent" comments={0} assignee={isAssigned ? "S" : undefined} />
                    </div>

                    {!isDragging && !hasDropped ? (
                      <TaskCard id="TCK-3421" title="Design Landing Page" description="Revoir la section features pour ajouter les animations Remotion." type="design" priority="high" comments={3} assignee="T" />
                    ) : (
                      <div style={{ height: pickupGapHeight, overflow: "hidden" }} />
                    )}

                    <TaskCard id="TCK-8812" title="Rédiger CGV" type="feature" priority="medium" comments={0} assignee="M" />
                  </>
                )}

                {colIdx === 1 && (
                  <>
                    {isDragging && (
                      <div style={{ height: dropGapHeight, overflow: "hidden" }}>
                        <div style={{ height: 172, background: `${SLATE_200}50`, border: `2px dashed ${SLATE_300}`, borderRadius: 16 }} />
                      </div>
                    )}
                    {hasDropped && (
                      <TaskCard id="TCK-3421" title="Design Landing Page" description="Revoir la section features pour ajouter les animations Remotion." type="design" priority="high" comments={3} assignee="T" />
                    )}
                    <TaskCard id="TCK-1129" title="Corriger bug navbar" description="Le menu dropdown ne s'ouvre pas sur mobile Safari." type="bug" priority="urgent" comments={5} assignee="M" />
                  </>
                )}

                {colIdx === 2 && (
                  <TaskCard id="TCK-0091" title="Setup environnement Vercel" type="setup" priority="high" comments={1} assignee="T" />
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", fontSize: 14, fontWeight: 600, color: SLATE_400 }}>
                  <span style={{ fontSize: 18 }}>+</span> Ajouter
                </div>
              </div>
            </div>
          );
        })}

        {/* ── THE DRAGGED CARD ── */}
        {(isDragging || hasDropped) && (
          <div style={{ position: "absolute", left: draggedCardX, top: draggedCardY, width: COL_WIDTH - 32, transform: `scale(${dragScale}) rotate(${dragRotate}deg)`, boxShadow: dragShadow, zIndex: dragZIndex, borderRadius: 16, pointerEvents: "none" }}>
            <TaskCard id="TCK-3421" title="Design Landing Page" description="Revoir la section features pour ajouter les animations Remotion." type="design" priority="high" comments={3} assignee="T" />
          </div>
        )}

        {/* ── SLIDE OVER PANEL ── */}
        {slideOverProgress > 0 && (
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 800, background: WHITE, zIndex: 110, transform: `translateX(${slideOverX}px)`, boxShadow: "-25px 0 50px -12px rgb(0 0 0 / 0.15)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${SLATE_100}` }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: SLATE_300, fontFamily: "monospace" }}>TCK-NEW</div>
                <div style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: selectedType === "bug" ? RED_50 : BLUE_50, color: selectedType === "bug" ? RED_600 : BLUE_600, border: `1px solid ${selectedType === "bug" ? RED_100 : BLUE_100}`, display: "flex", alignItems: "center", gap: 8 }}>
                  {typeIcon} {typeLabel}
                </div>
                <div style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: SLATE_100, color: SLATE_600, display: "flex", alignItems: "center", gap: 8 }}><Icons.Inbox /> À faire</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ color: SLATE_400, fontSize: 12, fontWeight: 600 }}>Supprimer</div>
                <div style={{ background: SLATE_900, color: WHITE, padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, transform: `scale(${createBtnScale})`, display: "flex", alignItems: "center", gap: 8 }}>
                  Créer le ticket
                </div>
                <div style={{ padding: 8, borderRadius: 8, color: SLATE_400 }}><Icons.X /></div>
              </div>
            </div>
            
            <div style={{ flex: 1, display: "flex" }}>
              <div style={{ flex: 1, padding: "32px", display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: typedTitleChars > 0 ? SLATE_900 : SLATE_300, display: "flex", alignItems: "center" }}>
                  {typedTitleChars > 0 ? TITLE.slice(0, typedTitleChars) : "Titre du ticket..."}
                  {isTypingTitle && <span style={{ width: 2, height: 28, background: SLATE_900, marginLeft: 4 }} />}
                </div>
                <div style={{ fontSize: 14, color: typedDescChars > 0 ? SLATE_600 : SLATE_300, lineHeight: 1.6, flex: 1, display: "flex" }}>
                  {typedDescChars > 0 ? DESC.slice(0, typedDescChars) : "Contexte, liens utiles, critères d'acceptation…"}
                  {isTypingDesc && <span style={{ width: 2, height: 18, background: SLATE_900, marginLeft: 4, marginTop: 2 }} />}
                </div>
              </div>

              <div style={{ width: 288, background: `${SLATE_50}80`, borderLeft: `1px solid ${SLATE_100}`, padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: SLATE_400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Assigné à</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {isAssigned ? (
                      <><div style={{ height: 36, width: 36, borderRadius: "50%", background: "#6366F1", color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>S</div>
                        <div><div style={{ fontSize: 14, fontWeight: 600, color: SLATE_800 }}>Sophie Martin</div><div style={{ fontSize: 12, color: SLATE_400 }}>sophie@martin.fr</div></div></>
                    ) : (
                      <><div style={{ height: 36, width: 36, borderRadius: "50%", border: `2px dashed ${SLATE_300}`, color: SLATE_400, display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.UserRound /></div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: SLATE_400 }}>Non assigné</div></>
                    )}
                  </div>
                  <div style={{ marginTop: 12, background: WHITE, border: `1px solid ${SLATE_200}`, padding: "8px 12px", borderRadius: 8, fontSize: 12, color: SLATE_500, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Changer l'assigné <span style={{ fontSize: 10 }}>▼</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: SLATE_400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Propriétés</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: SLATE_500, marginBottom: 6 }}><Icons.Inbox /> Statut</div>
                      <div style={{ background: WHITE, border: `1px solid ${SLATE_200}`, padding: "6px 12px", borderRadius: 8, fontSize: 12, color: SLATE_700, fontWeight: 500 }}>À faire</div>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: SLATE_500, marginBottom: 6 }}><Icons.ArrowUp /> Priorité</div>
                      <div style={{ background: WHITE, border: `1px solid ${SLATE_200}`, padding: "6px 12px", borderRadius: 8, fontSize: 12, color: SLATE_700, fontWeight: 500 }}>Urgente</div>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: SLATE_500, marginBottom: 6 }}><Icons.AlignLeft /> Catégorie</div>
                      <div style={{ background: WHITE, border: `1px solid ${isTypeDropdownOpen ? BLUE_600 : SLATE_200}`, padding: "6px 12px", borderRadius: 8, fontSize: 12, color: SLATE_700, fontWeight: 500, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {typeLabel} <span style={{ fontSize: 10, color: SLATE_400 }}>▼</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DROPDOWNS ── */}
        {isAssignDropdownOpen && (
          <div style={{ position: "absolute", left: 1136, top: 199, width: 240, background: WHITE, borderRadius: 12, border: `1px solid ${SLATE_200}`, padding: 6, zIndex: 120, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" }}>
            <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, color: SLATE_700, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ height: 20, width: 20, borderRadius: "50%", background: SLATE_200, color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}><Icons.UserRound /></div> Non assigné
            </div>
            <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, color: SLATE_900, background: SLATE_100, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ height: 20, width: 20, borderRadius: "50%", background: "#6366F1", color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>S</div> Sophie Martin
            </div>
            <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, color: SLATE_700, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ height: 20, width: 20, borderRadius: "50%", background: "#10B981", color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>T</div> Thomas
            </div>
          </div>
        )}

        {isTypeDropdownOpen && (
          <div style={{ position: "absolute", left: 1136, top: 445, width: 240, background: WHITE, borderRadius: 12, border: `1px solid ${SLATE_200}`, padding: 6, zIndex: 120, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" }}>
            <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, color: SLATE_700, display: "flex", alignItems: "center", gap: 8 }}><Icons.AlignLeft /> Fonctionnalité</div>
            <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, color: SLATE_900, background: SLATE_100, display: "flex", alignItems: "center", gap: 8 }}><Icons.Bug /> Bug</div>
            <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, color: SLATE_700, display: "flex", alignItems: "center", gap: 8 }}><Icons.LayoutTemplate /> Design</div>
          </div>
        )}

        {/* ── MOUSE CURSOR ── */}
        {frame >= 10 && frame <= 490 && (
          <div style={{ position: "absolute", left: mouseX, top: mouseY, transform: `scale(${cursorScale})`, transformOrigin: "top left", zIndex: 200 }}>
            <Icons.CursorArrow />
          </div>
        )}

      </div>
    </div>
  );
}
