# Security Guidelines — Frontend

The frontend is untrusted by design. Every rule here is defense in depth, and all authorization is enforced by the backend.

## 1. Authentication

Authentication Provider: backend-issued JWT (HS256 in dev, OIDC/JWKS-ready).
Methods:
- **Dev login picker** (`AUTH_DEV_MODE=true` only): `POST /api/v1/auth/dev-token {"user":"rita"|"larry"|"ada"}` → `{access_token, user}` (ADR-0004). The picker is hidden if the endpoint is absent.
- **OIDC** (future): Authorization Code + PKCE behind the same `AuthProvider` interface. No implicit flow.

Token storage (`src/auth/session.ts`, the only module that touches it):
- The source of truth is a module-scoped in-memory variable.
- It is mirrored to `sessionStorage["auth.session"]` (`{access_token, user, exp}`) so a reload in the same tab survives. It is cleared on tab close. It is **never** stored in `localStorage`, cookies set by JS, IndexedDB, URLs (except the SSE exception below) or logs.
- `exp` is decoded from the JWT payload (base64url, no signature check, display only). The session is cleared when `exp` is in the past. Every 401 clears it.
- Sign-out clears memory, sessionStorage, the TanStack Query cache (`queryClient.clear()`) and `drafts.redlines`.
- **SSE exception:** `EventSource` cannot send headers, so the contract specifies `?access_token=`. Mitigations: always use the current (short-lived) token and rebuild the URL on reconnect, never render or log the URL, and the backend/proxy must not log query strings for `/events` (documented in the backend SECURITY.md). Use `Referrer-Policy: no-referrer`.

## 2. Authorization

Roles: `reviewer`, `lawyer`, `admin` (from `GET /me`, a user can have several).

### Reviewer
- Upload contracts. Accept / reject / edit redlines. Comment. Send feedback.
### Lawyer
- Everything any user can do, plus `POST /packages/{id}/approvals` (approve / request changes / reject). Only lawyers.
### Admin
- Playbook create/update/delete. Start eval runs.
### Any authenticated user
- Read contracts, clauses, risk report, redlines, package, approvals, audit, playbook, eval. Export after approval. Comment.

The UI hides or disables actions the user's roles cannot perform (`RequireRole`, `useCan(action)`), and always handles 403 anyway. **Authorization must be enforced server-side.** The UI is never the gate.

## 3. Secrets

- The frontend has no secrets. Anything in `import.meta.env.VITE_*` is public and shipped to the browser.
- Never hard-code credentials or tokens, including test JWTs. E2E gets tokens from the dev-token endpoint at runtime.
- Never commit `.env*` (gitignored). `.env.example` is allowed and holds public values only.

## 4. Environment Variables

Public (build time, `VITE_` prefix):
- `VITE_API_BASE` (default `/api/v1`): API base path. Same-origin by default.
- `VITE_AUTH_MODE` (`dev` | `oidc`, default `dev`).
- `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID` (future, public by nature).
Dev/tooling only (not bundled):
- `API_PROXY_TARGET` (Vite dev proxy, default `http://localhost:8000`).
- `OPENAPI_URL` (gen:api source, default `http://localhost:8000/openapi.json`).
- `E2E_BASE_URL` (Playwright, default `http://localhost:8080`).
Private: none.

## 5. API Security

Input validation: client-side validation is UX only (file type/size, required reject comment, field lengths mirroring the backend). The server is authoritative, and 422 problem details are shown per field.
Rate limiting: respect `429 Retry-After`. Disable the control until the time is up. Background fetches are serialized.
CORS: not used. The API is same-origin through the dev proxy or the compose reverse proxy, so no `Access-Control-Allow-*` is needed. Do not add `mode: "cors"` or `credentials: "include"`.
Authentication: the `Authorization: Bearer` header is added by `openapi-fetch` middleware. Never put the token in request bodies or non-SSE URLs.
Authorization: see §2.
Error display: show problem+json `title`/`detail` only. Never echo request bodies, stack traces or headers.

### Content Security Policy (production, set by the `web` container)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self';
  worker-src 'self' blob:;
  frame-src 'none';
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'none';
  form-action 'self';
  upgrade-insecure-requests
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
```

Consequences for code:
- No inline `<script>` and no inline `<style>` elements. The theme bootstrap lives in `src/main.tsx`, not in `index.html`. React `style={{…}}` props are fine because they are set through the CSSOM. Never use `element.setAttribute("style", …)` or libraries that inject `<style>` tags at runtime.
- There are no third-party origins: fonts are self-hosted through Fontsource, there is no CDN, no analytics and no Google Fonts.
- react-pdf: bundle the pdf.js worker with `import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url"` (same origin) and load the PDF as a `blob:` URL from an authenticated fetch.
- Vite dev server runs without CSP (HMR needs inline/ws). Playwright e2e runs against the compose `web` container, so CSP is exercised there, and the e2e suite fails on any `securitypolicyviolation` console event.

## 6. Data Protection

Sensitive data: contract text, clause text, redlines, negotiation notes, comments, user names, JWTs.
Rendering rules:
- **Never use `dangerouslySetInnerHTML`** anywhere, and especially not for contract text, redlines, comments, executive summaries or `report_md`. ESLint `react/no-danger: error`. Contract text is rendered as React text nodes, and highlights are `<mark>`/`<span>` elements wrapping string slices.
- Never pass API strings to `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `new Function`, `eval`, or `href`/`src` without a URL check (`lib/safeUrl.ts` allows only `https:`, `http:` for same origin, and `blob:` created by us).
- `report_md` (eval) renders as preformatted text (`<pre>`). No markdown-to-HTML.
- Diffs are computed on plain strings, and the resulting fragments are rendered as text nodes.
Encryption: TLS in transit (terminated by the proxy in production). Nothing is encrypted at rest in the browser, because nothing sensitive is persisted except the session-scoped token and redline drafts in sessionStorage.
Retention: the TanStack Query cache is in-memory only (no persister). Drafts are removed after a successful save or on sign-out.
Deletion: sign-out wipes everything listed in §1. Closing the tab wipes sessionStorage.

## 7. Logging

Never log: tokens, the SSE URL, contract/clause/redline/comment text, negotiation notes, user names, or full problem `detail` when it might echo input.
Log (dev console only, stripped in prod via `import.meta.env.DEV` guards): query/mutation failures as `{key, status, problemType}`, SSE connection state changes `{contractId, state, attempt}`, offset clamping `{clauseId, start, end, textLength}`.
Production telemetry: none in v1. If added, ids, hashes and timings only.

## 8. File Uploads

Allowed file types: `.docx` (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`) and `.pdf` (`application/pdf`). The extension *and* `file.type` are checked, with the extension winning when `file.type` is empty.
Maximum size: 25 MB (25 × 1024 × 1024 bytes), checked before upload.
Validation: client checks are UX only. The server validates type, size, content and virus scan. Show server 413/415/422 inline.
Storage: none in the browser. The file is streamed via `FormData` to `POST /api/v1/contracts`, and the object URL is never created for uploads.

Downloads (export): fetch with auth → `blob` → `URL.createObjectURL` → temporary `<a download>` → `URL.revokeObjectURL` after click. The filename is taken from `Content-Disposition` and sanitized (`[\\/:*?"<>|]` → `_`, max 120 chars).

## 9. Security Checklist

- [ ] Token only in memory + sessionStorage; cleared on 401/sign-out; never logged
- [ ] SSE URL never rendered/logged; rebuilt with fresh token on reconnect
- [ ] Role-gated UI for upload, redline decisions, approvals, playbook edits, eval runs; 403 handled
- [ ] `react/no-danger` and `no-restricted-syntax` (innerHTML etc.) lint rules pass
- [ ] No third-party origins; CSP above passes with zero violations in e2e
- [ ] Upload type/size validated client-side; server errors surfaced
- [ ] Errors show problem `title`/`detail` only
- [ ] `pnpm audit --prod` has no high/critical advisories
- [ ] No `.env*` committed
