---
name: redline-editor-ux
description: Use when building or changing the redline editor (/contracts/:contractId/redlines) — side-by-side original vs proposed text, word-level diff highlighting, inline accept/reject/edit per redline with optimistic updates, comment threads, the negotiation note panel, or feedback capture for training data.
---

# redline-editor-ux

## Purpose
Let a reviewer decide on every AI-proposed change quickly and safely: see exactly what changed, accept, reject or edit it inline, discuss it, and capture each decision as training feedback, all without a mouse.

## Inputs / Outputs

```ts
import type { Redline, RedlineStatus, Comment, Provenance, ReviewPackage, ClauseWithRisk } from "@/api/types";
// GET   /api/v1/contracts/{id}/redlines        → Redline[]
// POST  /api/v1/redlines/{id}/accept           → Redline            (reviewer+)
// POST  /api/v1/redlines/{id}/reject           → Redline            (reviewer+)
// PATCH /api/v1/redlines/{id}  {edited_text}   → Redline (status "edited")
// POST  /api/v1/redlines/{id}/comments {body}  → Comment
// POST  /api/v1/feedback {redline_id, kind: "accept"|"reject"|"edit", chosen_text: string|null}
// Redline = { id; clause_id; original_text; proposed_text; status: RedlineStatus; edited_text: string | null;
//             negotiation_note: { issue: string; ask: string; fallback: string; walk_away: string; business_justification: string };
//             comments: Comment[]; provenance: Provenance; updated_at: string }
// Comment = { id; author; body; created_at }

type DiffOp = { op: -1 | 0 | 1; text: string };              // diff-match-patch tuple, normalized
type RedlineAction =
  | { kind: "accept"; redlineId: string }
  | { kind: "reject"; redlineId: string }
  | { kind: "edit"; redlineId: string; editedText: string };
type FeedbackKind = "accept" | "reject" | "edit";
interface DraftsState {                                       // Zustand + persist(sessionStorage "drafts.redlines")
  drafts: Record<string /*redlineId*/, { text: string; baseUpdatedAt: string }>;
  setDraft(id: string, text: string, baseUpdatedAt: string): void;
  clearDraft(id: string): void;
}
```

Signatures:
```ts
// src/features/redlines/lib/diff.ts
export function diffWords(original: string, proposed: string, opts?: { timeoutMs?: number /*1000*/ }): DiffOp[];
// hooks
export function useRedlines(contractId: string): UseQueryResult<Redline[], ApiError>;
export function useRedlineDecision(contractId: string): UseMutationResult<Redline, ApiError, RedlineAction, { previous: Redline[] | undefined }>;
export function useAddComment(contractId: string): UseMutationResult<Comment, ApiError, { redlineId: string; body: string }, { previous: Redline[] | undefined; tempId: string }>;
export function useSendFeedback(): UseMutationResult<void, ApiError, { redline_id: string; kind: FeedbackKind; chosen_text: string | null }>;
export function useRedlineShortcuts(opts: { onNext(): void; onPrev(): void; onAccept(): void; onReject(): void; onEdit(): void; enabled: boolean }): void;
// components
export function RedlineList(props: { redlines: Redline[]; clausesById: Map<string, ClauseWithRisk>; selectedId: string | null; onSelect(id: string): void }): JSX.Element;
export function RedlineDiff(props: { original: string; proposed: string; layout: "split" | "stacked" }): JSX.Element;
export function RedlineActions(props: { redline: Redline; locked: boolean; contractId: string }): JSX.Element;
export function RedlineEditForm(props: { redline: Redline; onDone(): void }): JSX.Element;
export function CommentThread(props: { redline: Redline; contractId: string }): JSX.Element;
export function NegotiationNote(props: { note: Redline["negotiation_note"] }): JSX.Element;
```

## Procedure
1. **Layout**: a two-pane layout. Left is a `RedlineList` (status badge, clause type, `RiskBadge` of the clause, first 80 chars), filterable by status. Right is the selected redline (`?redline=` in the URL, defaulting to the first `proposed`). At ≥1024px the diff is split (Original | Proposed), below that it is stacked. The negotiation note is a collapsible panel under the diff and is open by default for High risk.
2. **Diff**: `diffWords` uses `diff_match_patch` with `Diff_Timeout = timeoutMs/1000`, tokenizes to words (map words to chars, the line-mode trick applied to words), runs `diff_main`, then `diff_cleanupSemantic`, and maps back. Run it in `useMemo`. For texts over 20k chars, compute in `requestIdleCallback` (fallback `setTimeout`) and show a skeleton.
3. **Render the diff as text nodes**: in the Original column, deletions are `<del className="bg-del-bg decoration-del line-through decoration-2">` with `<VisuallyHidden>deleted: </VisuallyHidden>` before them. In the Proposed column, insertions are `<ins className="bg-ins-bg decoration-ins underline decoration-2 underline-offset-2">` with `<VisuallyHidden>inserted: </VisuallyHidden>`. Diff text color stays `text-fg` (contrast 14–16:1). The ins/del colors are only decoration (≥3:1). A legend above reads "Strikethrough = removed, underline = added". When the status is `edited`, diff original vs `edited_text` and label the column "Your edit".
4. **Decisions** (`useRedlineDecision`):
   - `onMutate`: `await qc.cancelQueries({queryKey: keys.redlines(contractId)})`, snapshot, `setQueryData` with the new `status` (and `edited_text` for edit), return `{previous}`.
   - `mutationFn`: accept/reject → `POST`. Edit → `PATCH {edited_text}`.
   - `onSuccess(redline)`: replace the item by id with the server value. Fire `useSendFeedback` (`accept`/`reject` with `chosen_text: null`, `edit` with `chosen_text: editedText`). Feedback failure is logged and does not roll back the decision.
   - `onError`: `setQueryData(previous)`, toast with problem `title`, return focus to the action button. 409 → "This redline changed. Showing the latest version." plus a refetch.
   - `onSettled`: invalidate `redlines`, `package` and `audit` for the contract.
   - Re-deciding is allowed until the package is locked (an accepted redline can be rejected later). The buttons reflect the current status via `aria-pressed`.
5. **Edit**: `e` or the "Edit" button opens `RedlineEditForm` in place (no modal). A `<label>` "Edited text" sits on a `Textarea` prefilled with `edited_text ?? proposed_text` and auto-sized to the content (max 60vh). Drafts save to `useDraftsStore` on change (debounced 300ms), so they survive navigation and 401 re-login. `Ctrl/⌘+Enter` saves, `Esc` asks "Discard edit?" only if the text changed. Saving an unchanged text is disabled ("No changes to save"). Saving empty text requires confirmation ("Saving empty text removes this clause.").
6. **Comments**: a thread of `Comment` items (author, relative time with `<time dateTime>`, body as text with `white-space: pre-wrap`). The composer has a visible label "Add comment", 1–2000 chars, `Ctrl/⌘+Enter` to post. It is optimistic: append `{id: tempId, author: me.name, body, created_at: now}`, and replace or roll back on settle.
7. **Shortcuts** (`useRedlineShortcuts`, same suppression rules as the viewer): `j`/`k` select next/previous in the filtered list, `a` accept, `r` reject, `e` edit. Disabled when `locked`.
8. **Lock**: when `package.status` is `approved` or `rejected`, make everything read-only with a banner ("Package approved by … on …. Redlines are locked."). In `ready_for_lawyer`, decisions remain allowed but show "Changes will be visible to the lawyer reviewing this package."

## Edge cases
- **Optimistic rollback** with several in-flight mutations on the same redline: each `onMutate` snapshots the then-current cache. Use `mutationKey: ["redline", id]` and `scope: { id: "redline-" + id }` (TanStack v5 scoped mutations run serially), so rollbacks restore in order.
- **Navigation mid-mutation**: the mutation completes in the background. The toast still shows on error and names the redline ("Accept failed for Liability §8.2").
- **Very long clauses / timeout**: if `diffWords` hits the timeout the result is still valid but coarse. If original+proposed exceed 200k chars, skip the diff and show plain columns with the note "Diff unavailable for very long text."
- **Identical texts** (proposed == original): "No textual change proposed" and Accept still allowed.
- **Proposed empty** = delete clause: show the original fully struck through, with the label "Proposes deleting this clause".
- **Draft conflict**: if `draft.baseUpdatedAt !== redline.updated_at` when opening edit, show "This redline was updated since your draft. Keep draft / Use latest".
- **403** (not a reviewer): actions hidden, explanation shown. Comments are still allowed (any role).
- **Unicode**: diff on JS strings is fine (no offsets involved). Never split surrogate pairs. The tokenizer splits on `/(\s+|[^\p{L}\p{N}\s])/u`.
- **Empty list**: "No redlines proposed. Only High-risk clauses get redlines." plus a link to the risk dashboard.

## Definition of done
- [ ] `diffWords` unit tests (insert, delete, replace, whitespace-only, unicode, timeout path)
- [ ] Optimistic accept/reject/edit/comment with rollback test (MSW 500 → cache restored, focus returned, toast)
- [ ] Feedback posted once per decision with the correct `kind`/`chosen_text`
- [ ] Diff is underline/strike + sr-only text; legend present; axe clean in both themes
- [ ] a/r/e/j/k + Ctrl/⌘+Enter + Esc work and are suppressed in textareas (except Ctrl/⌘+Enter inside the edit form)
- [ ] Locked state respected; drafts survive navigation and re-login

## Anti-patterns
- Rendering diffs with `dangerouslySetInnerHTML` (diff-match-patch's `diff_prettyHtml`). Never use it.
- Coloring diff text red/green as the only signal, or using ins/del fg colors as body text color.
- Modal dialogs for editing a single redline (it loses context and shifts layout).
- Waiting for the server before showing an accept/reject (feels slow), or *not* rolling back on error.
- Sending feedback before the decision succeeded, or blocking the decision on feedback.
- Character-level diffs (noisy for legal text). Always semantic word-level.
- Discarding a user's edit draft on a 401 or route change.
