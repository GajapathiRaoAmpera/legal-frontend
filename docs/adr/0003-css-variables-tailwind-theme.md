# ADR-0003: CSS-variable tokens mapped into Tailwind v4 `@theme`

Status: Accepted (2026-10-30)

## Context
We need light/dark themes and a density switch at runtime, a three-layer token system, risk colors with verified contrast, and a hard rule that components contain no hardcoded colors.

## Decision
- `src/styles/tokens.css` holds the primitives plus the semantic tokens per theme (`:root`, `[data-theme="dark"]`) and the density/motion/type/spacing tokens. It is the **only** file allowed to contain color literals. Its color block is copied verbatim from `docs/DESIGN_SYSTEM.md` §3.4.
- `src/styles/app.css` uses `@import "tailwindcss"` plus `@theme inline { --color-*: initial; … }`, mapping utility names to semantic variables (DESIGN_SYSTEM.md §3.5). `--color-*: initial` deletes Tailwind's default palette, so `bg-red-500` simply does not compile into anything.
- Theme switch: set `document.documentElement.dataset.theme`. No rebuild, no `dark:` variants in components.
- Enforcement, three layers:
  1. The Tailwind palette is removed (above).
  2. ESLint `no-restricted-syntax` on string literals with hex/rgb/hsl/oklch.
  3. `scripts/check-tokens.mjs` (in `pnpm lint`) greps `src/` except `tokens.css` for color literals, arbitrary color utilities (`bg-[…]` etc.) and `style={{ color|background… }}`.
- Contrast is enforced by `scripts/check-contrast.mjs` in `pnpm verify`, which parses `tokens.css`.

## Alternatives
- CSS-in-JS theme objects (styled-components, vanilla-extract): runtime cost or a build plugin, and CSP friction (injected `<style>`).
- Tailwind default palette plus a convention: unenforceable.
- Tailwind v3 `tailwind.config.ts` with `colors: { surface: "var(--…)" }`: works, but v4's CSS-first `@theme` keeps tokens and mapping in CSS and removes the JS config.

## Consequences
- Opacity modifiers (`bg-surface/50`) work in Tailwind v4 via `color-mix()`. Supported in all evergreen browsers (Chrome 111+, Safari 16.2+, Firefox 113+).
- Designers change one token file, and the contrast gate re-verifies automatically.
