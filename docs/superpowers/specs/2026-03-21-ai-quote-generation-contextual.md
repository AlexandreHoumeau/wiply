# AI Quote Generation — Contextual (no required prompt)

**Date:** 2026-03-21
**Branch:** feature/quotes
**Status:** Approved

## Goal

Allow users to generate a quotation with AI without typing any description. The AI uses all available context (linked opportunity, company, agency AI config) to produce the quote. A free-text prompt remains available as an optional refinement.

## Changes

### 1. `QuoteEditor.tsx` — AI panel

**Context summary block (collapsible)**

- Appears at the top of the open AI panel, before the textarea
- Header row: `Contexte  [N]  ▾` where N is the count of non-empty context fields
- Clicking the row toggles a compact list of pills showing each piece of context that will be sent to the AI:
  - Company name
  - Company sector (if present)
  - Opportunity name (if present)
  - Opportunity status (if present)
  - Opportunity description snippet, truncated to ~80 chars (if present)
  - Agency tone / key points (if configured in `agency_ai_configs`)
- If N = 0: the header shows *"Liez une opportunité pour enrichir la génération"* instead of pills

**Prompt textarea**

- No longer required — becomes optional
- Updated placeholder: *"Optionnel — précisez vos besoins ou laissez vide pour générer depuis le contexte"*

**Generate button**

- Enabled when: `aiPrompt.trim().length > 0` OR `contextCount >= 1`
- Disabled (grayed out) only when both conditions are false

**Context count calculation (client-side)**

Count non-empty fields from what the editor already has in state:
- `selectedOpp?.name` → +1
- `selectedOpp` status (from quote.opportunity) → +1 if present
- opportunity description (from quote.opportunity) → +1 if present
- `selectedOpp?.company?.name` → +1
- company sector (from quote.company) → +1 if present
- agency AI config tone/key_points → +1 if present (fetched alongside opportunities)

The count is computed client-side from already-available state; no extra server call.

### 2. `generateQuoteWithAI` in `actions/quotes.server.ts`

**Signature change**

```ts
export async function generateQuoteWithAI({
  quoteId,
  prompt,
}: {
  quoteId: string
  prompt?: string  // was: prompt: string
})
```

**Agency AI config**

Fetch `agency_ai_configs` for the agency and fold into the system prompt:
- If `tone` is set: append *"Ton souhaité : {tone}"*
- If `key_points` is set: append *"Points clés de l'agence : {key_points}"*
- If `custom_instructions` is set: append *"Instructions supplémentaires : {custom_instructions}"*

**User message logic**

- If `prompt` is provided: existing behavior — *"Génère un devis professionnel basé sur la demande suivante : "{prompt}""* with context appended
- If `prompt` is absent: *"Génère un devis professionnel basé uniquement sur le contexte ci-dessous."* with context appended

**Context enrichment**

The existing context already pulls: company name, sector, website, opportunity name, description, quote title. No additional DB queries needed beyond adding `agency_ai_configs`.

## Data flow

```
QuoteEditor (client)
  → user opens AI panel
  → context summary computed from existing state (selectedOpp, quote.company, quote.opportunity)
  → badge displays count
  → user optionally types prompt
  → clicks "Générer"
  → if selectedOpp differs from saved: saves link first (existing behaviour)
  → calls generateQuoteWithAI({ quoteId, prompt?: string })

generateQuoteWithAI (server action)
  → fetches quote + opportunity + company (existing query)
  → fetches agency_ai_configs (new query)
  → builds context string
  → builds user message (with or without prompt)
  → calls Mistral → returns { description, items }
```

## Out of scope

- Showing agency AI config fields in the context pills (they live server-side; count can be passed as a prop or fetched separately — kept simple: omit from pill display for now, only use server-side)
- Editing context fields inline from the AI panel
- Streaming AI response

## Files touched

| File | Change |
|------|--------|
| `app/app/quotes/[id]/components/QuoteEditor.tsx` | Context summary UI, optional prompt, button guard |
| `actions/quotes.server.ts` | `prompt` optional, fetch agency AI config, conditional user message |
