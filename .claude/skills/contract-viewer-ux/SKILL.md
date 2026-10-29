---
name: contract-viewer-ux
description: Use when building or changing the contract viewer (/contracts/:contractId) — risk-highlighted contract text, mapping clause/risk offsets to rendered spans, overlapping spans, clause outline navigation, sticky risk summary, in-document search, or the j/k/h// keyboard shortcuts.
---

# contract-viewer-ux

## Purpose
Render the full normalized contract text with exact, accessible risk highlights, and let a reviewer move clause by clause with the keyboard through 200+ page contracts without jank.

## Inputs / Outputs

```ts
import type { Clause, RiskAssessment, RiskLevel, ClauseType, ClauseWithRisk, ContractText, Page } from "@/api/types";
// GET /api/v1/contracts/{id}/text     → ContractText = { text: string; sections: { id: string; heading: string | null; start_offset: number; end_offset: number; order: number }[] }
// GET /api/v1/contracts/{id}/clauses  → Page<ClauseWithRisk>, ordered by `order`, ?limit=200&offset=n
// Clause         = { id; contract_id; section_id; clause_type: ClauseType; heading: string | null; text; start_offset: number; end_offset: number; order: number; needs_human: boolean }
// RiskAssessment = { id; clause_id; level: RiskLevel; score: number /*0–100*/; rationale; quoted_span; span_start: number; span_end: number; playbook_position_id: string | null; red_flags: string[]; provenance: Provenance }

// Derived (src/features/viewer/lib/types.ts)
type Span = {
  id: string;                    // clause id, or `${clause.id}:q` for the quoted risk span
  kind: "clause" | "quote" | "match";
  start: number;                 // UTF-16 index into ContractText.text
  end: number;                   // exclusive
  level: RiskLevel | null;
  clauseId: string;
};
type Segment = {
  start: number; end: number;    // UTF-16, contiguous, non-overlapping
  spanIds: readonly string[];    // all spans covering this segment
  topLevel: RiskLevel | null;    // max severity among covering clause spans
  isQuote: boolean;              // inside a risk quoted_span
  isMatch: boolean;              // inside a search hit
  isActiveMatch: boolean;
};
type TextBlock = { index: number; start: number; end: number; sectionId: string | null; heading: string | null };

type ViewerFilter = { highOnly: boolean; types: ClauseType[] };
interface ViewerState {                       // Zustand: src/stores/viewer.ts (UI only)
  activeClauseId: string | null;
  filter: ViewerFilter;
  query: string;
  activeMatch: number;                        // index into matches
  setActiveClause(id: string | null): void;
  toggleHighOnly(): void;
  setQuery(q: string): void;
  stepMatch(dir: 1 | -1): void;
}
```

Signatures:
```ts
// src/lib/offsets.ts
export function makeOffsetMapper(text: string): (codePointIndex: number) => number; // identity fast path when no surrogates
// src/features/viewer/lib/segments.ts
export function buildSpans(clauses: ClauseWithRisk[], toUtf16: (cp: number) => number, textLength: number): Span[];
export function splitIntoBlocks(text: string, sections: ContractText["sections"], toUtf16: (cp: number) => number, maxBlockChars?: number /*4000*/): TextBlock[];
export function buildSegments(block: TextBlock, spans: Span[]): Segment[];   // spans pre-sorted by start
export function findMatches(text: string, query: string, limit?: number /*2000*/): { start: number; end: number }[];
// hooks
export function useContractText(contractId: string): UseQueryResult<ContractText, ApiError>;
export function useClauses(contractId: string): UseInfiniteQueryResult<InfiniteData<Page<ClauseWithRisk>>, ApiError>; // auto-fetches all pages
export function useViewerShortcuts(opts: { onNext(): void; onPrev(): void; onToggleHigh(): void; onSearch(): void }): void;
// components
export function ContractText(props: { contractId: string; text: string; blocks: TextBlock[]; spans: Span[]; onActivateClause(id: string): void }): JSX.Element;
export function ClauseOutline(props: { clauses: ClauseWithRisk[]; activeClauseId: string | null; filter: ViewerFilter; onSelect(id: string): void }): JSX.Element;
export function RiskSummary(props: { clauses: ClauseWithRisk[]; active: ClauseWithRisk | null }): JSX.Element;
```

## Procedure
1. **Load**: `useContractText` (`staleTime: Infinity`, keyed by contract id and `current_version_id`) and `useClauses` (infinite, `limit=200`, fetch the next page in `useEffect` while `hasNextPage && !isFetchingNextPage`, sequentially). Render text as soon as it arrives. Highlights fill in as clause pages land.
2. **Offsets**: the backend offsets are Python code point indices. `makeOffsetMapper(text)` scans once. If there are no surrogate pairs (`!/[\uD800-\uDBFF]/.test(text)`) it returns the identity. Otherwise it builds an `Uint32Array` prefix map from code point to UTF-16 index. Clamp to `[0, text.length]` and drop spans where `end <= start` (dev-only `log.warn({clauseId, start, end})`).
3. **Spans**: for each clause add a `clause` span `[start_offset, end_offset)` with `level = risk?.level ?? null`. If `risk` exists, also add a `quote` span `[span_start, span_end)`. The quote must lie within the clause; if it doesn't, clamp it to the clause range.
4. **Blocks**: split the text at section boundaries, then at blank lines (`\n\n`), and hard-split blocks over `maxBlockChars` at the nearest whitespace. Blocks are the virtualization unit. Spans crossing block boundaries are rendered as one fragment per block (same `data-clause-id`).
5. **Segments** (per block, memoized by `[block.index, spansVersion, query, activeMatch]`): collect every span start/end inside the block as boundary points, sort them unique, and sweep, maintaining the active span set. For each `[p_i, p_{i+1})` emit a `Segment`, with `topLevel` the max `RISK_META[level].rank` among covering clause spans. This handles **overlap, nesting and adjacency** in O(n log n).
6. **Render** each segment as text children only (never HTML):
   - with no spans, a bare string.
   - otherwise `<mark className={cn("mark", RISK_META[topLevel].cls.mark, isQuote && "mark-quote", isMatch && "bg-match")} data-clause-id={primaryClauseId}>{text.slice(start, end)}</mark>`. `mark-quote` adds a 2px underline in the risk `fg` token. The first fragment of each clause gets a margin marker: a risk icon plus a visually hidden label ("High risk, Liability clause, score 87").
   - `topLevel === null` (unassessed) uses a dashed `border-border-strong` underline and no fill.
7. **Interaction**: clause fragments are not individually focusable (too many tab stops). The **outline** is the keyboard path: a plain `<nav aria-label="Clause outline"><ol>` of buttons (not `role="tree"`), each with a risk badge, heading/type, and `aria-current="true"` when active. Clicking a fragment or outline item calls `setActiveClause(id)`: update `?clause=` (`replace: true`), `virtualizer.scrollToIndex(blockOf(clause.start), { align: "start", behavior: reducedMotion ? "auto" : "smooth" })`, flash the outline (static under reduced motion), and focus the active clause card heading in `RiskSummary`. A polite live region announces "Clause 12 of 48, Liability, High risk".
8. **Shortcuts** (`useViewerShortcuts` → `useHotkeys`): ignore when `event.target` is editable, when any modifier except Shift is held, when `ui.shortcutsEnabled === false`, or while a dialog is open. `j`/`k` move through the *filtered* clause list in `order` (wrap: no, stop at ends and announce "Last clause"). `h` toggles `highOnly` (`aria-pressed` on the toolbar toggle mirrors it) and, if the active clause is filtered out, jumps to the next visible one. `/` calls `preventDefault()` and focuses the search input.
9. **Search**: debounce 150ms. Search runs over `text` with case-insensitive `indexOf` (no regex from user input), capped at 2000 hits ("2000+ matches" shown). `Enter`/`Shift+Enter` step through hits and scroll to the hit's block. `Esc` clears and returns focus to the element focused before `/`. Show "3 of 41" with `aria-live="polite"`.
10. **RiskSummary** (sticky `aside`, `top: var(--sticky-offset)`): counts per level (icon + label + number), the active clause card (type, `RiskBadge` with score, rationale, the quoted span in serif with a risk underline, red flags as a list, "Open redline" when a redline exists, "Provenance" opening the drawer from risk-dashboard-ux). Clauses still loading show "Analyzing… 120 of 480 clauses".

## Edge cases
- **Overlapping clauses** (chunk overlap): the fill is the highest severity. The active outline item lists the others ("Also part of: Indemnity (Medium)"). The click target resolves to the *innermost, highest-severity* span at the click point (`spanIds` order).
- **Quote outside clause**: clamp to the clause. If clamping makes it empty, drop the underline but keep the clause.
- **200+ pages / ~1M chars**: never build one giant segment array. Compute per visible block only (see contract-ui-performance). Search results store offsets, not DOM nodes.
- **Text arrives before clauses**: render plain text. Keep the outline as a skeleton with the count "Loading clauses…".
- **`?clause=` deep link to a not-yet-loaded clause**: keep it pending and scroll once the page containing it lands. Show "Clause not found" only after `total` is reached.
- **`needs_human`**: badge "Needs review" (`CircleHelp`), counted in summary, never hidden by `highOnly` if its level is High or null.
- **Empty text** (`text === ""`): empty state "No text could be extracted from this document." plus a link to the upload list.
- **Contract still analyzing**: show a banner with the live SSE progress, and refetch clauses on `done`.
- **Find-in-page (Ctrl+F)** cannot see virtualized text. Our `/` search is the supported path, and the shortcut sheet says so.
- **Right-to-left or mixed scripts**: set `dir="auto"` on blocks.
- **Copying text** across virtual blocks only copies rendered blocks. This is documented, and a "Copy clause text" button is on the clause card.

## Definition of done
- [ ] Unit tests: `makeOffsetMapper` (ASCII, emoji/astral, combining marks), `buildSegments` (disjoint, overlap, nesting, adjacency, zero-length, clamping), `splitIntoBlocks`, `findMatches`
- [ ] j/k/h// work and are suppressed in inputs and when disabled; `?clause=` deep link works
- [ ] Highlights carry icon + sr label; no color-only meaning; contrast per DESIGN_SYSTEM §3.6
- [ ] 200-page fixture: first highlight < 2s after text; DOM blocks < 200; smooth scroll
- [ ] Loading / empty / error / analyzing states; axe clean in light + dark
- [ ] No `dangerouslySetInnerHTML`; no contract text in logs

## Anti-patterns
- Using API offsets directly as JS string indices without the mapper.
- Wrapping spans by nesting `<mark>` per span (breaks on partial overlap). Use the boundary sweep.
- Building HTML strings or using `innerHTML` / `dangerouslySetInnerHTML` to inject highlights.
- Rendering every clause as a tab stop, or putting `tabIndex` on every `<mark>`.
- Storing `clauses` in Zustand, or recomputing segments for the whole document on every keypress.
- Global `keydown` handlers that fire while typing in the search box or a comment.
- Regex search built from user input (ReDoS, special chars).
- Smooth scrolling under reduced motion.
