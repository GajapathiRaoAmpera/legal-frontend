---
description: Regenerate src/api/schema.d.ts from the backend OpenAPI schema and repair src/api/types.ts aliases
argument-hint: "[openapi-url-or-path]"
---

Regenerate the frontend API types from `../legal-backend`. Use `pnpm` if available, otherwise `npx pnpm@9`.

1. Pick the source. Use `$ARGUMENTS` if given (a URL or file path, exported as `OPENAPI_URL`). Otherwise `pnpm gen:api` tries, in order:
   - `http://localhost:8000/openapi.json` (backend running: `make -C ../legal-backend up`, or `uv run uvicorn` in the backend),
   - `../legal-backend/openapi.json` (committed backend snapshot),
   - `./openapi.snapshot.json` (local snapshot).
   Tell the user which source was used.
2. Run `pnpm gen:api`. It writes `src/api/schema.d.ts` (and refreshes `openapi.snapshot.json` when fetched live). Never hand-edit `schema.d.ts`.
3. Run `pnpm typecheck`. If `src/api/types.ts` fails because a schema was renamed (for example `Contract` → `ContractOut`), fix the right-hand side of the alias there, and only there. Feature code keeps importing the stable alias names from `@/api/types`.
4. Compare against `../legal-backend/docs/API_CONTRACT.md` (read-only). For every enum (`ClauseType`, `RiskLevel`, `ContractStatus`, `RedlineStatus`, `ApprovalDecision`, `PlaybookPosition`) and the core shapes, check the generated types match. `src/api/contract.test-d.ts` asserts the enums, so run `pnpm test -- src/api/contract.test-d.ts`. If the generated schema disagrees with API_CONTRACT.md, **do not** change either. Report the exact mismatch (field, contract says X, schema says Y) for the user to resolve with the backend.
5. Run `pnpm lint && pnpm test` to catch call sites affected by changed request/response shapes, and fix those call sites.
6. Show `git diff --stat src/api openapi.snapshot.json` and summarize the added, removed and changed endpoints and schemas.
