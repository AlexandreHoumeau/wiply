# TaskSlideOver — Premium Polish & File Split

**Date:** 2026-03-19
**Scope:** Visual polish + structural refactoring of `components/projects/TaskSlideOver.tsx`

## Goal

Make the task panel feel like a premium SaaS product (Linear/Height-quality) and split the 800-line file into focused, maintainable pieces.

## Constraints

- **No logic changes** — pure visual + structural refactoring
- **No new npm packages** — use only libraries already in the project
- **No new shadcn/ui components** — keep existing `Select`, `Sheet`, `Button` etc.
- All existing props and callbacks stay identical
- Dark mode must remain fully supported
- French locale strings unchanged
- All new files use named exports

## File Structure

All files live in `components/projects/`:

| File | Responsibility | Target lines |
|------|---------------|-------------|
| `task-config.ts` | `TYPE_CONFIG`, `PRIORITY_CONFIG`, `STATUS_CONFIG` constants (named exports, icon types stay as `any`) | ~40 |
| `task-shared.tsx` | `SidebarSection`, `SidebarLabel`, `SidebarPropRow` — named exports consumed by `TaskSidebar` and `TaskSlideOver` | ~50 |
| `TaskHeader.tsx` | Header bar: breadcrumb, slug pill, status/type/overdue badges, delete + save + close actions | ~80 |
| `TaskSubTasks.tsx` | Subtask list + inline create form | ~100 |
| `TaskComments.tsx` | Activity section: comment list + composer | ~150 |
| `TaskSidebar.tsx` | Right properties panel (assignee, status, priority, type, version, due date, meta) | ~200 |
| `TaskSlideOver.tsx` | Orchestrator: all state, all handlers, data fetching, assembles the panel | ~200 |

## Visual Design

### Header (`TaskHeader.tsx`)
- Task slug rendered as a subtle monospace pill with faint border (e.g. `font-mono text-xs border rounded px-1.5`)
- Status dot + label, type chip, overdue badge — same as current, just slightly more spaced
- Delete button stays icon-only with `title` tooltip
- Save button stays prominent right
- No structural change from current, only spacing/styling refinements

### Sidebar property rows (keep existing `Select`)
The existing `Select` / `SelectTrigger` / `<SelectValue />` components are kept as-is — `<SelectValue />` is not replaced. Only the trigger frame is restyled to look minimal rather than like a form input:
- `SelectTrigger` gets: `h-7 text-xs border-border/30 bg-card/40 shadow-none focus:ring-0 rounded-md font-medium`
- The dropdown chevron stays (do not hide it)
- The whole row still uses `SidebarPropRow` — icon + label on the left, restyled trigger on the right
- This is a pure Tailwind className change on the existing `SelectTrigger`, nothing else

### Assignee field (keep existing `Select`)
- The avatar + name display block stays above the Select (same as today)
- The `SelectTrigger` is restyled to look minimal: `h-7 text-xs border-border/30 bg-transparent shadow-none` — essentially the same as now but slightly lighter
- No popover or Command component introduced

### Due date
- Keep the current structure: formatted date label + `<input type="date">` both visible
- Style the date label as a colored pill when overdue (`text-red-600 bg-red-50 dark:bg-red-950/40 rounded px-1.5`)
- Style the `<input type="date">` with the same minimal look as other sidebar fields
- No `.showPicker()` or click-to-reveal mechanic — keep both elements always visible

### Subtask rows
- Replace the status icon with a simple circle indicator:
  - Not done: `w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30`
  - Done: `w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-emerald-500`
- The circle is **decorative only** — not clickable, no status toggle (no logic change)
- The `SubStatusIcon` variable and the `STATUS_CONFIG[sub.status]?.icon` lookup inside the subtask map are removed entirely (they become dead code once replaced by the circle)
- Tighter rows, monospace slug muted, title truncates cleanly
- Progress bar stays

### Comments
- Avatars stay at `h-7 w-7`
- Comment bubbles: add `shadow-sm` to the existing border style
- Composer: send button only appears when `commentHtml` has real content (same as current `commentHtml.trim() && commentHtml !== "<p></p>"` check)
- Timestamp right-aligned, delete icon on hover only (same as current)

## Orchestrator JSX shape

The refactored `TaskSlideOver.tsx` renders only:
```
<Sheet>
  <SheetContent>
    <TaskHeader ... />
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto ...">
        {/* title input + description editor */}
        <TaskSubTasks ... />
        <TaskComments ... />
      </div>
      <TaskSidebar ... />
    </div>
  </SheetContent>
</Sheet>
```
No other JSX blocks live in the orchestrator. The title input and description editor remain inline in the orchestrator (they are tightly coupled to state and too small to warrant their own file).

## What does NOT change
- All handler functions (`handleSave`, `handleDelete`, `handleSubmitComment`, `handleDeleteComment`, `handleCreateSubTask`)
- All data fetching (`useEffect` calls for members, versions, comments)
- All state variables and their types
- The `Sheet` / `SheetContent` wrapper and its sizing
- The two-column layout (left content + right sidebar)
