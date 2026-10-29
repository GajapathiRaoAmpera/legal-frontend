# ADR-0002: openapi-typescript + openapi-fetch for the API layer

Status: Accepted (2026-10-30)

## Context
The backend publishes `/openapi.json` (FastAPI). The spec requires generated types and no `any`. The contract is evolving in parallel with the backend.

## Decision
- `openapi-typescript` (devDependency) generates `src/api/schema.d.ts` (types only, zero runtime).
- `openapi-fetch` (about 6 KB) is the only HTTP client: `createClient<paths>({ baseUrl: "" })`, with the paths exactly as they appear in the schema (for example `/api/v1/contracts/{contract_id}`). Path params, query, body and responses are all typed from `paths`.
- `pnpm gen:api` runs `scripts/gen-api.mjs`:
  1. If `OPENAPI_URL` (default `http://localhost:8000/openapi.json`) responds within 3s, fetch it and also write the snapshot to `openapi.snapshot.json` in this repo.
  2. Else use `../legal-backend/openapi.json` (the backend's committed snapshot) if it exists.
  3. Else use the local `openapi.snapshot.json`.
  4. Else exit 1 with "Start the backend (make -C ../legal-backend up) or export its schema."
  Then run `openapi-typescript <source> -o src/api/schema.d.ts --alphabetize`, followed by `prettier --write`.
- `src/api/schema.d.ts` and `openapi.snapshot.json` are committed, so builds and CI never need a running backend. CI runs `pnpm gen:api` against the snapshot and fails if `git diff --exit-code src/api/schema.d.ts` is dirty.
- Middleware in `src/api/client.ts`: `onRequest` adds `Authorization` and `AbortSignal.timeout(30_000)`. `onResponse` turns non-2xx `application/problem+json` into a thrown `ApiError {status, type, title, detail, instance, retryAfter}` and clears the session on 401.
- Binary export uses `client.GET(path, { parseAs: "blob" })`.
- SSE stays on native `EventSource` (not in OpenAPI). Its event types are hand-written in `src/api/sse.ts`, following API_CONTRACT.md.
- Domain aliases live only in `src/api/types.ts`.

## Alternatives
- orval / openapi-generator: they generate runtime code and hooks, which means bigger bundles, opinionated hook shapes that clash with our query keys, and noisy regenerations.
- axios + hand-written types: type drift, and violates "generate types".
- zod schemas from OpenAPI: runtime validation is useful, but redundant with a trusted same-origin backend that validates with Pydantic. It can be revisited if we ever consume third-party APIs.

## Consequences
- A backend rename of a schema model breaks `pnpm typecheck` at `src/api/types.ts`, which is the intended single point of repair.
- `src/api/contract.test-d.ts` guards the enum unions.
