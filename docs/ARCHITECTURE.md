# Architecture — Frontend

## 1. System Overview

A single-page React app served as static files by the `web` container in the backend's Docker Compose stack (`../legal-backend/docker-compose.yml` builds `../legal-frontend`). It talks only to the FastAPI backend at same-origin `/api/v1`, over JSON (openapi-fetch), SSE (agent progress) and binary downloads (export). It has no backend of its own and no direct database access.

## 2. Architecture Pattern

Pattern: a client-rendered SPA organised as a modular monolith by feature (`src/features/*`), plus a generated API layer.
Reason: it is an internal authenticated tool, so SSR/SEO bring nothing. A static build keeps CSP strict and deployment trivial. Feature folders keep each screen's hooks, components and tests together.

## 3. Technology Stack

| Concern | Choice |
|---|---|
| Build | Vite 6, `@vitejs/plugin-react` |
| UI | React 18.3, TypeScript 5.x `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` |
| Routing | React Router 6 data router (`createBrowserRouter`, route `lazy`) |
| Server state | TanStack Query v5 |
| UI/client state | Zustand v5 (UI prefs persisted, drafts in sessionStorage) |
| API client | `openapi-fetch`, with types from `openapi-typescript` → `src/api/schema.d.ts` (ADR-0002) |
| Styling | Tailwind CSS v4 mapped to CSS-variable tokens (ADR-0003), `class-variance-authority`, `clsx` |
| Primitives | Radix UI (Dialog, DropdownMenu, Popover, Select, Tabs, Tooltip, Toast, VisuallyHidden) |
| Icons | `lucide-react` |
| Virtualization | `@tanstack/react-virtual` (viewer text, long tables) |
| Tables | `@tanstack/react-table` |
| Diff | `diff-match-patch` |
| PDF preview | `react-pdf` (lazy chunk, approval screen only) |
| Charts | Hand-rolled SVG for heatmap and trends (no chart dependency, so token colors apply directly) |
| Fonts | Fontsource (self-hosted IBM Plex Sans, Source Serif 4, IBM Plex Mono) |
| Tests | Vitest, Testing Library, `vitest-axe`, MSW for API mocks, Playwright + `@axe-core/playwright` |
| Package manager | pnpm 9 via corepack / `npx pnpm@9` (ADR-0001) |
| Authentication | Backend-issued JWT (dev-token picker now, OIDC later behind `AuthProvider`) |
| Hosting | Static `dist/` in the compose `web` service (reverse proxy `/api` → `api:8000`) |
| Payments / Email / Analytics | None |

## 4. System Components

### Frontend (this repo)
Responsibilities:
- Render the 8 features in PRD §6. Enforce role-based *visibility* (the server enforces authorization).
- Map API offsets to rendered highlights. Compute display diffs.
- Manage the session token, SSE subscriptions, optimistic mutations and query caching.
- Meet the a11y, performance and security requirements.

### Backend (`../legal-backend`, not in this repo)
Responsibilities: authn/z, parsing, agents, scoring, redlines, approvals, export, audit, playbook, eval. Source of truth for every type (`/openapi.json`).

### Database
None in the frontend. The browser persists only `localStorage` (`ui.theme`, `ui.density`, `ui.shortcutsEnabled`) and `sessionStorage` (`auth.session`, `drafts.redlines`). See SECURITY.md.

## 5. Architecture Diagram

```
Browser
 ├─ React Router (lazy route chunks)
 │    └─ features/* ── hooks (TanStack Query) ── src/api/client.ts (openapi-fetch + auth middleware)
 │                 └─ useContractEvents (EventSource) ──────────────┐
 ├─ Zustand stores (ui prefs, viewer nav, drafts, session)          │
 └─ tokens.css → Tailwind theme                                     │
        │ same-origin /api/v1  (fetch, JSON / blob)                 │ /api/v1/contracts/{id}/events?access_token=
        ▼                                                           ▼
   web container reverse proxy ───────────────► FastAPI api:8000 ──► worker / LangGraph / Postgres
```

## 6. Data Flow

Example: accepting a redline.
1. The user presses `a` on a focused redline.
2. `useRedlineDecision().mutate({redlineId, action: "accept"})`.
3. `onMutate`: cancel `["redlines", contractId]` queries, snapshot, set `status: "accepted"` optimistically.
4. `POST /api/v1/redlines/{id}/accept` with `Authorization: Bearer`.
5. The backend authorizes (reviewer+), updates the row and writes the audit log.
6. Success: replace the cache entry with the returned `Redline`, then fire-and-forget `POST /feedback {kind: "accept"}`.
7. Error: restore the snapshot, show a toast with the problem+json `title`, and return focus to the redline.
8. `onSettled`: invalidate `["redlines", contractId]`, `["package", contractId]` and `["audit", contractId]`.

## 7. Project Structure

```
src/
  main.tsx                  # theme/density bootstrap, QueryClient, RouterProvider
  app/
    router.tsx              # route table (below), all leaf routes lazy
    AppShell.tsx            # header, skip link, <main id="main">, footer disclaimer, RouteAnnouncer
    RequireAuth.tsx         # redirects to /login?next=
    RequireRole.tsx         # visibility gate; shows explanation, not a blank page
    queryClient.ts
  api/
    schema.d.ts             # GENERATED by `pnpm gen:api` — never edit
    client.ts               # createClient<paths>() + auth/problem middleware
    types.ts                # aliases of components["schemas"][...] — the only import site for API types
    errors.ts               # ApiError (problem+json), isApiError
    sse.ts                  # SSE event payload types (not in OpenAPI) + parse guards
    keys.ts                 # query key factory
  auth/
    session.ts              # in-memory token + sessionStorage mirror
    AuthProvider.tsx        # DevTokenProvider now; OidcProvider later, same interface
    useMe.ts
  features/
    contracts/              # list, upload dialog, progress row
    viewer/                 # text model, segmenter, virtualized text, outline, search, shortcuts
    risk/                   # riskMeta, RiskBadge, dashboard, heatmap, provenance drawer
    redlines/               # list, diff view, decision hooks, comments, negotiation note
    approval/               # package view, decision form, audit trail, export, pdf preview
    playbook/               # positions, versions, diff
    eval/                   # runs, trends, run detail
  components/ui/            # Button, IconButton, Input, Textarea, Select, Dialog, Drawer, Tabs, Toast,
                            # Tooltip, Badge, Card, DataTable, Skeleton, Alert, Kbd, VisuallyHidden
  hooks/                    # useHotkeys, useMediaQuery, useReducedMotion, useRouteFocus, useContractEvents
  stores/                   # ui.ts (theme, density, shortcutsEnabled), drafts.ts, viewer.ts
  styles/                   # tokens.css (only file with color literals), app.css (Tailwind + @theme)
  lib/                      # offsets.ts (code point ↔ UTF-16), download.ts, format.ts
  test/                     # setup.ts, msw handlers, fixtures (typed from schema)
e2e/                        # Playwright specs + fixtures/ (sample MSA .docx, SaaS .pdf copied from backend fixtures)
scripts/                    # check-contrast.mjs, check-tokens.mjs, gen-api.mjs
```

Routes (each leaf is `lazy: () => import(...)`, giving one chunk per screen):

| Path | Screen | Role to act |
|---|---|---|
| `/login` | Dev login picker / SSO button | public |
| `/` | redirect → `/contracts` | any |
| `/contracts` | Contracts list + upload | upload: reviewer |
| `/contracts/:contractId` | Contract viewer (`?clause=`, `?q=`, `?high=1`) | any |
| `/contracts/:contractId/risks` | Risk dashboard (`?level=&type=&sort=&q=`) | any |
| `/contracts/:contractId/redlines` | Redline editor (`?redline=`) | decide: reviewer |
| `/contracts/:contractId/approval` | Lawyer approval + export | decide: lawyer |
| `/playbook` | Playbook positions (`?type=`) | edit: admin |
| `/playbook/versions` | Version history | any |
| `/playbook/versions/:a/diff/:b` | Version diff | any |
| `/eval` | Evaluation runs + trends | start run: admin |
| `/eval/:runId` | Eval run detail | any |
| `*` | Not found | public |

## 8. Dependency Rules

- Components never call `fetch` or `client` directly. They use feature hooks, which use `src/api/client.ts`.
- API types are imported only from `@/api/types` (which re-exports from the generated `schema.d.ts`). Never hand-write a type that duplicates a schema.
- `features/A` may import from `components/`, `hooks/`, `lib/`, `api/`, `stores/` and from `features/risk` (shared risk meta). Never import from another feature's internals. Shared code moves to `components/` or `lib/`.
- Server data lives in TanStack Query only, never copied into Zustand. Zustand holds UI state: theme, density, shortcut toggle, viewer filter/focus, drafts.
- Only `src/styles/tokens.css` contains color literals.
- Only `src/auth/session.ts` touches token storage.

## 9. Key Technical Decisions

`src/api/types.ts` (the full alias set, so every skill and feature uses the same names):

```ts
import type { components } from "./schema";
type S = components["schemas"];

export type ClauseType = S["ClauseType"];            // "liability" | "indemnity" | "termination" | "auto_renewal" | "payment" | "ip" | "confidentiality" | "data_protection" | "governing_law" | "other"
export type RiskLevel = S["RiskLevel"];              // "High" | "Medium" | "Low"
export type ContractStatus = S["ContractStatus"];    // "uploaded" | "parsing" | "analyzing" | "awaiting_lawyer" | "changes_requested" | "approved" | "rejected" | "failed"
export type RedlineStatus = S["RedlineStatus"];      // "proposed" | "accepted" | "rejected" | "edited"
export type ApprovalDecision = S["ApprovalDecision"];// "approve" | "request_changes" | "reject"
export type PlaybookPosition = S["PlaybookPosition"];// "preferred" | "fallback" | "unacceptable"
export type Provenance = S["Provenance"];
export type Contract = S["Contract"];
export type Clause = S["Clause"];
export type RiskAssessment = S["RiskAssessment"];
export type Redline = S["Redline"];
export type Comment = S["Comment"];
export type ReviewPackage = S["ReviewPackage"];
export type Approval = S["Approval"];
export type AuditEvent = S["AuditEvent"];
export type PlaybookPositionOut = S["PlaybookPositionOut"];
export type PlaybookVersion = S["PlaybookVersion"];
export type EvalRun = S["EvalRun"];

export type ClauseWithRisk = Clause & { risk: RiskAssessment | null };
export type ContractText = { text: string; sections: { id: string; heading: string | null; start_offset: number; end_offset: number; order: number }[] };
export type RiskReport = { contract_id: string; counts: Record<RiskLevel, number>; heatmap: ({ clause_type: ClauseType } & Record<RiskLevel, number>)[]; executive_summary: string; items: ClauseWithRisk[] };
export type Page<T> = { items: T[]; total: number; limit: number; offset: number };
export type Me = { id: string; name: string; roles: ("reviewer" | "lawyer" | "admin")[] };
```

If the backend's Pydantic model names differ (for example `ContractOut`), change the right-hand side here only. Composite response types (`ContractText`, `RiskReport`, `Page<T>`) are replaced by their generated schema once the backend names them. `src/api/contract.test-d.ts` asserts the enum unions above with `expectTypeOf`, so drift breaks `pnpm typecheck`.

`src/api/sse.ts` (SSE is not described by OpenAPI, so these types follow API_CONTRACT.md):

```ts
export type ProgressEvent = { stage: string; node: string; done: number; total: number; message: string };
export type StatusEvent = { status: ContractStatus };
export type ErrorEvent = { message: string; code?: string };
export type ContractEvent =
  | { type: "progress"; data: ProgressEvent }
  | { type: "status"; data: StatusEvent }
  | { type: "done" }
  | { type: "error"; data: ErrorEvent };
```

Query keys (`src/api/keys.ts`): `["me"]`, `["contracts", {limit, offset, status}]`, `["contract", id]`, `["contract-text", id]`, `["clauses", id]` (infinite), `["risk-report", id]`, `["redlines", id]`, `["package", id]`, `["approvals", packageId]`, `["audit", id]`, `["playbook", "positions", clauseType]`, `["playbook", "versions"]`, `["playbook", "diff", a, b]`, `["eval", "runs"]`, `["eval", "run", id]`.

Defaults: `staleTime: 30_000`, `gcTime: 5 * 60_000`, `retry: (n, err) => n < 2 && !(isApiError(err) && err.status < 500)`, `refetchOnWindowFocus: true` for package/redlines and false for contract text. The contract text is immutable per `current_version_id`, so it uses `staleTime: Infinity`.

SSE hook (`src/hooks/useContractEvents.ts`):

```ts
export function useContractEvents(
  contractId: string,
  opts: { enabled: boolean; onEvent?: (e: ContractEvent) => void },
): { lastProgress: ProgressEvent | null; status: ContractStatus | null; connection: "connecting" | "open" | "reconnecting" | "closed" };
```
- URL: `/api/v1/contracts/${id}/events?access_token=${encodeURIComponent(token)}`.
- `progress` → setState. `status` → `setQueryData(["contract", id])` plus an invalidation of the contracts list. `done` → `close()` and invalidate clauses, risk-report, redlines and package. Server `error` (a `MessageEvent` with `data`) → show the error and close.
- A connection error (a plain `Event`, `readyState === CLOSED`) → reconnect with exponential backoff (1s, 2s, 4s … max 30s, ±20% jitter) using a *fresh* token. On every (re)open, invalidate `["contract", id]`, because events during the gap are lost.
- Enabled only while the status is in `{uploaded, parsing, analyzing}`, or while an approval is resuming the graph. Closed on unmount and on `document.visibilitychange` hidden for more than 60s (reopened when visible).
- At most 6 concurrent streams on the list page (the HTTP/1.1 per-origin limit). Rows beyond 6 poll `GET /contracts/{id}` every 5s.

Decisions (details in `docs/adr/`):

| Decision | Context | Alternatives | Reason |
|---|---|---|---|
| ADR-0001 pnpm via corepack | pnpm not installed globally | npm, yarn | Strict node_modules and a fast lockfile, with no global install needed |
| ADR-0002 openapi-typescript + openapi-fetch | Must not hand-write API types, and no `any` | orval, openapi-generator, axios + manual types | Zero runtime codegen, about 6 KB client, path/param/response typing straight from the schema |
| ADR-0003 CSS variables + Tailwind v4 `@theme` | Tokens, theme switch, ban hardcoded colors | CSS-in-JS, Tailwind default palette | Runtime theme switching without rebuild, and the deleted default palette makes off-token classes impossible |
| ADR-0004 Dev login picker on `/auth/dev-token` | Need roles in dev/e2e without an IdP | Hardcoded tokens, a mock IdP | Uses the backend's real JWT path, so e2e exercises real authz |

## 10. Performance Considerations

- Route-level code splitting. react-pdf, diff-match-patch and the eval charts load only in their routes.
- Budgets (gzip, checked by `scripts/check-bundle.mjs` in `pnpm verify` using `dist/.vite/manifest.json`): app shell + login ≤ 180 KB JS, each route chunk ≤ 120 KB, react-pdf chunk excluded but lazy.
- Viewer: block-level virtualization (one virtual item per section or paragraph block, measured dynamically), segment computation memoized per block, `content-visibility` not relied on. Search runs over the raw string in chunks off the critical path.
- Progressive clauses: `useInfiniteQuery` with `limit=200`, auto-fetching subsequent pages in the background until `total` is reached. Highlights appear as pages land.
- Optimistic updates for redline accept/reject/edit and comments. Never for approvals.
- Fonts: preload only Plex Sans Variable latin and Source Serif 4 latin, with `font-display: swap`.
- Targets: LCP < 2.5s on the list, INP < 200ms, CLS < 0.05, viewer scroll at 60fps on a 2020 laptop for 200+ pages.

## 11. Scalability Considerations

- About 2,000 clauses and about 1M characters per contract: virtualized text, list and outline.
- Contracts list: server pagination (limit 25), no client-side full fetch.
- Cache memory: `gcTime` 5 min. Viewer text is evicted when leaving the contract.
- Rate limits: 60 req/min/user. Background clause page fetching is sequential (one in flight), and SSE replaces polling wherever possible.

## 12. Failure Scenarios

| Scenario | Expected behavior |
|---|---|
| Backend unavailable / network error | Query error state with Retry. Mutations roll back with a toast. The app shell still renders. |
| API timeout (>30s, `AbortSignal.timeout(30_000)` in client) | Treated as a network error, and retried for GETs only |
| 401 | Clear the session, keep drafts, redirect to `/login?next=` |
| 403 | Inline "You don't have permission to …". Never retried. |
| 409 on export | "Export is available after a lawyer approves the package." The package is refetched. |
| 409 on redline mutation | Rollback, refetch, "This redline changed. Review the latest version." |
| 422 | Map problem `detail` to the form field. Otherwise inline alert. |
| 429 | Toast with `Retry-After` seconds. Disable the triggering control until then. |
| SSE drops | Backoff reconnect plus a state refetch. The indicator shows "Reconnecting…" |
| Agent pipeline `failed` / SSE `error` | Status badge Failed, the message, "Upload again" |
| Bad offsets from API | Clamp to `[0, text.length]`, skip the span if empty, `console.warn` in dev only (no contract text in logs) |
| Chunk load error after deploy | Error boundary offers "Reload to get the latest version" |
