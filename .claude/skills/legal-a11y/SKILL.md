---
name: legal-a11y
description: Use for any UI change in legal-frontend, and specifically when adding routes, panes, dialogs, drawers, keyboard shortcuts, live progress, forms, tables, risk or diff indicators, or when writing axe tests — enforces WCAG 2.2 AA (landmarks, skip link, focus management, aria-live, keyboard operation, reduced motion, non-color signals).
---

# legal-a11y

## Purpose
Make the tool fully usable by keyboard-only, screen reader, low-vision and motion-sensitive reviewers and lawyers, to WCAG 2.2 AA. A legal decision must never depend on perceiving color or using a mouse.

## Inputs / Outputs

```ts
import type { RiskLevel, ContractStatus } from "@/api/types";
import type { ProgressEvent } from "@/api/sse";   // { stage: string; node: string; done: number; total: number; message: string }

// Outputs: shared a11y building blocks
export function SkipLink(): JSX.Element;                                     // href="#main", first focusable
export function RouteAnnouncer(): JSX.Element;                               // polite region, announces document.title on navigation
export function useRouteFocus(headingRef: React.RefObject<HTMLHeadingElement>): void; // focus <h1 tabIndex={-1}> after route change
export function usePaneFocus(paneHeadingRef: React.RefObject<HTMLHeadingElement>, paneKey: string): void;
export function LiveRegion(props: { politeness: "polite" | "assertive"; message: string }): JSX.Element;
export function useThrottledAnnouncement(message: string, minIntervalMs?: number /*5000*/, force?: (prev: string, next: string) => boolean): string;
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>, opts?: { enabled?: boolean }): void;
export function isEditableTarget(t: EventTarget | null): boolean;          // input, textarea, select, [contenteditable], [role=textbox]
export function useReducedMotion(): boolean;                                // matchMedia('(prefers-reduced-motion: reduce)')
export function checkA11y(page: import("@playwright/test").Page): Promise<void>; // e2e helper
```

## Procedure
1. **Shell** (`AppShell`): `SkipLink` → `<header>` (with `<nav aria-label="Primary">`) → `<main id="main" tabIndex={-1}>` → `<footer>` holding the disclaimer "This tool assists legal review and does not constitute legal advice." Contract pages add `<nav aria-label="Contract sections">` (tabs) and `<aside aria-label="Risk summary">`. Exactly one `<h1>` per route. Headings never skip levels.
2. **Titles and route focus**: each route sets `document.title` ("Acme MSA · Risks · Risk Reviewer"). After navigation, `useRouteFocus` focuses the `<h1>` (`tabIndex={-1}`, no visible ring on programmatic focus via `:focus:not(:focus-visible)`), and `RouteAnnouncer` announces the title. Search-param-only changes (filters, `?clause=`) do **not** move focus.
3. **Pane focus**: switching contract tabs (Viewer/Risks/Redlines/Approval) is route navigation (step 2). Opening a drawer or dialog focuses its title. Closing restores focus to the trigger (Radix does this, so do not override `onCloseAutoFocus` unless the trigger is gone, in which case focus the pane heading). Selecting a redline focuses the redline pane heading via `usePaneFocus`.
4. **Keyboard**: every action is a `<button>`/`<a>`/form control. No `div onClick`, no positive `tabIndex`. Composite widgets (heatmap grid, segmented toggles, outline) use roving tabindex. Single-character shortcuts (j, k, h, /, a, r, e) go through `useHotkeys`, which bails when `isEditableTarget(e.target)`, when modifier keys other than Shift are held, when a dialog is open, or when `ui.shortcutsEnabled` is false (Settings toggle, WCAG 2.1.4). A "Keyboard shortcuts" dialog (header `?` icon button) lists them.
5. **Focus visibility**: `:focus-visible` ring from tokens (DESIGN_SYSTEM §9), and `focus-ring-double` on filled backgrounds. Sticky header/summary: set `scroll-padding-top: var(--sticky-offset)` on scroll containers so focused items are not obscured (2.4.11).
6. **Live regions**: mount one polite `LiveRegion` per page in the shell (not per row). Agent progress uses `useThrottledAnnouncement` so it announces at most every 5s, plus immediately on a stage change, on `done` ("Analysis complete: 4 High, 7 Medium, 21 Low") and on `error` (assertive, "Analysis failed: …"). The visual progress bar is `role="progressbar"` with `aria-valuenow`/`aria-valuemax` and `aria-valuetext="Risk analysis: 12 of 48 clauses"`. Toasts use `role="status"`. Blocking form errors use `role="alert"` once, on submit.
7. **Not color-only (1.4.1)**: risk = icon + label (`RISK_META`). Diff = strike/underline + sr-only "deleted:"/"inserted:" + legend. Eval pass/fail = `CircleCheck`/`CircleX` + "Passed"/"Failed". Selected rows have an inset edge + `aria-selected`. Links in body text are underlined.
8. **Forms**: a visible `<label>` for each field. Required fields are marked with text "(required)", not just `*`. Errors are linked with `aria-describedby` + `aria-invalid`. On a submit error, focus the first invalid field. The reject-comment requirement is stated before submission (helper text), not only after.
9. **Motion**: wrap transitions in the duration tokens (0 under reduced motion). `useReducedMotion()` switches scroll behavior to `"auto"`, the flash to a static outline, and the spinner to static text.
10. **Targets and reflow**: hit areas ≥24×24 (2.5.8), and 44×44 under `pointer: coarse`. Layout reflows at 320 CSS px (1.4.10). Text spacing overrides do not clip (1.4.12), so avoid fixed heights on text containers.
11. **Tests**: every component test ends with `expect(await axe(container)).toHaveNoViolations()`. Every e2e spec calls `checkA11y(page)` after each major state (dialog open, drawer open, error shown) in light and dark projects. Add a keyboard-only e2e for new flows.

## Edge cases
- **Virtualized text**: off-screen clauses are not in the DOM, so the outline (always fully rendered or itself virtualized with `aria-setsize`/`aria-posinset`) and `/` search are the accessible path. The scroll container gets `role="region"`, `aria-label="Contract text"`, `tabIndex={0}` so keyboard users can scroll it.
- **Progress flood**: SSE can emit dozens of events per second. Never bind the live region directly to the latest event.
- **Dialogs launched from shortcuts**: restore focus to the element that had focus when the key was pressed.
- **Disabled-but-explained controls**: use `aria-disabled="true"` (still focusable) plus `aria-describedby` to the reason. Never use `disabled` when the reason matters (Approve for non-lawyers, Export before approval).
- **Screen reader reading `<mark>`**: most screen readers don't announce `<mark>`, which is why the sr-only margin label per clause is required.
- **Forced colors mode**: marks get `outline: 1px solid CanvasText`, and icons use `currentColor`.
- **Zoom 400%**: the three-pane viewer collapses to one pane at narrow widths, and the sticky summary must not cover more than 25% of the viewport height.

## Definition of done
- [ ] Landmarks, single h1, skip link, page title, footer disclaimer
- [ ] Route change focuses h1 + announces; drawers/dialogs trap and restore focus
- [ ] All actions keyboard-operable; shortcuts suppressed in editable fields and disableable; shortcut help dialog lists them
- [ ] Throttled polite progress announcements; progressbar has valuetext
- [ ] No color-only signals; contrast gate passes
- [ ] Reduced motion honored; targets ≥24px (44 coarse); reflow at 320px
- [ ] vitest-axe in every component test; e2e `checkA11y` zero violations light + dark

## Anti-patterns
- `outline: none` / `focus:outline-none` without the token ring.
- `aria-live` on a container whose content re-renders constantly (progress row, table).
- `role="alert"` for routine updates. `aria-label` duplicating visible text with different wording.
- `tabIndex={1+}`, click handlers on `div`/`span`/`mark`, or hover-only tooltips carrying needed info.
- Global single-key shortcuts firing inside textareas (typing "j" in a comment jumps clauses).
- Disabling a button with no explanation, or using `title` as the only explanation.
- Animations that ignore `prefers-reduced-motion`, or smooth scrolling on programmatic jumps when it is set.
