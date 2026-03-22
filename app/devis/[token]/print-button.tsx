"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "7px 16px",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        background: "white",
        fontSize: "13px",
        fontWeight: 500,
        color: "#374151",
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "inherit",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db"
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "white"
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      Imprimer / PDF
    </button>
  )
}
