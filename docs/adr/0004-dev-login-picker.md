# ADR-0004: Dev login picker using the backend dev-token endpoint

Status: Accepted (2026-10-30)

## Context
The roles reviewer / lawyer / admin drive the whole UX, and only lawyers may approve. There is no IdP in dev, compose or CI. The backend exposes `POST /api/v1/auth/dev-token {"user": "rita"|"larry"|"ada"}` → `{access_token, user}` when `AUTH_DEV_MODE=true`.

## Decision
- `/login` renders a picker with three radio cards: Rita (reviewer), Larry (lawyer), Ada (admin). The role labels come from the `user` in the response and from `GET /me`, never from the name. The submit button reads "Sign in as Rita".
- Availability probe: the picker shows if `VITE_AUTH_MODE === "dev"`. A 404/405/403 from dev-token shows "Dev sign-in is disabled on this server" plus an SSO button (future `OidcProvider`).
- After success: `session.set({access_token, user})` (memory + sessionStorage, SECURITY.md §1), then `queryClient.fetchQuery(["me"])`, then navigate to `next` (validated: it must start with `/` and not `//`), otherwise `/contracts`.
- A visible "Dev mode" badge in the header while `VITE_AUTH_MODE === "dev"`.
- `AuthProvider` interface: `{ signIn(input): Promise<Session>; signOut(): void; getToken(): string | null }`, so OIDC can replace it without touching features.
- E2E uses the same endpoint (`loginAs` fixture). One spec exercises the picker UI.

## Alternatives
- Hardcoded JWTs in `.env`: secrets in files, they expire, and they skip the backend auth path.
- A mock IdP container (Keycloak / dex): realistic, but heavy for v1. It is deferred to the OIDC work.

## Consequences
- Production builds set `VITE_AUTH_MODE=oidc`, and the backend disables the endpoint. Both sides must be off for the picker to be unreachable.
- Open redirect is prevented by the `next` validation.
