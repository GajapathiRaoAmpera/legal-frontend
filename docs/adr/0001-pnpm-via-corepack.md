# ADR-0001: pnpm 9 via corepack / npx (no global install)

Status: Accepted (2026-10-30)

## Context
The spec mandates pnpm, but the dev host has Node 24 and npm 11 with no pnpm installed globally. The compose `web` image and CI also need a reproducible package manager version.

## Decision
- Pin with `"packageManager": "pnpm@9.15.0"` in `package.json`, and commit `pnpm-lock.yaml`.
- Locally: run `corepack enable` once if permitted (it writes shims to the Node install dir). Otherwise prefix every command with `npx pnpm@9` (for example `npx pnpm@9 install`, `npx pnpm@9 dev`). Both resolve to the same major. `pnpm` in docs means either form.
- Docker `web` build: `RUN corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --frozen-lockfile`.
- CI: `pnpm/action-setup@v4` with `version: 9.15.0`, or `corepack enable`.
- `.npmrc`: `engine-strict=true`, and `package.json` `"engines": {"node": ">=22"}`.

## Alternatives
- npm: available, but it has a flatter, non-strict `node_modules` that allows phantom dependencies, and the spec says pnpm.
- yarn berry: another tool to bootstrap, with no benefit here.
- `npm i -g pnpm`: changes the global host state, which we avoid.

## Consequences
- The first `npx pnpm@9` call downloads pnpm into the npx cache (one time).
- Claude Code permissions allow both `pnpm` and `npx` (`.claude/settings.json`).
