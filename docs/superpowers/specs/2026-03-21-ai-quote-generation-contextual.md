# AI Quote Generation — Contextual (no required prompt)

**Date:** 2026-03-21
**Branch:** feature/quotes
**Status:** Approved (revised after spec review)

## Goal

Allow users to generate a quotation with AI without typing any description. The AI uses all available context (linked opportunity, company, agency AI config) to produce the quote. A free-text prompt remains available as an optional refinement.

## Changes

### 1. `QuoteEditor.tsx` — AI panel

**Context summary block (collapsible)**

Appears at the top of the open AI panel, before the textarea.

Header row: `Contexte  [N]  ▾` where N is the count of non-empty context fields. Clicking toggles a compact list of pills.

**Context count is computed from `quote.opportunity` and `quote.company` (the server-fetched saved state), NOT from `selectedOpp`.**  This accurately reflects what the server action will receive. `selectedOpp` state does not carry `status` or `description`.

Fields counted and shown as pills (0–5):
| Field | Source in component | Pill label |
|-------|---------------------|------------|
| Company name | `quote.company?.name` | `🏢 {name}` |
| Company sector | `quote.company?.business_sector` | `Secteur : {sector}` |
| Opportunity name | `quote.opportunity?.name` | `📋 {name}` |
| Opportunity status | `quote.opportunity?.status` | `Statut : {status}` |
| Opportunity description | `quote.opportunity?.description` | `📝 "{desc…}"` (truncated 80 chars) |

Agency AI config is **not** shown in the pills (it lives server-side and is not available client-side without an extra fetch). It is silently used server-side. Badge counts 0–5 fields only.

If N = 0: replace pills with *"Liez une opportunité pour enrichir la génération."*

**Prompt textarea**

- Optional — no required validation
- Placeholder: *"Optionnel — précisez vos besoins ou laissez vide pour générer depuis le contexte"*
- When submitted: pass `prompt: value.trim() || undefined` (never pass an empty string)

**Generate button**

- Enabled when: `aiPrompt.trim().length > 0` OR `contextCount >= 1`
- Disabled only when both are false

**`handleGenerate` function**

Remove the existing early-exit guard:
```ts
// REMOVE this:
if (!aiPrompt.trim()) return toast.error("Décrivez votre projet")
```
Replace with the button-level disabled guard only. Inside `handleGenerate`, pass:
```ts
prompt: aiPrompt.trim() || undefined
```

**"Régénérer" button**

The current "Régénérer" button only calls `setAiPreview(null)` — it does NOT call `handleGenerate()`. Update its `onClick` to:
```ts
onClick={() => { setAiPreview(null); handleGenerate() }}
```
Without this change, clicking Régénérer in the optional-prompt (context-only) flow merely clears the preview and leaves the user to press "Générer" manually.

**`contextCount` derivation**

Derive from the immutable `quote` prop only — not from `selectedOpp` (which is mutable client state and does not carry `status` or `description`):
```ts
const contextCount = [
  quote.company?.name,
  quote.company?.business_sector,
  (quote.opportunity as any)?.name,
  (quote.opportunity as any)?.status,
  (quote.opportunity as any)?.description,
].filter(Boolean).length
```

### 2. `generateQuoteWithAI` in `actions/quotes.server.ts`

**Signature change**

```ts
export async function generateQuoteWithAI({
  quoteId,
  prompt,
}: {
  quoteId: string
  prompt?: string  // was: string (required)
})
```

**Billing gate — add `checkAiEnabled`**

Add alongside the existing `checkQuoteEnabled`:
```ts
const aiCheck = await checkAiEnabled(agencyId)
if (!aiCheck.allowed) return { error: aiCheck.reason }
```

**Agency AI config fetch**

Inline the query (reuse the already-resolved `agencyId`, no cross-action import):
```ts
const { data: aiConfig } = await supabase
  .from("agency_ai_configs")
  .select("ai_context, tone, key_points, custom_instructions")
  .eq("agency_id", agencyId)
  .maybeSingle()
```

If `aiConfig` is null (no config row yet), skip all four fields silently.

Fold all four columns into the system prompt if non-empty:
- `ai_context`: append *"Contexte de l'agence : {ai_context}"*
- `tone`: append *"Ton souhaité : {tone}"*
- `key_points`: append *"Points clés : {key_points}"*
- `custom_instructions`: append *"Instructions supplémentaires : {custom_instructions}"*

**User message logic**

```ts
const intro = prompt
  ? `Génère un devis professionnel basé sur la demande suivante :\n"${prompt}"`
  : `Génère un devis professionnel basé uniquement sur le contexte ci-dessous.`
```
Context is appended in both cases (existing behaviour).

**Normalisation**

The server action should treat an empty/whitespace-only `prompt` as absent:
```ts
const normalizedPrompt = prompt?.trim() || undefined
```

## Data flow

```
QuoteEditor (client)
  → user opens AI panel
  → contextCount computed from quote.opportunity + quote.company (saved state)
  → badge shows count (0–5)
  → user optionally types prompt
  → clicks "Générer"
  → if selectedOpp differs from saved: saves link first (existing behaviour)
  → calls generateQuoteWithAI({ quoteId, prompt: aiPrompt.trim() || undefined })

generateQuoteWithAI (server action)
  → checkQuoteEnabled (existing)
  → checkAiEnabled (new)
  → getAgencyId() → agencyId
  → fetch quote + opportunity + company (existing query)
  → fetch agency_ai_configs (new, inline query)
  → build context string
  → build user message (with or without prompt)
  → call Mistral → return { description, items }
```

## Out of scope

- Showing agency AI config in the context pills (server-side only; not counted in badge)
- Editing context fields inline from the AI panel
- Streaming AI response

## Files touched

| File | Change |
|------|--------|
| `app/app/quotes/[id]/components/QuoteEditor.tsx` | Context summary UI, optional prompt, remove early-exit guard, pass `prompt: value \|\| undefined`, update Régénérer button to call `handleGenerate()` |
| `actions/quotes.server.ts` | `prompt` optional + normalized, add `checkAiEnabled` import + call, inline `agency_ai_configs` fetch, conditional user message |
