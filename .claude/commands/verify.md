---
description: Run the full frontend quality gate (lint, token check, typecheck, tests + axe, contrast, build, bundle budget) and report failures with fixes
argument-hint: "[--e2e]"
---

Run the frontend verification gate in `legal-frontend`. Use `pnpm` if available, otherwise `npx pnpm@9`. Stop at the first failing step, fix it if the cause is clear and inside this repo, then rerun from that step. Do not weaken a rule, threshold or test to make it pass.

Steps, in order:

1. `pnpm install --frozen-lockfile` (only if `node_modules` is missing or the lockfile changed).
2. `pnpm lint`: ESLint (including `react/no-danger`, `no-explicit-any`, `jsx-a11y`, and the hex-literal `no-restricted-syntax`) **and** `node scripts/check-tokens.mjs`.
   - Double-check the no-hardcoded-colors rule with a grep that must print nothing:
     `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(" src --include=*.ts --include=*.tsx --include=*.css | grep -v "^src/styles/tokens.css:"`
     `grep -rnE "(bg|text|border|ring|fill|stroke|outline|from|via|to|shadow|decoration)-\[" src`
   - Also must print nothing: `grep -rn "dangerouslySetInnerHTML" src`.
3. `pnpm typecheck`.
4. `pnpm test` (Vitest with `--typecheck`; every component test includes a `vitest-axe` assertion).
5. `pnpm tokens:contrast`. If tokens changed, also run `node scripts/check-contrast.mjs --md` and update the table in `docs/DESIGN_SYSTEM.md` §3.6.
6. `pnpm build`, then the bundle budget check (`node scripts/check-bundle.mjs`: shell ≤ 180 KB gzip, each route chunk ≤ 120 KB).
7. If `$ARGUMENTS` contains `--e2e`: check that the compose stack answers: `curl -fsS -o /dev/null ${E2E_BASE_URL:-http://localhost:8080}/` (web) and `curl -fsS http://localhost:8000/readyz` (api, db + migrations). If both succeed, run `pnpm test:e2e`. If it is down, report that e2e was skipped and why. Do not start the stack yourself unless asked.
8. `git status --short` must show no unintended files (in particular `src/api/schema.d.ts` changes only come from `pnpm gen:api`).

Report a short table of step → pass/fail, the failing output trimmed to the relevant lines, what you fixed, and anything left for the user.
