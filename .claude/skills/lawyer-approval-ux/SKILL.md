---
name: lawyer-approval-ux
description: Use when building or changing the lawyer approval screen (/contracts/:contractId/approval) — review package view, consistency issues, Approve / Request changes / Reject with required comment on reject, approvals history, audit trail, role gating for lawyers, export (redlined/clean .docx, side-by-side PDF) gated on approval, or the react-pdf preview.
---

# lawyer-approval-ux

## Purpose
Give the lawyer everything needed to make and record a defensible decision on the review package, and make export possible **only** after a recorded approval.

## Inputs / Outputs

```ts
import type { ReviewPackage, Approval, ApprovalDecision, AuditEvent, Redline, Contract, Me } from "@/api/types";
// GET  /api/v1/contracts/{id}/package          → ReviewPackage = { id; contract_id; status: "draft"|"ready_for_lawyer"|"approved"|"changes_requested"|"rejected";
//                                                  consistency_issues: { kind: string; message: string; clause_ids: string[] }[];
//                                                  executive_summary: string; approver_id: string | null; approved_at: string | null }
// POST /api/v1/packages/{id}/approvals {decision: ApprovalDecision, comment: string | null}  (lawyer only; 422 if reject without comment) → Approval
// GET  /api/v1/packages/{id}/approvals          → Approval[] = { id; package_id; decision; comment: string | null; user_id; created_at }[]
// GET  /api/v1/contracts/{id}/audit             → AuditEvent[] = { id; actor; action; entity_type; entity_id; created_at; details: Record<string, unknown> }[]
// GET  /api/v1/contracts/{id}/export?format=redlined_docx|clean_docx|side_by_side_pdf → binary; 409 unless approved with approver_id
// ApprovalDecision = "approve" | "request_changes" | "reject"

type ExportFormat = "redlined_docx" | "clean_docx" | "side_by_side_pdf";
type DecisionInput = { decision: ApprovalDecision; comment: string };  // comment "" → sent as null unless decision === "reject"
type ExportGate = { allowed: true } | { allowed: false; reason: "not_approved" | "no_approver" | "loading" };
```

Signatures:
```ts
export function usePackage(contractId: string): UseQueryResult<ReviewPackage, ApiError>;
export function useApprovals(packageId: string | undefined): UseQueryResult<Approval[], ApiError>;
export function useAudit(contractId: string): UseQueryResult<AuditEvent[], ApiError>;
export function useSubmitDecision(contractId: string, packageId: string): UseMutationResult<Approval, ApiError, DecisionInput>; // NOT optimistic
export function useCan(action: "approve" | "decideRedline" | "upload" | "editPlaybook" | "startEval"): boolean; // from useMe().roles
export function exportGate(pkg: ReviewPackage | undefined): ExportGate;                    // pure
export function useExport(contractId: string): UseMutationResult<void, ApiError, ExportFormat>; // fetch blob → download
export function parseContentDisposition(header: string | null, fallback: string): string; // RFC 6266 filename*/filename, sanitized
export function DecisionForm(props: { pkg: ReviewPackage; contract: Contract }): JSX.Element;
export function AuditTrail(props: { events: AuditEvent[] }): JSX.Element;
export function ExportMenu(props: { contractId: string; pkg: ReviewPackage | undefined }): JSX.Element;
export function SideBySidePreview(props: { contractId: string }): JSX.Element;            // lazy react-pdf chunk
```

## Procedure
1. **Header**: contract title (h1), package `StatusBadge`, approver and `approved_at` when present, and the playbook version hash.
2. **Package body** (one scrollable column, sections with h2):
   - Executive summary (serif, text only).
   - Consistency issues: a list with `kind` as a label and the `message`. Each `clause_ids` entry links to `/contracts/:id?clause=…`. If there are none: "No consistency issues found by Legal Review."
   - Redline decisions: a table (clause type, risk, status, edited?, comment count) with counts per status and a link to the redline editor. Show a warning row if any redline is still `proposed`: "2 redlines have no decision yet."
   - Approvals history (`useApprovals`): newest first, decision icon + label, comment, user, time.
   - Audit trail (`AuditTrail`): `<ol>` of events (actor, a human action label, entity, `<time>`), filterable by entity type, and collapsible after 20. `details` are shown as key/value pairs as text, never as raw HTML.
3. **Decision form** (only if `useCan("approve")`, otherwise a notice "Only a lawyer can approve, request changes or reject this package."):
   - A radio group (fieldset + legend "Decision") with Approve / Request changes / Reject. Each has an icon (`Check`, `MessageSquareWarning`, `X`) and a label.
   - Comment textarea with a visible label. It is required when Reject is selected, and the helper text says so up front ("A comment is required to reject."). It is recommended for Request changes. Limit 4000 chars with a live counter.
   - Enabled only when `pkg.status === "ready_for_lawyer"` (also `changes_requested` once the reviewer resubmits, which the backend reflects as `ready_for_lawyer`). Otherwise `aria-disabled` with the reason ("Package is still in draft.", "Package already approved.").
   - The submit button label follows the decision: "Approve package" (primary), "Request changes" (secondary), "Reject package" (danger).
   - On submit, a confirm dialog names the decision and the contract ("Approve *Acme MSA*? This records your approval and enables export."). Confirm calls `useSubmitDecision`.
4. **`useSubmitDecision`**: no `onMutate`. The button shows `loading`, and a guard rejects double submits while pending. On success it invalidates `package`, `approvals`, `audit`, `contract` and `contracts`, and enables SSE (`useContractEvents`) because the graph resumes for export preparation. Toast "Package approved." On 422 map `detail` to the comment field and focus it. On 403 show "Your account doesn't have the lawyer role." On 409 (already decided) refetch and show the current status.
5. **Export** (`ExportMenu`, visible to all roles): `exportGate(pkg)` must be `{allowed: true}`, which means `pkg.status === "approved" && pkg.approver_id !== null`. Otherwise the button is `aria-disabled` with the text "Export is available after a lawyer approves the package." The menu has three items: "Redlined .docx (tracked changes)", "Clean .docx", "Side-by-side PDF". `useExport` calls `client.GET(<export path exactly as in schema.d.ts, e.g. "/api/v1/contracts/{contract_id}/export">, { params: { path, query: { format } }, parseAs: "blob" })`, then `parseContentDisposition` (fallback `${slug(title)}-${format}.{docx|pdf}`), `URL.createObjectURL`, a temporary `<a download>`, click, and `revokeObjectURL` in `setTimeout(…, 0)`. A 409 response shows the gate message and refetches the package.
6. **Preview**: after approval, "Preview side-by-side PDF" lazy-loads `SideBySidePreview` (`React.lazy` → react-pdf). It fetches the PDF blob through the same auth path, sets the pdf.js worker from `pdfjs-dist/build/pdf.worker.min.mjs?url`, virtualizes pages, and has text layer on with its CSS overridden by tokens.
7. **Print**: `@media print` hides nav and the decision form and keeps the summary, issues, decisions, audit and disclaimer.

## Edge cases
- **Non-lawyer** (reviewer/admin): no decision controls, but the full read view and export (after approval) are available.
- **Multi-role user** (lawyer + reviewer): allowed. The UI doesn't prevent a reviewer-lawyer from approving their own work, but it shows the notice "You also reviewed this package." when `audit` contains redline actions by `me.id`.
- **Package `draft`** (Legal Review not done): read-only, with the reason. Live SSE progress shows if analysis is still running.
- **Status changed by another lawyer meanwhile**: 409, so refetch and show "This package was already {decision} by {user}."
- **Rejected**: export stays blocked. Redlines are locked. Show the reject comment prominently.
- **Request changes**: the status is `changes_requested`. Redlines are unlocked for reviewers. Show the comment on the redline editor banner.
- **Export after approval returns 409** (approver missing server-side): show the gate message. Never retry automatically.
- **Large export** (10+ MB): show progress "Preparing download…" (indeterminate). Use `AbortController` on unmount.
- **Safari download**: the `<a download>` must be attached to the DOM before `click()`.
- **Filename injection**: sanitize `[\\/:*?"<>|]` and control chars, max 120 chars.

## Definition of done
- [ ] Decision controls only for `lawyer`; 403 handled; non-lawyers see an explanation
- [ ] Reject requires a comment client-side; server 422 mapped to the field; focus moves to the field
- [ ] No optimistic update on approval; double-submit guarded; confirm dialog names the decision
- [ ] `exportGate` unit-tested; export disabled with reason until approved+approver; 409 handled
- [ ] Download filename from Content-Disposition, sanitized; object URL revoked
- [ ] Audit trail and approvals history render text only; axe clean light + dark; e2e golden + export-gate + reject flows pass

## Anti-patterns
- An optimistic "Approved" state before the server confirms.
- Showing the export button as enabled and relying on the 409.
- Opening exports with `window.open(url)` or a plain `<a href>` (no auth header, and it leaks URL tokens).
- A single "Submit" button with the decision chosen elsewhere, or "OK" in the confirm dialog.
- Hiding the audit trail behind admin-only access.
- Rendering `details` or comments as HTML or markdown.
- Allowing a decision while `pkg.status !== "ready_for_lawyer"`.
