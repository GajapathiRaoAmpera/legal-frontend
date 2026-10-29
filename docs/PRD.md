# Product Requirements Document — Frontend

Scope: the `legal-frontend` web app. Backend behavior (agents, scoring, export generation) is specified in `../legal-backend` and its `docs/API_CONTRACT.md`. Where this document and the API contract disagree, the API contract wins, and the conflict must be raised rather than worked around.

## 1. Product Overview

Product Name: Contract & Procurement Risk Reviewer ("Risk Reviewer")
One-Line Description: A web workspace where reviewers triage AI-scored contract clauses, decide on AI-drafted redlines, and hand a review package to a lawyer who approves it before a redlined .docx can be exported.
Product Type: Internal enterprise tool (single tenant).
Primary Platform: Web, desktop first. Tablet is fully supported for risk review and approval. Mobile is supported for reading risks and approving.

## 2. Problem

What problem are we solving? Legal and procurement teams spend days reading vendor contracts to find risky clauses (unlimited liability, auto-renewal, one-sided indemnity) and drafting counter-language.
Why does this problem matter? Slow review delays procurement, and missed clauses create uncapped financial exposure.
How are users solving this today? Word documents with manual track changes, email threads with counsel, and a playbook kept in a PDF or wiki.

## 3. Goal

Primary Goal: A reviewer goes from upload to a lawyer-ready package for a 40-page MSA in under 30 minutes of active work, and every AI suggestion is traceable to a clause span and a playbook position.
Secondary Goals:
- Lawyers decide on a package from one screen, with full context and an audit trail.
- Every accept/reject/edit decision is captured cleanly, because it becomes training data (`POST /feedback`).
- The UI is WCAG 2.2 AA and fully keyboard-operable.

## 4. Target Users

Roles come from the JWT `roles` claim (`GET /me`). A user can hold several roles. The UI never infers a role from the user's name.

### Reviewer ("Rita", dev user `rita`, role `reviewer`)
Description: A procurement or contract manager who does first-pass review.
Needs:
- See the highest-risk clauses first and jump between them quickly.
- Understand why a clause is risky (rationale, quoted span, playbook position).
- Accept, reject or edit proposed redlines and leave notes for counsel.
Pain Points:
- Long contracts (200+ pages) are slow to scan.
- Doesn't trust black-box AI output.

### Lawyer ("Larry", dev user `larry`, role `lawyer`)
Description: In-house counsel and the only role that can approve.
Needs:
- One view of the package: executive summary, consistency issues, every redline decision and comment.
- A fast, defensible decision (approve / request changes / reject) with a recorded comment.
- Export the redlined .docx immediately after approving.
Pain Points:
- Re-reading everything the reviewer already read.
- Unclear provenance of AI-generated language.

### Admin ("Ada", dev user `ada`, role `admin`)
Description: Legal ops, who owns the playbook and model quality.
Needs:
- Maintain playbook positions per clause type, with version history and diffs.
- Run evaluations and see metric trends against thresholds.
Pain Points:
- Not knowing which playbook version produced a given assessment.

## 5. User Stories

- As a reviewer, I want to upload a .docx or .pdf and watch the agents' progress live so that I know when review can start.
- As a reviewer, I want to press `j`/`k` to move between clauses and `h` to show only High-risk ones so that I can triage without the mouse.
- As a reviewer, I want to see the exact quoted span and the playbook position used so that I can trust or challenge the score.
- As a reviewer, I want to accept, reject or edit each proposed redline side by side with the original so that the package reflects my judgment.
- As a reviewer, I want to comment on a redline so that the lawyer sees my reasoning.
- As a lawyer, I want to approve, request changes on, or reject the package with a comment so that the decision is recorded and the workflow resumes.
- As a lawyer, I want to export the redlined .docx right after approval so that I can send it to the counterparty.
- As any user, I want to see the audit trail so that I know who did what and when.
- As an admin, I want to edit playbook positions and compare versions so that I can manage changes safely.
- As an admin, I want to start an evaluation run and see trends so that I can catch regressions.

## 6. Core Features

Routes are defined in `docs/ARCHITECTURE.md` §7.

### Feature 1 — Sign in (dev login picker)
Purpose: Get a JWT. In dev/compose this uses `POST /api/v1/auth/dev-token` (see ADR-0004). OIDC is the production path behind the same `AuthProvider` interface.
User Flow: `/login` → choose Rita / Larry / Ada (role shown) → token stored → redirect to `?next=` or `/contracts`.
Inputs: the dev user id. Outputs: `{access_token, user}`. Then `GET /me` gives `{id, name, roles}`.
Acceptance Criteria:
- The picker is shown only when `GET /api/v1/auth/dev-token` exists (a 404/405 probe hides it and shows "Sign in with SSO").
- After sign-in, a 401 on any request clears the session and returns to `/login?next=<current path>`.
- The token is never written to localStorage or the URL. The SSE `access_token` query is the one exception, required by the contract.
Edge Cases: backend down (show a retry alert); a token that expires mid-session (redirect, and keep unsaved redline edit text in a Zustand draft store).

### Feature 2 — Contracts list & upload with live progress
Purpose: Find contracts and start new reviews.
User Flow: `/contracts` → table (title, status, risk counts High/Medium/Low, pages, uploaded by, updated) → filter by status, paginate (limit 25) → "Upload contract" (reviewer+) opens a dialog → choose a file plus an optional title → `POST /contracts` (202) → the row appears with status `uploaded` → an SSE progress row shows stage, node, `done/total` and a message → on `done` the row shows risk counts and "Open review".
Inputs: file (.docx/.pdf, ≤25 MB), title (optional, ≤200 chars).
Outputs: `Contract`, SSE `progress`/`status`/`done`/`error` events.
Acceptance Criteria:
- The client checks the extension and MIME type (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/pdf`) and the size before upload, with the error inline on the field. The server is still authoritative (413/415/422 shown inline).
- Progress is announced through one `aria-live="polite"` region, throttled to at most one announcement every 5s plus every stage change.
- Drag-and-drop and a keyboard-accessible file button both work.
- 429 shows "Upload limit reached. Try again in N s" using `Retry-After`.
Edge Cases: SSE disconnect (auto-reconnect, then refetch status); a contract that is `failed` (show the `error` message and "Upload again"); a user without the reviewer role (Upload hidden).

### Feature 3 — Contract viewer
Purpose: Read the contract with risk highlighting and navigate clause by clause.
User Flow: `/contracts/:id` → left: clause outline grouped by section with a risk badge per clause → center: full normalized text (`GET /contracts/{id}/text`) with highlighted clause spans → right: sticky risk summary (counts, current clause card with rationale, quoted span, red flags, "Open redline", "Provenance").
Inputs: `text`, `sections`, paged clauses (`GET /contracts/{id}/clauses`, limit 200, progressive).
Acceptance Criteria:
- `j`/`k` go to the next/previous clause (in the current filter). `h` toggles High-only. `/` focuses search, `Enter`/`Shift+Enter` go to the next/previous hit, and `Esc` clears and returns focus.
- The current clause is reflected in the URL (`?clause=<id>`), so deep links work.
- The text is virtualized: a 200+ page contract (~1M chars) opens in under 2s after data arrives and scrolls at 60fps.
- Overlapping spans render correctly (highest severity wins the fill, and all overlapping clauses are listed on focus).
- Clause highlights carry an icon and label in the margin, not just color.
Edge Cases: clauses still loading (highlights appear progressively, and the outline shows a skeleton tail); `needs_human` clauses; `risk: null`; offsets out of range (clamp and report to console in dev); an empty contract text.

### Feature 4 — Risk dashboard
Purpose: A portfolio view of one contract's risk.
User Flow: `/contracts/:id/risks` → summary cards (High/Medium/Low counts, needs-review count, playbook version) → heatmap (clause type × severity, from `heatmap`) → executive summary → filterable/sortable risk list (level, clause type, score, needs human, text search) → row → provenance drawer (provider, model id, prompt id@version, playbook version hash, playbook position, retrieved chunk ids, Langfuse trace id).
Acceptance Criteria:
- A heatmap cell click applies the filter `{clause_type, level}` to the list. Cells are buttons with an accessible name ("Indemnity, High: 3 clauses").
- Filters and sort are kept in the URL search params.
- The heatmap has an accessible table alternative (it is rendered *as* a `<table>`).
Edge Cases: zero clauses; all Low; analysis still running (show a partial-data banner with live counts).

### Feature 5 — Redline editor
Purpose: Decide on each AI-proposed change.
User Flow: `/contracts/:id/redlines` → list of redlines (status, clause type, risk) → selected redline: original | proposed, side by side with word-level diff → Accept / Reject / Edit (inline textarea, then Save) → comment thread → negotiation note panel (issue, ask, fallback, walk-away, business justification).
Acceptance Criteria:
- Accept and reject are optimistic, with rollback and an error toast on failure. Each one also posts `POST /feedback` (`kind: accept|reject`).
- Edit saves through `PATCH /redlines/{id}` and then sends feedback `kind: edit` with `chosen_text`. The draft text survives navigation (Zustand draft store keyed by redline id).
- Keyboard: `a` accept, `r` reject, `e` edit, `Ctrl/⌘+Enter` save the edit, `Esc` cancel, `j`/`k` next/previous redline.
- The diff is not color-only (underline/strike plus sr-only "inserted"/"deleted").
- Decisions are locked (read-only) when the package status is `approved` or `rejected`.
Edge Cases: concurrent edits (409 → refetch and show "Updated by someone else"); a very long clause (diff is computed in an idle callback with a 1s timeout, and falls back to a plain two-column view); empty proposed text (= delete clause).

### Feature 6 — Lawyer approval
Purpose: The final legal decision and export.
User Flow: `/contracts/:id/approval` → package status, executive summary, consistency issues (each links to its clauses), redline decision summary table, approvals history, audit trail (`GET /contracts/{id}/audit`) → decision form: Approve / Request changes / Reject + comment → confirm dialog → `POST /packages/{id}/approvals` → status refresh → after approval, an "Export" menu (Redlined .docx, Clean .docx, Side-by-side PDF) and a side-by-side PDF preview (react-pdf).
Acceptance Criteria:
- Decision controls are rendered only for users with the `lawyer` role. Others see "Only a lawyer can approve this package." The server enforces this too (403 handled).
- The comment is required for Reject. The client blocks it, and a server 422 is mapped to the field.
- Not optimistic: the UI waits for the server response before showing the new status.
- Export is enabled only when `package.status === "approved" && package.approver_id !== null`. A 409 shows "Export is available after a lawyer approves the package."
- Downloads use the filename from `Content-Disposition`.
Edge Cases: package not `ready_for_lawyer` (decision disabled, with the reason); the graph resume taking a while (show progress via SSE); a double-submit (button busy and an idempotent guard).

### Feature 7 — Playbook admin
Purpose: Manage company positions.
User Flow: `/playbook` → tabs per clause type → positions (preferred / fallback / unacceptable) with text, rationale, escalation, jurisdiction → admin: create / edit / delete (each creates a new version) → `/playbook/versions` → pick two versions → `/playbook/versions/:a/diff/:b` (added / removed / changed with a text diff).
Acceptance Criteria: non-admins get read-only. Deletion asks for confirmation naming the position. A version hash is shown in mono.

### Feature 8 — Evaluation results
Purpose: Track model quality.
User Flow: `/eval` → latest runs table (kind, started, status, passed) → trend chart per metric across runs, with the threshold line → `/eval/:runId` → metrics vs thresholds table plus `report_md` shown as preformatted text → admin: "Start smoke run" / "Start full run".
Acceptance Criteria: pass/fail shown with an icon and label. Charts have a table alternative. Running runs poll every 10s.

## 7. Non-Goals

- In-browser editing of the contract text itself (only redlines are editable).
- Multi-tenant org management, user admin and SSO configuration UI.
- Offline mode or a PWA.
- Rendering the original uploaded PDF/docx layout. We display normalized text, because offsets index into it.
- Real-time co-editing between users.
- Giving legal advice. The disclaimer is in the footer on every page.

## 8. MVP Scope

Must Have: features 1–6, light/dark themes, keyboard shortcuts, the a11y requirements, SSE progress, and export.
Nice to Have: features 7–8 (included in this build, but they ship after 1–6), density toggle, saved filters.
Future: OIDC login, notifications, a reviewer assignment queue, PDF layout overlay.

## 9. Success Metrics

Primary Metrics:
- Median active review time per contract (frontend timing event `review_active_ms`, from first viewer open to package `ready_for_lawyer`).
- Redline acceptance ratio (from backend `redline_acceptance_ratio`).
Secondary Metrics:
- Keyboard-shortcut usage share of clause navigations.
- Viewer p95 time-to-interactive for a 200-page contract under 2s; INP p75 under 200ms.
- Zero axe violations in CI.

## 10. Constraints

Technical: React 18, TypeScript strict, Vite, Tailwind, TanStack Query/Virtual, Zustand, Radix. Types are generated from the backend OpenAPI schema. There is no `any`. pnpm is not installed globally, so use corepack or `npx pnpm@9` (ADR-0001).
Business: Every screen shows the legal disclaimer. Export is gated on lawyer approval.
Design: tokens only (`docs/DESIGN_SYSTEM.md`). Risk is never color-only.
Timeline: the MVP must be demoable end-to-end against the compose stack with FakeLLM.

## 11. Assumptions

- Offsets (`start_offset`, `span_start`, …) are Unicode **code point** indices into `GET /contracts/{id}/text` (Python `str` semantics). The frontend converts them to UTF-16 indices (see the `contract-viewer-ux` skill).
- Clauses are not guaranteed to be disjoint. Overlap is possible after chunk de-duplication.
- The API is served same-origin at `/api/v1` (Vite proxy in dev, the web container's reverse proxy in compose).
- The SSE stream does not support `Last-Event-ID` replay, so the client refetches state after reconnect.
- At most about 2,000 clauses per contract.

## 12. Open Questions

- Do offsets use code points or UTF-16 code units? We assume code points. Ask the backend to state this in API_CONTRACT.md.
- Does `PATCH /redlines/{id}` support optimistic concurrency (ETag or `updated_at` precondition)? Until it does, last write wins and we refetch on focus.
- Is there an endpoint for the original uploaded file? We assume there isn't.

## 13. Definition of Done

- [ ] Features 1–8 implemented with loading/empty/error states
- [ ] Critical flows (TESTING.md §5) pass in Playwright against the compose stack
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` pass
- [ ] Zero axe violations (unit and e2e), and `pnpm tokens:contrast` passes
- [ ] SECURITY.md checklist satisfied
- [ ] Docs and CLAUDE.md updated for any behavior change
