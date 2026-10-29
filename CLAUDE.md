# CLAUDE.md — legal-frontend

The frontend of the **Contract & Procurement Risk Reviewer**. Reviewers triage AI-scored clauses and decide on redlines, lawyers approve the package, and only an approved package exports as a redlined .docx.

Read `docs/AGENTS.md` (operating rules) and the matching `.claude/skills/<name>/SKILL.md` before working on an area. The API contract lives in `../legal-backend/docs/API_CONTRACT.md` and is read-only from this repo. If it is insufficient, raise it; never work around it.

## Stack
React 18 · TypeScript strict (no `any`) · Vite 6 · Tailwind v4 mapped to CSS-variable tokens · TanStack Query v5 (server state) · Zustand v5 (UI state) · React Router 6 (lazy routes) · Radix UI · lucide-react · TanStack Virtual / Table · diff-match-patch · react-pdf · openapi-typescript + openapi-fetch · Vitest + Testing Library + vitest-axe + MSW · Playwright + @axe-core/playwright. Fonts: IBM Plex Sans (UI), Source Serif 4 (contract text), IBM Plex Mono (ids), self-hosted via Fontsource.

## Commands
pnpm is not installed globally. Use `npx pnpm@9 <cmd>`, or run `corepack enable` once and then `pnpm <cmd>` (ADR-0001).

| Command | What |
|---|---|
| `pnpm install` | install (frozen lockfile in CI) |
| `pnpm dev` | Vite on :5173, proxies `/api` → `API_PROXY_TARGET` (default http://localhost:8000) |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm lint` | `eslint . && node scripts/check-tokens.mjs` |
| `pnpm typecheck` | `tsc --noEmit -p tsconfig.app.json` |
| `pnpm test` | `vitest run --typecheck` (unit + component + axe + type tests) |
| `pnpm test:e2e` | `playwright test` against the compose stack (`make -C ../legal-backend up`, `E2E_BASE_URL` default http://localhost:8080) |
| `pnpm gen:api` | regenerate `src/api/schema.d.ts` from the backend OpenAPI (below) |
| `pnpm tokens:contrast` | `node scripts/check-contrast.mjs`, the WCAG gate on tokens (`--md` prints the table) |
| `pnpm verify` | lint → typecheck → test → tokens:contrast → build → bundle budget (also `/verify`) |

## API types
`pnpm gen:api` (`scripts/gen-api.mjs`) reads `OPENAPI_URL` (default **http://localhost:8000/openapi.json**). If that is unreachable it falls back to **`../legal-backend/openapi.json`** (the backend snapshot), then to the local `openapi.snapshot.json`. It runs `openapi-typescript` → `src/api/schema.d.ts` (committed, never hand-edited). Import types only from `@/api/types` (aliases such as `type RiskLevel = components["schemas"]["RiskLevel"]`). Call the API only through `src/api/client.ts` (openapi-fetch) inside feature hooks. Base path `/api/v1`, same-origin. See ADR-0002 and `/gen-api-types`.

## Conventions
- Feature folders `src/features/<feature>`. Data in hooks (TanStack Query), UI state in Zustand, and never copy server data into Zustand.
- API fields stay `snake_case`. Components are `PascalCase.tsx`, hooks are `useX.ts`, tests are colocated `*.test.tsx`.
- Every view handles loading / empty / error / data.
- Optimistic updates with rollback for redline accept/reject/edit and comments. **Never optimistic for approvals.**
- **No hardcoded colors — tokens only.** Hex/rgb/hsl/oklch literals are allowed only in `src/styles/tokens.css`. Tailwind's default palette is deleted (`--color-*: initial`). Enforced by ESLint `no-restricted-syntax` and `scripts/check-tokens.mjs` (part of `pnpm lint` and `/verify`), which also rejects arbitrary color utilities (`bg-[#…]`) and inline style colors.
- **Never `dangerouslySetInnerHTML`** (ESLint `react/no-danger`). Contract text renders as text nodes.
- The token lives in memory, mirrored to sessionStorage only (SECURITY.md). Never log tokens or contract text.
- Risk is always icon + label + token color: High `ShieldAlert`, Medium `TriangleAlert`, Low `CircleCheck` (`RISK_META` in `src/features/risk/riskMeta.ts`).
- Commits: Conventional Commits (`feat(viewer): …`), ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.

## Screens & routes
| Route | Screen |
|---|---|
| `/login` | Dev login picker (Rita reviewer / Larry lawyer / Ada admin) via `POST /api/v1/auth/dev-token` |
| `/contracts` | Contracts list + upload, live agent progress over SSE |
| `/contracts/:contractId` | Contract viewer: risk-highlighted text, clause outline, sticky risk summary, shortcuts, virtualized (`?clause=`, `?q=`, `?high=1`) |
| `/contracts/:contractId/risks` | Risk dashboard: summary cards, clause type × severity heatmap, filterable/sortable list, executive summary, provenance drawer |
| `/contracts/:contractId/redlines` | Redline editor: side-by-side diff, accept/reject/edit, comments, negotiation note (`?redline=`) |
| `/contracts/:contractId/approval` | Lawyer approval: package, Approve/Request changes/Reject (comment required on reject), audit trail, export after approval |
| `/playbook`, `/playbook/versions`, `/playbook/versions/:a/diff/:b` | Playbook admin: positions by clause type, versions, diff |
| `/eval`, `/eval/:runId` | Evaluation runs, metric trends, run detail |

## Keyboard shortcuts
Active only when focus is not in an input/textarea/select/contenteditable. They can be turned off in Settings (WCAG 2.1.4), and the `?` button in the header lists them.
- Viewer: `j` / `k` next / previous clause · `h` toggle High-risk only · `/` focus search (`Enter`/`Shift+Enter` next/previous hit, `Esc` clear and return focus)
- Redlines: `j` / `k` next / previous redline · `a` accept · `r` reject · `e` edit · `Ctrl/⌘+Enter` save edit · `Esc` cancel

## Accessibility (WCAG 2.2 AA, a gate rather than a goal)
Landmarks plus a "Skip to main content" link. Focus moves to the `<h1>` on route change and to the pane heading on pane change. Use `aria-live="polite"` for agent progress (throttled) and `role="alert"` for blocking errors. Full keyboard operation with a visible `:focus-visible` ring (tokens). Respect `prefers-reduced-motion`. Targets are ≥24px (44px on coarse pointers). Never convey meaning by color alone. Zero axe violations in unit (vitest-axe) and e2e (@axe-core/playwright, light + dark). Token contrast is verified by `pnpm tokens:contrast` (table in `docs/DESIGN_SYSTEM.md` §3.6).

## Legal disclaimer
Every page footer shows, verbatim: **"This tool assists legal review and does not constitute legal advice."**

## Docs
`docs/PRD.md` · `docs/DESIGN_SYSTEM.md` · `docs/ARCHITECTURE.md` · `docs/SECURITY.md` · `docs/CODE_STYLE.md` · `docs/TESTING.md` · `docs/AGENTS.md` · `docs/adr/`
