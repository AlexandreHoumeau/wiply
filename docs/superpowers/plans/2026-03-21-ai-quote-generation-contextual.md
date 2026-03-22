# AI Quote Generation — Contextual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the AI quote generation prompt optional so the AI can generate a full quote from linked opportunity/company context alone, while adding a collapsible context summary so users can see what data will be used.

**Architecture:** Two independent changes — (1) server action enrichment (`actions/quotes.server.ts`): make `prompt` optional, add `checkAiEnabled` billing gate, fetch `agency_ai_configs` and fold into system prompt; (2) UI update (`QuoteEditor.tsx`): add collapsible context summary with badge, relax button/textarea validation. The server action change does not depend on the UI change and should be done first.

**Tech Stack:** Next.js App Router, TypeScript, Supabase JS client, Mistral AI (`@mistralai/mistralai`), React, Tailwind CSS, shadcn/ui

---

## File Map

| File | What changes |
|------|-------------|
| `actions/quotes.server.ts` | `prompt` optional + normalised; add `checkAiEnabled` import + call; inline `agency_ai_configs` fetch; conditional user message intro |
| `app/app/quotes/[id]/components/QuoteEditor.tsx` | Add `contextCount` derived from `quote` prop; add collapsible context summary UI; make textarea optional; update button disabled logic; remove early-exit guard in `handleGenerate`; fix "Régénérer" button to also call `handleGenerate()` |

> No new files. No DB migrations. No new dependencies. `vitest.config.ts` coverage tracks `lib/billing/**` but not `actions/quotes.server.ts` (DB-heavy, excluded from unit test threshold) — no coverage config change needed.

---

## Task 1: Make `generateQuoteWithAI` prompt optional + add billing gate

**Files:**
- Modify: `actions/quotes.server.ts` (lines 331–425)

### Background

`generateQuoteWithAI` currently requires `prompt: string` and only calls `checkQuoteEnabled`. We need to:
1. Make `prompt` optional and normalise it
2. Add `checkAiEnabled` alongside `checkQuoteEnabled`
3. Fetch `agency_ai_configs` and fold into system prompt
4. Change user message to not require a prompt

The function already calls `getAgencyId()` so `agencyId` is available for the new query.

- [ ] **Step 1: Update the import line for `checkAiEnabled`**

In `actions/quotes.server.ts`, find line 6:
```ts
import { checkQuoteEnabled } from "@/lib/billing/checkLimit"
```
Change to:
```ts
import { checkAiEnabled, checkQuoteEnabled } from "@/lib/billing/checkLimit"
```

- [ ] **Step 2: Update the function signature to make `prompt` optional**

Find the function signature starting at line 331:
```ts
export async function generateQuoteWithAI({
  quoteId,
  prompt,
}: {
  quoteId: string
  prompt: string
})
```
Change to:
```ts
export async function generateQuoteWithAI({
  quoteId,
  prompt,
}: {
  quoteId: string
  prompt?: string
})
```

- [ ] **Step 3: Add prompt normalisation and `checkAiEnabled` call**

The function body currently starts (after the signature) with:
```ts
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const check = await checkQuoteEnabled(agencyId)
  if (!check.allowed) return { error: check.reason }
```
Replace with:
```ts
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const check = await checkQuoteEnabled(agencyId)
  if (!check.allowed) return { error: check.reason }

  const aiCheck = await checkAiEnabled(agencyId)
  if (!aiCheck.allowed) return { error: aiCheck.reason }

  const normalizedPrompt = prompt?.trim() || undefined
```

- [ ] **Step 4: Add the `agency_ai_configs` fetch after the existing quote fetch**

The existing quote fetch ends with:
```ts
  if (!quote) return { error: "Devis introuvable" }

  const opportunity = quote.opportunity as any
  const company = quote.company as any
```
After that block, add:
```ts
  const { data: aiConfig } = await supabase
    .from("agency_ai_configs")
    .select("ai_context, tone, key_points, custom_instructions")
    .eq("agency_id", agencyId)
    .maybeSingle()
```

- [ ] **Step 5: Fold agency AI config into the system prompt**

The current system prompt is:
```ts
  const systemPrompt = `Tu es un expert en rédaction de devis commerciaux pour agences digitales françaises. Tu génères des propositions commerciales professionnelles, précises et convaincantes. Utilise le contexte fourni pour personnaliser le devis. Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans backticks.`
```
Replace with:
```ts
  const agencyConfigParts: string[] = []
  if (aiConfig?.ai_context) agencyConfigParts.push(`Contexte de l'agence : ${aiConfig.ai_context}`)
  if (aiConfig?.tone) agencyConfigParts.push(`Ton souhaité : ${aiConfig.tone}`)
  if (aiConfig?.key_points) agencyConfigParts.push(`Points clés : ${aiConfig.key_points}`)
  if (aiConfig?.custom_instructions) agencyConfigParts.push(`Instructions supplémentaires : ${aiConfig.custom_instructions}`)
  const agencyConfigSection = agencyConfigParts.length > 0 ? `\n\n${agencyConfigParts.join("\n")}` : ""

  const systemPrompt = `Tu es un expert en rédaction de devis commerciaux pour agences digitales françaises. Tu génères des propositions commerciales professionnelles, précises et convaincantes. Utilise le contexte fourni pour personnaliser le devis. Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans backticks.${agencyConfigSection}`
```

- [ ] **Step 6: Update the user message to use `normalizedPrompt`**

Only the first two lines of `userPrompt` change — the JSON schema and rules that follow must be preserved exactly.

Find (lines 382–383):
```ts
  const userPrompt = `Génère un devis professionnel basé sur la demande suivante :
"${prompt}"${context}
```
Replace those two lines only with:
```ts
  const intro = normalizedPrompt
    ? `Génère un devis professionnel basé sur la demande suivante :\n"${normalizedPrompt}"`
    : `Génère un devis professionnel basé uniquement sur le contexte ci-dessous.`

  const userPrompt = `${intro}${context}
```
Everything after `${context}` on the original line 383 — i.e., the blank line, the `Retourne un objet JSON...` block, and the `Règles :` section — must remain unchanged. Only the variable declaration opening and the first interpolation line are replaced.

- [ ] **Step 7: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit 2>&1 | grep -E "(quotes\.server|QuoteEditor)"
```
Expected: no output (no errors in either file). If you see errors unrelated to these two files, ignore them.

- [ ] **Step 8: Commit**

```bash
git add actions/quotes.server.ts
git commit -m "feat(quotes): make AI prompt optional, add agency config context and AI billing gate"
```

---

## Task 2: Add context summary UI and relax prompt validation in `QuoteEditor`

**Files:**
- Modify: `app/app/quotes/[id]/components/QuoteEditor.tsx`

### Background

The AI panel currently requires `aiPrompt` to be non-empty before the generate button is enabled and has an early-exit guard inside `handleGenerate`. We need to:
1. Compute `contextCount` from the `quote` prop (not `selectedOpp`)
2. Add a collapsible context summary above the textarea showing what context will be used
3. Remove the early-exit guard and update button disabled logic
4. Fix the "Régénérer" button to also trigger `handleGenerate()`

All changes are inside the `QuoteEditor` function component.

- [ ] **Step 1: Add `contextOpen` state and compute `contextCount`**

Find the existing AI panel state declarations (around line 75):
```ts
  // AI panel state
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiPreview, setAiPreview] = useState<{
```
After `const [aiOpen, setAiOpen] = useState(false)`, add:
```ts
  const [contextOpen, setContextOpen] = useState(false)
  const contextCount = [
    quote.company?.name,
    quote.company?.business_sector,
    (quote.opportunity as any)?.name,
    (quote.opportunity as any)?.status,
    (quote.opportunity as any)?.description,
  ].filter(Boolean).length
```

- [ ] **Step 2: Remove the early-exit guard from `handleGenerate`**

Find in `handleGenerate` (around line 145–146):
```ts
  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return toast.error("Décrivez votre projet")
```
Change to:
```ts
  const handleGenerate = async () => {
```
(just remove the guard line — nothing replaces it, the button disabled logic handles prevention)

- [ ] **Step 3: Update the `generateQuoteWithAI` call to pass `prompt` as optional**

Inside `handleGenerate`, find:
```ts
    const result = await generateQuoteWithAI({
      quoteId: quote.id,
      prompt: aiPrompt,
    })
```
Change to:
```ts
    const result = await generateQuoteWithAI({
      quoteId: quote.id,
      prompt: aiPrompt.trim() || undefined,
    })
```

- [ ] **Step 4: Fix the "Régénérer" button to also call `handleGenerate`**

Find (around line 423):
```tsx
                      <button
                        onClick={() => setAiPreview(null)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Régénérer
                      </button>
```
Change `onClick` to:
```tsx
                        onClick={() => { setAiPreview(null); handleGenerate() }}
```
> Note: `handleGenerate` is `async` and is called without `await` here. This is intentional — `handleGenerate` handles its own errors internally via `toast.error`, so unhandled promise rejections are safe. This pattern is consistent with other async event handlers in this file.

- [ ] **Step 5: Update the generate button disabled condition**

Find the generate button (around line 372–374):
```tsx
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !aiPrompt.trim()}
```
Change to:
```tsx
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || (!aiPrompt.trim() && contextCount === 0)}
```

- [ ] **Step 6: Update the textarea placeholder**

Find (around line 364):
```tsx
                    placeholder="Ex : Refonte complète du site web d'un cabinet d'avocats. Inclure UX/UI design, développement React, migration de contenu et formation de l'équipe."
```
Change to:
```tsx
                    placeholder="Optionnel — précisez vos besoins ou laissez vide pour générer depuis le contexte"
```

- [ ] **Step 7: Add the collapsible context summary block**

Inside the `{aiOpen && (...)}` section, find the opening of the inner content div:
```tsx
            {aiOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-[var(--brand-primary)]/10">
                <div className="pt-3 space-y-2">
                  <Textarea
```
Insert the context summary block between the outer `<div>` and the `<div className="pt-3 space-y-2">`:
```tsx
            {aiOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-[var(--brand-primary)]/10">
                {/* Context summary */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setContextOpen(!contextOpen)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    <span className="font-medium">Contexte</span>
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                      {contextCount}
                    </span>
                    <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", contextOpen && "rotate-90")} />
                  </button>
                  {contextOpen && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {contextCount === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Liez une opportunité pour enrichir la génération.</p>
                      ) : (
                        <>
                          {quote.company?.name && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs">🏢 {quote.company.name}</span>
                          )}
                          {quote.company?.business_sector && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs">Secteur : {quote.company.business_sector}</span>
                          )}
                          {(quote.opportunity as any)?.name && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs">📋 {(quote.opportunity as any).name}</span>
                          )}
                          {(quote.opportunity as any)?.status && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs">Statut : {(quote.opportunity as any).status}</span>
                          )}
                          {(quote.opportunity as any)?.description && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs">
                              📝 &ldquo;{((quote.opportunity as any).description as string).slice(0, 80)}{(quote.opportunity as any).description.length > 80 ? "…" : ""}&rdquo;
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Textarea
```
The code block above is the complete replacement for the three-line anchor shown in "Find". The original `<div className="pt-3 space-y-2">` becomes `<div className="space-y-2">` (its `pt-3` is no longer needed since the context block provides top spacing). Its closing `</div>` further down in the file is untouched.

- [ ] **Step 8: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit 2>&1 | grep QuoteEditor
```
Expected: no output. If there are errors, fix them before committing.

Also run the test suite to make sure nothing is broken:
```bash
npm run test:run
```
Expected: all 138 tests pass.

- [ ] **Step 9: Commit**

```bash
git add app/app/quotes/\[id\]/components/QuoteEditor.tsx
git commit -m "feat(quotes): add context summary to AI panel, make prompt optional"
```

---

## Task 3: Manual verification checklist

Start the dev server (`npm run dev`) and test at `localhost:3000`.

- [ ] **Case 1 — Quote with linked opportunity + company**
  - Open a quote that has a linked opportunity with name, status, and description, and a company with both name and sector (all 5 fields populated)
  - Open the AI panel → badge should show `5` (fewer if any fields are blank)
  - Click "Contexte [N] ▾" → pills appear for each non-empty field: company name, sector, opportunity name, status, description snippet
  - Leave prompt empty → "Générer" button is enabled
  - Click "Générer" → AI returns a preview (description + items) without any prompt
  - Click "Appliquer tout" → items added, panel closes

- [ ] **Case 2 — Quote with no linked opportunity**
  - Open a quote with no opportunity, no company
  - Open AI panel → badge shows `0`
  - Expand context → shows *"Liez une opportunité pour enrichir la génération."*
  - Leave prompt empty → "Générer" button is **disabled**
  - Type something in the prompt → button enables
  - Generate works normally

- [ ] **Case 3 — Régénérer with context-only (no prompt)**
  - Case 1 setup: generate with empty prompt → preview appears
  - Click "Régénérer" → preview clears AND new generation starts immediately (no need to press "Générer" again)

- [ ] **Case 4 — Prompt + context combined**
  - Open a quote with linked opportunity
  - Type a prompt AND have contextCount > 0 → button enabled
  - Generate → AI uses both the prompt text AND the context

- [ ] **Case 5 — Agency AI config enrichment (if configured)**
  - If the agency has an AI config set at `/app/settings/ai`, verify that generating a quote produces output consistent with the configured tone/instructions (qualitative check)
