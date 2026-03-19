# TaskSlideOver — Premium Polish & File Split

**Date:** 2026-03-19
**Scope:** Visual polish + structural refactoring of `components/projects/TaskSlideOver.tsx`

## Goal

Make the task panel feel like a premium SaaS product (Linear/Height-quality) and split the 800-line file into focused, maintainable pieces.

## File Structure

All files live in `components/projects/`:

| File | Responsibility | Target lines |
|------|---------------|-------------|
| `TaskSlideOver.tsx` | Orchestrator: state, handlers, data fetching, panel shell | ~200 |
| `TaskSidebar.tsx` | Right properties panel | ~200 |
| `TaskComments.tsx` | Activity section: comment list + composer | ~150 |
| `TaskSubTasks.tsx` | Subtask list + inline create form | ~100 |
| `task-config.ts` | `TYPE_CONFIG`, `PRIORITY_CONFIG`, `STATUS_CONFIG` constants | ~40 |
| `task-shared.tsx` | `SidebarSection`, `SidebarLabel`, `SidebarPropRow` shared components | ~40 |

## Visual Design

### Header
- Task slug rendered as a subtle monospace pill with faint border
- Status dot + label, type chip, overdue badge separated by thin divider
- Delete button stays icon-only with tooltip
- Save button stays prominent right

### Sidebar (Linear-style property rows)
- Each row: icon + label left, current value as inline pill/badge right
- Whole row clickable — no visible `SelectTrigger` at rest, just the value styled as a tag
- Assignee: avatar + name inline, click to reassign
- Due date: formatted date as colored pill (red if overdue), click opens native date input

### Comments
- Avatars slightly larger, bubbles with `shadow-xs` + border
- Composer: cleaner focus ring, send button only visible on content/focus
- Timestamp right-aligned, delete icon on hover only

### Subtasks
- Circle / filled-circle toggle replaces status icon (done = filled emerald)
- Tighter rows, monospace slug muted, title truncates cleanly
- Progress bar stays, slightly taller

## Constraints
- No logic changes — pure visual + structural refactoring
- All existing props and callbacks stay identical
- Dark mode must remain fully supported
- French locale strings unchanged
