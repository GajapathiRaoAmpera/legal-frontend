---
name: risk-dashboard-ux
description: Use when building or changing the risk dashboard (/contracts/:contractId/risks) — summary cards, the clause type × severity heatmap, the filterable/sortable risk list, executive summary, or the per-clause provenance drawer (model, prompt version, playbook position, trace id).
---

# risk-dashboard-ux

## Purpose
Give reviewers and lawyers a fast, honest overview of one contract's risk, with every number drillable down to the clause, its quoted span and its provenance.

## Inputs / Outputs

```ts
import type { RiskLevel, ClauseType, ClauseWithRisk, RiskReport, Provenance, PlaybookPositionOut, Contract } from "@/api/types";
// GET /api/v1/contracts/{id}/risk-report → RiskReport = {
//   contract_id: string; counts: Record<RiskLevel, number>;
//   heatmap: { clause_type: ClauseType; High: number; Medium: number; Low: number }[];
//   executive_summary: string; items: ClauseWithRisk[] }
// Provenance = { provider: string; model_id: string; prompt_id: string; prompt_version: string; playbook_version_hash: string;
//                retrieved_chunk_ids: string[]; langfuse_trace_id: string | null }
// GET /api/v1/playbook/positions?clause_type=… → PlaybookPositionOut[] = { id; clause_type; position: PlaybookPosition; text; rationale; escalation; jurisdiction; version_hash }[]

type RiskSortKey = "score" | "level" | "clause_type" | "order";
type RiskFilters = { levels: RiskLevel[]; types: ClauseType[]; needsHuman: boolean; q: string };   // persisted in URL search params
type RiskRow = { clause: ClauseWithRisk; level: RiskLevel | null; score: number | null; rank: 0 | 1 | 2 | 3 };
```

Signatures:
```ts
export function useRiskReport(contractId: string): UseQueryResult<RiskReport, ApiError>;
export function useRiskFilters(): [RiskFilters & { sort: RiskSortKey; dir: "asc" | "desc" }, (patch: Partial<RiskFilters & { sort: RiskSortKey; dir: "asc" | "desc" }>) => void]; // useSearchParams-backed
export function filterAndSortRisks(items: ClauseWithRisk[], f: RiskFilters, sort: RiskSortKey, dir: "asc" | "desc"): RiskRow[]; // pure
export function SummaryCards(props: { counts: Record<RiskLevel, number>; needsHuman: number; playbookVersionHash: string | null }): JSX.Element;
export function RiskHeatmap(props: { rows: RiskReport["heatmap"]; selected: { type: ClauseType; level: RiskLevel } | null; onSelect(cell: { type: ClauseType; level: RiskLevel }): void }): JSX.Element;
export function RiskTable(props: { rows: RiskRow[]; onOpenProvenance(clauseId: string): void; onOpenInViewer(clauseId: string): void }): JSX.Element;
export function ProvenanceDrawer(props: { clause: ClauseWithRisk | null; open: boolean; onOpenChange(open: boolean): void }): JSX.Element;
```

## Procedure
1. **Data**: one `useRiskReport` query. While the contract status is `analyzing`, show the banner "Analysis in progress. Figures update live." and invalidate on SSE `progress` (throttled to one invalidation every 5s) and on `done`.
2. **Summary cards** (a 4-column grid, 2 columns on tablet, 1 on mobile): High, Medium, Low, then Needs review. Each has the risk icon + label + `text-3xl tabular-nums` count. The card is a link to the filtered list (`?level=High`). The fifth item is a meta line: "Playbook version `abc1234`" (mono, first 7 chars, full hash in `title` and copy button).
3. **Heatmap**: render as a real `<table>` with a caption "Risk by clause type and severity". Rows are clause types (human labels: `auto_renewal` → "Auto-renewal", `ip` → "Intellectual property", `data_protection` → "Data protection", `governing_law` → "Governing law"), and columns are High / Medium / Low with icon + label in the header. Each cell is a `<button>` with the `bg-risk-{l}-mark` fill only when the count > 0 (fill opacity does *not* scale with count, because the number is the signal). The count is in `text-risk-{l}` 600 weight, and the `aria-label` is "Indemnity, High: 3 clauses". `aria-pressed` reflects the selected filter. Zero cells are `text-fg-subtle` "0" with no fill and are disabled. Arrow keys move between cells (roving tabindex), Enter/Space selects, and selecting again clears.
4. **Executive summary**: a serif `text-md` block, max 72ch, rendered as text (`white-space: pre-line`). A "Copy summary" button.
5. **Risk table** (`DataTable`): columns are Level (badge), Score (right-aligned, `tabular-nums`), Clause type, Heading/first words, Red flags (count with tooltip list), Needs review (icon + label), Actions (View in contract, Provenance). Sorting is via header buttons with `aria-sort`. The default sort is level desc then score desc. The filter bar has level toggles (each icon + label, `aria-pressed`), a clause type multi-select (Radix Popover + checkboxes), a "Needs review only" switch, and a text search over heading/text. All filter state lives in URL params via `useRiskFilters`. It is virtualized when > 100 rows, and below 768px it becomes stacked cards.
6. **Provenance drawer** (Radix Dialog as a right drawer, 480px, full-screen on mobile): the title is "Why this is High risk". Sections:
   - Assessment: level badge, score, rationale, quoted span (serif, underlined), red flags.
   - Playbook position: fetched lazily with `useQuery(["playbook","positions",clause_type])`, then found by `playbook_position_id`. Show position (preferred/fallback/unacceptable), text, rationale and escalation. If it is `null`: "No playbook position matched. Assessed on general rules."
   - Model: provider, `model_id`, `prompt_id@prompt_version` (mono).
   - Playbook version hash, retrieved chunk ids (mono list, copyable), and the Langfuse trace id (mono, copy, or "—" if `null`).
   Focus goes to the drawer title on open and returns to the triggering button on close.
7. **Cross-links**: "View in contract" navigates to `/contracts/:id?clause=<clauseId>`. Heatmap selection and table filters stay in sync through URL params.

## Edge cases
- **Zero clauses**: the cards show 0, the heatmap is replaced by the empty state "No clauses were extracted.", and the table is hidden.
- **All Low**: no special celebration. The summary reads normally. Avoid any "safe" wording (no legal advice).
- **`risk === null` items**: level "Not assessed", sorted last, and included under a "Not assessed" filter chip.
- **`needs_human` with High**: counted in both High and Needs review. Cards do not sum to the total, and a caption explains this.
- **Heatmap clause types missing from the response**: render all 10 `ClauseType` rows in fixed order, with absent rows as zeros.
- **Stale playbook version** (assessment hash ≠ current version): a warning row in the drawer "Assessed against an older playbook version", plus a link to the version diff.
- **Very long rationale / red flags**: clamp to 4 lines in the table with an expand control. The full text is always in the drawer.
- **Partial data while analyzing**: counts may change. Avoid layout shift by reserving card heights.

## Definition of done
- [ ] `filterAndSortRisks` unit-tested (each filter, combined, sort stability, nulls last)
- [ ] Heatmap is a `<table>` with caption, header icons + labels, keyboard roving focus, accessible names, no color-only signal
- [ ] Filters/sort round-trip through the URL; back/forward works
- [ ] Provenance drawer shows all Provenance fields + playbook position; focus trap and restore
- [ ] Loading skeletons with final dimensions, empty, error, analyzing states; axe clean light + dark; mobile cards at 375px

## Anti-patterns
- A canvas or SVG-only heatmap with no table semantics, or intensity encoding as the only signal.
- Using red/amber/green for anything other than risk level (for example "approved" status).
- Fetching playbook positions for every row up front. Fetch lazily in the drawer.
- Hiding provenance behind hover-only tooltips.
- Client-side re-scoring or re-ranking risk levels. The backend's level is authoritative.
- Wording that implies legal advice ("This contract is safe to sign").
