# Testing — Frontend

## 1. Testing Goals

Critical functionality:
- Offset → highlight mapping (code points, overlaps, block splitting) is exact.
- Keyboard navigation (j/k/h, /, a/r/e) and focus management work without a mouse.
- Redline decisions are optimistic and roll back correctly on failure.
- Approval rules: lawyer-only, comment required on reject, no optimistic approval.
- Export is gated on `approved && approver_id`, and a 409 is handled.
- SSE progress, reconnect and terminal states.
- Zero axe violations in light and dark themes.

## 2. Test Types

### Unit
Pure logic in `lib/` and `features/*/lib`: `offsets.ts` (code point ↔ UTF-16), `buildSegments` (overlaps, nesting, adjacency, empty spans, clamping), `splitIntoBlocks`, `diffWords` (diff-match-patch wrapper with semantic cleanup), risk filters/sort, `parseContentDisposition`, `sanitizeFilename`, `problem.ts` parsing, `riskMeta` exhaustiveness, and the SSE event parser.

### Component / integration (Vitest + Testing Library + MSW)
Components render with a real `QueryClient` and MSW handlers typed from `@/api/types`. Covered: `RiskBadge` (icon + label present), `ClauseOutline`, the virtualized `ContractText` (with a mocked `ResizeObserver` and element sizes), `UploadDialog`, `ProgressRow` (with a fake `EventSource`), `RedlineDiff`, `RedlineActions` (optimistic + rollback), `CommentThread`, `DecisionForm`, `ExportMenu`, `PlaybookDiff`, the `Heatmap` table, and `RouteAnnouncer`. Each component test file ends with an axe check:

```ts
import { axe } from "vitest-axe";
it("has no axe violations", async () => {
  const { container } = renderWithProviders(<RiskBadge level="High" />);
  expect(await axe(container)).toHaveNoViolations();
});
```
(`vitest-axe` matchers registered in `src/test/setup.ts` via `expect.extend(matchers)`. jsdom cannot compute contrast, so the color-contrast rule is covered by `pnpm tokens:contrast` and by Playwright axe.)

### Type tests
`src/api/contract.test-d.ts` uses `expectTypeOf` to assert the enum unions in ARCHITECTURE.md §9 and key fields (`RiskAssessment["span_start"]` is `number`, `ReviewPackage["approver_id"]` is `string | null`). It runs under `vitest --typecheck`.

### End-to-End (Playwright against the compose stack)
Runs against `E2E_BASE_URL` (default `http://localhost:8080`, the compose `web` service) with the backend in `AUTH_DEV_MODE=true` and FakeLLM. Start the stack with `make up` in `../legal-backend`. Projects: `chromium-light`, `chromium-dark` (`colorScheme: "dark"`), `webkit-tablet` (iPad Pro 11 viewport, risk review + approval specs only), and `chromium-reduced-motion` (`reducedMotion: "reduce"`, viewer spec only). Each spec calls `checkA11y(page)` (`@axe-core/playwright`, tags `wcag2a, wcag2aa, wcag21aa, wcag22aa`, zero violations) after every major state change, and fails on any `securitypolicyviolation` or console error.

```ts
import AxeBuilder from "@axe-core/playwright";
export async function checkA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations).toEqual([]);
}
```

Login in e2e: the `loginAs(page, "rita" | "larry" | "ada")` fixture uses the UI picker in `auth.spec.ts`, and in other specs it calls `POST /api/v1/auth/dev-token` and seeds `sessionStorage["auth.session"]` through `page.addInitScript`.

## 3. Testing Tools

Unit / component: Vitest 3 (jsdom), `@testing-library/react`, `@testing-library/user-event`, `vitest-axe` (axe-core), MSW 2.
Type: `vitest --typecheck`.
E2E: Playwright 1.x + `@axe-core/playwright`.
Static: ESLint (`jsx-a11y` strict), `tsc --noEmit`, `scripts/check-tokens.mjs`, `scripts/check-contrast.mjs`.

## 4. Test File Structure

```
src/**/X.test.ts(x)            # colocated unit + component tests
src/api/contract.test-d.ts     # type tests
src/test/setup.ts              # jest-dom + vitest-axe matchers, MSW server, ResizeObserver/matchMedia/EventSource fakes
src/test/handlers.ts           # MSW handlers (typed)
src/test/fixtures.ts           # typed builders: makeContract(), makeClause(), makeRisk(), makeRedline(), makePackage()
e2e/fixtures/                  # sample-msa.docx, saas-agreement.pdf (copied from ../legal-backend test fixtures)
e2e/support/                   # loginAs, checkA11y, waitForStatus
e2e/*.spec.ts
playwright.config.ts
```

## 5. Critical User Flows

Flow: Golden path (`e2e/golden.spec.ts`)
1. `loginAs("rita")`, then upload `sample-msa.docx` with the title "Acme MSA".
2. The progress row announces stages (`aria-live` text changes). Wait for the status "Awaiting lawyer" (≤ 120s with FakeLLM).
3. Open the review, which lands on the viewer. Press `h` to see only High clauses, and `j` until the "Liability" clause is focused. Its badge reads "High".
4. Go to Risks, check the heatmap cell "Liability, High" and the provenance drawer showing the model id and prompt version.
5. Go to Redlines: accept the first, edit the second (type text, `Ctrl+Enter`), reject the third, and add a comment.
6. Sign out, `loginAs("larry")`, go to Approval, check the consistency issues and audit trail, approve with a comment, and confirm.
7. Export "Redlined .docx". The download filename ends in `.docx` and its size is > 0.
Expected result: the package is `approved`, the audit trail lists every action, there are zero axe violations at each step, and there are zero CSP violations.

Flow: Export blocked before approval (`e2e/export-gate.spec.ts`)
1. As Rita on an unapproved contract, the Approval page shows Export disabled with the reason.
2. A direct `GET /export` (via `page.request`) returns 409. The UI message renders when forced.
Expected result: no download happens before approval.

Flow: Reject requires a comment (`e2e/approval.spec.ts`)
1. As Larry, choose Reject with an empty comment. The field error appears and focus moves to the textarea.
2. Add a comment and confirm. The status is "Rejected" and export stays disabled.
3. As Rita, the decision controls are absent and the explanation is shown.

Flow: Keyboard-only review (`e2e/keyboard.spec.ts`)
1. Tab from the skip link to main, use `j`/`k`/`h`, then `/` search, type, `Enter`, and `Esc` returns focus.
2. In Redlines, `a`/`r`/`e` work. In Settings, turning shortcuts off disables `j`.
Expected result: every step is reachable without a mouse, and the focus indicator is always visible (screenshot assertion on the focused element's outline).

Flow: Optimistic rollback (`src/features/redlines/RedlineActions.test.tsx`)
1. MSW returns 500 for `POST /redlines/:id/accept`.
2. Click Accept. The status shows "Accepted" immediately, then reverts to "Proposed" and an error toast appears.
Expected result: the cache equals the snapshot, and focus is back on the Accept button.

Flow: Large contract (`e2e/large.spec.ts`, tagged `@slow`)
1. Upload a 220-page generated PDF fixture. Open the viewer.
2. Time-to-first-highlight is under 2s after the text response. Scrolling to the end keeps under 200 rendered blocks in the DOM.

Flow: SSE reconnect (`src/hooks/useContractEvents.test.ts`)
1. A fake EventSource opens, emits `progress`, then fails with `readyState=CLOSED`.
2. The hook reports "reconnecting", reconnects after 1s (fake timers) with a fresh token, and invalidates `["contract", id]`.
3. A server `error` MessageEvent closes the stream with no reconnect.

## 6. Coverage

Target: 90% lines for `lib/` and `features/*/lib` (pure logic), 75% overall statements. Enforced by `vitest --coverage` thresholds.
Prioritize: offsets/segments, redline/approval mutations, auth/session, export gating, SSE, and keyboard handlers.

## 7. Commands

Test: `pnpm test` (`vitest run --typecheck`). Use `pnpm test:watch` for development.
E2E: `pnpm test:e2e` (`playwright test`, with the stack up via `make -C ../legal-backend up`).
Lint: `pnpm lint` (eslint + check-tokens).
Build: `pnpm build`.
Type Check: `pnpm typecheck`.
Contrast: `pnpm tokens:contrast`.
All: `pnpm verify` (lint, typecheck, test, tokens:contrast, build, bundle budget).

## 8. Definition of Done

- [ ] Tests pass (`pnpm test`)
- [ ] Build passes
- [ ] Lint (including the token check) passes
- [ ] Type checking passes
- [ ] Contrast check passes
- [ ] Critical flows verified in Playwright against compose (light + dark)
- [ ] Zero axe violations; zero CSP violations; no console errors
