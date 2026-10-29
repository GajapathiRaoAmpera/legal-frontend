# Code Style & Conventions — Frontend

## 1. General Principles

- Prefer readable code. Keep functions focused.
- Avoid unnecessary abstractions. A third use justifies a shared helper, a second does not.
- Reuse `components/ui/*`, feature hooks and `lib/*` before writing new ones.
- Prefer consistency over novelty. Match the surrounding file.
- Types come from the backend schema (`@/api/types`). No `any`, no `as unknown as`, and no non-null `!` on API data.

## 2. Naming

Components: `PascalCase` (`RiskBadge`, `RedlineDiff`). One exported component per file, and the file is named after it (`RiskBadge.tsx`).
Hooks: `useCamelCase` (`useClauses`, `useRedlineDecision`), in `useX.ts`.
Functions: `camelCase` verbs (`buildSegments`, `toUtf16Offset`).
Variables: `camelCase`. Booleans are `is/has/can/should` (`canApprove`).
Constants: `SCREAMING_SNAKE_CASE` for module constants (`MAX_UPLOAD_BYTES`, `RISK_META`).
Types: `PascalCase`, with no `I` prefix. Props are `XProps`.
Files: components `PascalCase.tsx`, everything else `camelCase.ts`, tests `*.test.ts(x)` next to the source, e2e `e2e/*.spec.ts`.
API fields: keep the backend's `snake_case` as-is (`start_offset`). Do not remap to camelCase.
Routes: lowercase kebab paths, params `:contractId`, `:runId`. Search params are short lowercase (`clause`, `q`, `level`, `type`, `sort`).
CSS: Tailwind utilities mapped to tokens. Custom classes are only for viewer marks (`.mark-high`, etc., in `features/viewer/marks.css`, tokens only).
Test ids: avoid them. Query by role and name. `data-testid` is allowed only for virtualized containers and canvas-like regions.

## 3. Folder Structure

Feature-first (see ARCHITECTURE.md §7). A feature folder has `components/`, `hooks/`, `lib/` (pure functions), `*.test.ts(x)`, and `routes/` for lazy route modules (`ViewerRoute.tsx` exporting `Component` for React Router `lazy`).

## 4. Imports

- Use the `@/` alias for `src/`. Relative imports only within the same feature folder.
- Order (enforced by `eslint-plugin-import-x` `import-x/order`): react, external, `@/` absolute, relative, then styles. Use `import type` for type-only imports (`@typescript-eslint/consistent-type-imports`).
- Icons are imported by name from `lucide-react`. Never `import * as Icons`.
- Never import from `@/api/schema` outside `@/api/*`.

## 5. Components

Components should:
- Have a single responsibility and render from props + hooks. Data fetching goes in hooks, not in JSX trees.
- Handle all four states: loading (skeleton), empty, error, data.
- Prefer composition (`children`, slots) over boolean prop explosions. Variants use `cva`.
- Be accessible by default: a semantic element first, then Radix for complex widgets.
- Never hardcode colors, sizes outside the spacing scale, or z-index (use the `--z-*` tokens: `dropdown 30, sticky 20, drawer 40, dialog 50, toast 60`).

## 6. Functions

Functions should:
- Do one logical thing. Pure functions (segmenting, offsets, diff, filters) live in `lib/` and are unit-tested.
- Have clear names, early returns, and no nested ternaries in JSX.
- Use `const` arrow functions for callbacks and `function` declarations for top-level components and hooks.

## 7. Error Handling

Use:
- `ApiError` (problem+json) thrown by `client.ts` middleware, and narrowed with `isApiError(err)`.
- TanStack Query `error` states rendered by the `QueryErrorAlert` component. Mutations use `onError` for rollback plus a toast.
- A route-level `errorElement` (`RouteError`) for chunk-load and render errors.
- Exhaustive `switch` with `assertNever` on union types (status, decision, event type).

Do not:
- Swallow errors (`catch {}`), use `console.error` as handling, or show raw messages or stacks.
- Throw strings. Retry 4xx.

## 8. Comments

Comments explain why something exists, important tradeoffs (for example "code points → UTF-16 because the backend uses Python str offsets"), and non-obvious behavior. Avoid comments that repeat the code. `shortcut: <limit>, <when to upgrade>` marks deliberate simplifications.

## 9. Logging

Use: `lib/log.ts` (`log.debug/warn/error`), a no-op in production builds.
Rules:
- Ids, statuses and counts only. Never contract text, tokens or URLs with tokens (SECURITY.md §7).
- No `console.*` outside `lib/log.ts` (ESLint `no-console: error`).

## 10. Formatting

Formatter: Prettier 3 (`printWidth: 100`, `singleQuote: false`, `trailingComma: "all"`, `prettier-plugin-tailwindcss` for class order).
Linter: ESLint 9 flat config with `typescript-eslint` `strictTypeChecked`, `eslint-plugin-react`, `react-hooks`, `jsx-a11y` (strict), `import-x`, and `@tanstack/eslint-plugin-query`. Project rules:
- `react/no-danger: error`
- `@typescript-eslint/no-explicit-any: error`, `no-non-null-assertion: error`
- `no-restricted-syntax`: string literals matching `/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i` (hardcoded colors), and assignments to `innerHTML`/`outerHTML`
- `no-restricted-imports`: `@/api/schema` outside `src/api/`
- `no-console: error`
Token check: `scripts/check-tokens.mjs` greps `src/**/*.{ts,tsx,css}` except `src/styles/tokens.css` for hex/rgb/hsl/oklch literals, any Tailwind arbitrary value on a color-bearing utility (`(bg|text|border|ring|fill|stroke|outline|from|to|via|shadow|decoration)-\[`), because colors and shadows must come from named tokens/utilities, and inline `style` color props. It is part of `pnpm lint`.
Type Checking: `tsc --noEmit -p tsconfig.app.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`).

## 11. Do

- Reuse existing patterns and components. Keep changes focused.
- Follow tokens and the a11y rules. Write the test with the change.
- Remove dead code and unused exports.
- Regenerate API types (`pnpm gen:api`) instead of patching types by hand.

## 12. Don't

- Create duplicate utilities or a second fetch wrapper.
- Introduce dependencies for a few lines (ask first, and record it in an ADR if it is structural).
- Copy server data into Zustand. Use `useEffect` to derive state, or put `setState` inside render.
- Use `dangerouslySetInnerHTML`, hardcoded colors, positive `tabIndex`, `div` buttons, or color-only meaning.
- Change unrelated files or edit `src/api/schema.d.ts` by hand.
