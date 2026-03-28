import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";

// ── Colors & Theme ───────────────────────────────────────────────────────────
const PRIMARY = "#2563EB";
const SLATE_900 = "#0F172A";
const SLATE_500 = "#64748B";
const SLATE_400 = "#94A3B8";
const SLATE_200 = "#E2E8F0";
const SLATE_100 = "#F1F5F9";
const SLATE_50 = "#F8FAFC";
const WHITE = "#FFFFFF";

const STATUS = {
  to_do: { bg: "#F3F4F6", color: "#374151", label: "À faire", dot: "#9CA3AF" },
  first_contact: { bg: "#DBEAFE", color: "#1E40AF", label: "Premier contact", dot: "#60A5FA" },
  proposal_sent: { bg: "#FEF9C3", color: "#854D0E", label: "Proposition", dot: "#EAB308" },
  won: { bg: "#DCFCE7", color: "#166534", label: "Gagné", dot: "#22C55E" },
  lost: { bg: "#FEE2E2", color: "#991B1B", label: "Perdu", dot: "#EF4444" },
};

const EXISTING_ROWS = [
  { initial: "S", name: "Studio Pixel", sector: "Design", email: "contact@studiopixel.fr", status: "first_contact" },
  { initial: "D", name: "Design Co.", sector: "Agence web", email: "hello@designco.fr", status: "proposal_sent" },
  { initial: "P", name: "Pile.XP", sector: "Architecte", email: "contact@pilexp.fr", status: "won" },
  { initial: "L", name: "La table des oliviers", sector: "Réstaurant", email: "info@table-oliviers.fr", status: "won" },
] as const;

const NEW_ROW = { initial: "A", name: "Agence Martin", sector: "Communication", email: "sophie@martin.fr", status: "to_do" as const };

// ── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  FileText: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
  Building2: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" /></svg>,
  Briefcase: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>,
  Sliders: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></svg>,
};

// ── Sub-components ───────────────────────────────────────────────────────────
function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 500, color: SLATE_900, marginBottom: 8 }}>
      {children} {required && <span style={{ color: "#EF4444" }}>*</span>}
    </div>
  );
}

function FormInput({ value, typing, cursorVisible }: { value: string; typing?: boolean; cursorVisible?: boolean }) {
  return (
    <div
      style={{
        height: 40,
        border: `1px solid ${typing ? PRIMARY : SLATE_200}`,
        borderRadius: 8,
        background: WHITE,
        padding: "0 14px",
        display: "flex",
        alignItems: "center",
        fontSize: 14,
        color: value ? SLATE_900 : SLATE_400,
        boxShadow: typing ? `0 0 0 2px ${PRIMARY}22` : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        gap: 2,
      }}
    >
      <span>{value || " "}</span>
      {typing && cursorVisible !== undefined && (
        <span style={{ width: 1.5, height: 16, background: PRIMARY, opacity: cursorVisible ? 1 : 0, flexShrink: 0 }} />
      )}
    </div>
  );
}

function SectionHeader({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <div style={{ color: SLATE_500 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: SLATE_500, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {text}
      </div>
    </div>
  );
}

function StatusBadge({ statusKey }: { statusKey: keyof typeof STATUS }) {
  const s = STATUS[statusKey];
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999 }}>
      {s.label}
    </span>
  );
}

// ── Main composition ─────────────────────────────────────────────────────────
export function PipelineComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Virtual Canvas Scaling ──
  // Your container is 700x500. We build the UI at 1050x750 (1.5x) for desktop proportions.
  const COMP_W = 700;
  const VIRTUAL_W = 1050;
  const VIRTUAL_H = 750;
  const SCALE = COMP_W / VIRTUAL_W;

  // ── Animations ──
  const formEntry = spring({ frame, fps, config: { damping: 20, stiffness: 150 } });
  const formOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  const NAME_TEXT = "Refonte du site web";
  const typeProgress = interpolate(frame, [20, 45], [0, NAME_TEXT.length], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const nameChars = Math.floor(typeProgress);
  const nameCursor = frame >= 18 && frame < 55 ? (frame % 10 < 5 ? 1 : 0) : 0;
  const isNameTyping = frame >= 18 && frame < 55;

  const isSubmitting = frame >= 65;
  const btnClickScale = spring({ frame: Math.max(0, frame - 65), fps, config: { damping: 12, stiffness: 300 } });
  const btnScale = interpolate(btnClickScale, [0, 0.5, 1], [1, 0.95, 1]);

  const formExitProgress = interpolate(frame, [85, 100], [0, 1], { easing: Easing.inOut(Easing.ease), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const finalFormOpacity = formOpacity * (1 - formExitProgress);
  const formScaleY = interpolate(formEntry, [0, 1], [0.95, 1]) - (formExitProgress * 0.05);

  const pipeEntry = spring({ frame: Math.max(0, frame - 95), fps, config: { damping: 18, stiffness: 120 } });
  const pipeOpacity = interpolate(frame, [95, 110], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const pipeY = interpolate(pipeEntry, [0, 1], [40, 0]);

  const rowEntry = spring({ frame: Math.max(0, frame - 120), fps, config: { damping: 14, stiffness: 150 } });
  const rowHeight = interpolate(rowEntry, [0, 1], [0, 64]); // 64px is standard row height
  const rowOpacity = interpolate(frame, [120, 130], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const highlightOpacity = interpolate(frame, [130, 150], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const toDoCount = frame >= 125 ? 4 : 3;

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

      {/* ── SCALED WRAPPER ── */}
      <div style={{ width: VIRTUAL_W, height: VIRTUAL_H, transform: `scale(${SCALE})`, transformOrigin: "center center", position: "absolute", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* ── FORM DIALOG VIEW ──────────────────────────────────────── */}
        {frame < 105 && (
          <div
            style={{
              width: 700,
              background: WHITE,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.15)",
              border: `1px solid ${SLATE_200}`,
              opacity: finalFormOpacity,
              transform: `scale(${formScaleY})`,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <div style={{ padding: "28px 32px 20px", borderBottom: `1px solid ${SLATE_100}` }}>
              <h1 style={{ fontSize: 24, fontWeight: 600, color: SLATE_900, marginBottom: 6 }}>Nouvelle opportunité</h1>
              <p style={{ fontSize: 15, color: SLATE_500 }}>Remplissez les informations pour créer une nouvelle opportunité.</p>
            </div>

            <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 28 }}>
              <div>
                <SectionHeader icon={<Icons.FileText />} text="Informations de l'opportunité" />
                <div style={{ marginBottom: 16 }}>
                  <FormLabel required>Nom de l'opportunité</FormLabel>
                  <FormInput value={NAME_TEXT.slice(0, nameChars)} typing={isNameTyping} cursorVisible={nameCursor === 1} />
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <FormLabel>Statut</FormLabel>
                    <FormInput value="À faire" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <FormLabel>Méthode de contact</FormLabel>
                    <FormInput value="Email" />
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: SLATE_100 }} />

              <div>
                <SectionHeader icon={<Icons.Building2 />} text="Informations de l'entreprise" />
                <div style={{ marginBottom: 16 }}>
                  <FormLabel required>Nom de l'entreprise</FormLabel>
                  <FormInput value="Agence Martin" />
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <FormLabel required>Email</FormLabel>
                    <FormInput value="sophie@martin.fr" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <FormLabel>Site web</FormLabel>
                    <FormInput value="martin-agence.fr" />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 32px", background: SLATE_50, borderTop: `1px solid ${SLATE_100}`, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <p style={{ height: 40, padding: "0 20px", borderRadius: 8, border: `1px solid ${SLATE_200}`, fontSize: 14, fontWeight: 500, color: SLATE_900, display: "flex", alignItems: "center", background: WHITE }}>
                Annuler
              </p>
              <p style={{ height: 40, padding: "0 24px", borderRadius: 8, background: PRIMARY, color: WHITE, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, transform: `scale(${btnScale})`, transition: "background 0.2s" }}>
                {isSubmitting ? <><span style={{ fontSize: 14 }}>⏳</span> Création...</> : "Créer"}
              </p>
            </div>
          </div>
        )}

        {/* ── PIPELINE VIEW ────────────────────────────────────────── */}
        {frame >= 90 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: "40px 48px",
              boxSizing: "border-box",
              opacity: pipeOpacity,
              transform: `translateY(${pipeY}px)`,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE }}>
                  <Icons.Briefcase />
                </div>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 600, color: SLATE_900 }}>Pipeline Commercial</h1>
                  <p style={{ fontSize: 15, color: SLATE_500, marginTop: 4 }}>Gérez vos prospects et maximisez vos conversions.</p>
                </div>
              </div>
              <p style={{ height: 40, padding: "0 20px", borderRadius: 8, background: PRIMARY, color: WHITE, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                Nouvelle opportunité
              </p>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              {Object.entries(STATUS).map(([key, s], i) => (
                <div key={key} style={{ flex: 1, background: WHITE, border: `1px solid ${SLATE_200}`, borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: SLATE_400, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: SLATE_900, marginTop: 2 }}>
                      {key === "to_do" ? toDoCount : (i === 1 ? 2 : i === 3 ? 5 : 1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: WHITE, borderRadius: 16, border: `1px solid ${SLATE_200}`, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>

              <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${SLATE_100}`, gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: SLATE_50, border: `1px solid ${SLATE_200}`, padding: "8px 16px", borderRadius: 8, flex: 1 }}>
                  <div style={{ color: SLATE_400 }}><Icons.Search /></div>
                  <div style={{ fontSize: 14, color: SLATE_400 }}>Rechercher...</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: SLATE_500, textTransform: "uppercase" }}>
                  <Icons.Sliders /> Filtres
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", background: `${SLATE_50}80`, borderBottom: `1px solid ${SLATE_100}` }}>
                <div style={{ flex: "0 0 240px", fontSize: 12, fontWeight: 700, color: SLATE_400, textTransform: "uppercase", letterSpacing: 0.5 }}>Entreprise</div>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: SLATE_400, textTransform: "uppercase", letterSpacing: 0.5 }}>Contact</div>
                <div style={{ width: 140, fontSize: 12, fontWeight: 700, color: SLATE_400, textTransform: "uppercase", letterSpacing: 0.5 }}>Statut</div>
              </div>

              <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                <div
                  style={{
                    height: rowHeight,
                    opacity: rowOpacity,
                    overflow: "hidden",
                    background: `rgba(239, 246, 255, ${highlightOpacity})`,
                    borderBottom: `1px solid ${SLATE_50}`,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 24px",
                    boxSizing: "border-box"
                  }}
                >
                  <div style={{ flex: "0 0 240px" }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: SLATE_900 }}>{NEW_ROW.name}</div>
                    <div style={{ fontSize: 13, color: SLATE_500 }}>{NEW_ROW.sector}</div>
                  </div>
                  <div style={{ flex: 1, fontSize: 14, color: SLATE_500 }}>{NEW_ROW.email}</div>
                  <div style={{ width: 140 }}><StatusBadge statusKey={NEW_ROW.status} /></div>
                </div>

                {EXISTING_ROWS.map((row, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${SLATE_50}` }}>
                    <div style={{ flex: "0 0 240px" }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: SLATE_900 }}>{row.name}</div>
                      <div style={{ fontSize: 13, color: SLATE_500 }}>{row.sector}</div>
                    </div>
                    <div style={{ flex: 1, fontSize: 14, color: SLATE_500 }}>{row.email}</div>
                    <div style={{ width: 140 }}><StatusBadge statusKey={row.status} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
