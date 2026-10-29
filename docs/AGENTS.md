# AI Coding Agent Instructions — Frontend

The root `CLAUDE.md` is the entry point Claude Code loads. This file holds the full operating rules, and CLAUDE.md links here.

## 1. Project Context

Project: Contract & Procurement Risk Reviewer — frontend (`legal-frontend`).
Purpose: A review workspace for AI-scored contract clauses, redline decisions and lawyer approval, ending in a redlined .docx export.
Primary Users: reviewers, lawyers, admins (PRD.md §4).

## 2. Source of Truth

Before significant changes, read the relevant documents in `docs/`:
- PRD.md: scope, screens, flows, acceptance criteria
- DESIGN_SYSTEM.md: tokens, components, contrast
- ARCHITECTURE.md: stack, routes, folders, data flow, `@/api/types`
- SECURITY.md: token storage, CSP, rendering rules
- CODE_STYLE.md: naming, lint rules
- TESTING.md: test types, critical flows
- adr/: recorded decisions
- `../legal-backend/docs/API_CONTRACT.md`: the API (read-only from this repo)

There is no DATABASE.md here. The frontend owns no database (see `../legal-backend/docs/DATABASE.md`).
Before working on an area, read the matching skill in `.claude/skills/<name>/SKILL.md`:

| Area | Skill |
|---|---|
| tokens, components, theming | enterprise-design-system |
| viewer, highlights, outline, shortcuts | contract-viewer-ux |
| redline diff, accept/reject/edit, comments | redline-editor-ux |
| dashboard, heatmap, provenance | risk-dashboard-ux |
| any UI (a11y gate) | legal-a11y |
| approval, audit, export | lawyer-approval-ux |
| virtualization, splitting, SSE, optimistic | contract-ui-performance |

Do not contradict these documents without first identifying the conflict.

## 3. General Rules

- Understand existing code before modifying it. Reuse `components/ui` and feature hooks.
- Follow the design system: tokens only, never a hardcoded color.
- Follow the architecture: hooks for data, Query for server state, Zustand for UI state.
- Follow the API contract: types only via `@/api/types`, and run `pnpm gen:api` after backend changes.
- Follow the security rules: no `dangerouslySetInnerHTML`, tokens stored only per SECURITY.md.
- Do not invent business requirements, such as a new approval rule or a new risk level.
- Do not expose secrets. Avoid unnecessary dependencies and unrelated changes.
- Never touch `../legal-backend` from this repo. Report contract gaps instead.

## 4. Planning

Before a non-trivial task:
1. Read the relevant docs and skill.
2. Inspect the relevant code.
3. Identify the affected files (routes, hooks, components, tests, MSW handlers, fixtures).
4. Identify dependencies (new package? write an ADR).
5. Identify API changes. If the API needs to change, stop and raise it against API_CONTRACT.md.
6. Identify the required tests (unit + axe, and e2e if a critical flow changes).
7. Write a concise plan.

## 5. Implementation

- Make focused changes using established patterns. Preserve existing behavior.
- Every new screen state: loading / empty / error / data.
- Every interactive element: keyboard + visible focus + accessible name.
- Every risk display: icon + label + token color.

## 6. Validation

After implementation (or run `/verify`):
1. `pnpm test`
2. `pnpm lint` (includes the token check)
3. `pnpm typecheck`
4. `pnpm build`
5. `pnpm tokens:contrast` if tokens changed
6. `pnpm test:e2e` if a critical flow changed and the compose stack is up
7. Review the diff (`git diff`) for unintended changes.

## 7. Documentation

Update docs when the implementation changes product behavior (PRD), tokens/components (DESIGN_SYSTEM, and regenerate the contrast table with `node scripts/check-contrast.mjs --md`), routes/structure (ARCHITECTURE and CLAUDE.md), security rules, conventions, or tests.

## 8. Conflict Handling

If requirements conflict (for example PRD vs API_CONTRACT, or design vs a11y), do not guess. Name the conflict, cite both sources, and ask. API_CONTRACT wins over frontend docs, and accessibility wins over aesthetics.

## 9. Completion Criteria

A task is complete only when:
- Requirements and acceptance criteria are satisfied.
- `pnpm verify` passes, and e2e passes for affected flows.
- No unintended files changed, and `src/api/schema.d.ts` changed only via `pnpm gen:api`.
- Security and a11y rules are respected.
- Documentation is updated where needed.
