# Design System

Status: v1, authoritative for all UI in `legal-frontend`. Hex values live **only** in the token block in §3.4. That block is copied verbatim into `src/styles/tokens.css`, the single file allowed to contain color literals. `pnpm tokens:contrast` (`node scripts/check-contrast.mjs`) parses that file, or this document if the file does not exist yet, and fails when any required pair drops below its WCAG threshold.

## 1. Design Direction

Style: Technical / editorial. Swiss-style minimalism tuned for density.
Mood: Calm, exact, trustworthy. It reads like a well-set legal document inside a precise instrument. There is no marketing gloss.

Design Principles:
- **Text is the product.** Contract text gets the best typography on the screen. Chrome recedes: neutral surfaces, 1px borders, almost no shadow.
- **Severity is never color-only.** Every risk signal is icon + text label + color, and every diff is a glyph/decoration + sr-only text + color.
- **Dense but legible.** UI type is 14px with 13px table cells and a 4px spacing grid. Two density modes. Nothing goes below 12px.
- **One accent.** Navy is the only brand hue, used for primary actions, links and focus. Red, amber and green are reserved for risk semantics and diffs.
- **Predictable motion.** Motion confirms state changes, at 120–260ms. Nothing decorative, and none at all under `prefers-reduced-motion`.
- **Keyboard first.** Every action has a visible focus state, and the reviewer's core loop (j/k/h, accept/reject) never needs a mouse.

## 2. Brand

Brand Name: Contract Risk Reviewer (product label in the header: "Risk Reviewer").
Logo: A wordmark only, in IBM Plex Sans 600 at 16px with `--color-fg-default`, plus a 16px lucide `Scale` icon in `--color-primary`. There is no logo image asset, and the mark is never recolored to a risk color.
Brand Voice: Plain, precise, neutral. State facts and next actions ("3 High-risk clauses need a redline decision"). Never alarmist ("DANGER!"), never casual. Buttons start with a verb ("Accept change", "Request changes", "Export redlined .docx"). Never use "OK", "Submit" or "Proceed".
Disclaimer (footer on every page, verbatim): "This tool assists legal review and does not constitute legal advice."

## 3. Color

### 3.1 Layers

1. **Primitives**: raw hex scales (`--neutral-*`, `--navy-*`, `--red-*`, `--amber-*`, `--green-*`). Components never use them.
2. **Semantic**: role tokens (`--color-bg-surface`, `--color-risk-high-fg`, …). These are redefined per theme under `[data-theme="dark"]`. Components and Tailwind use only these.
3. **Component**: per-component tokens that alias semantic tokens (`--badge-high-bg`, `--control-height`). Use them where a component needs a stable hook.

Theme selection: `<html data-theme="light|dark">`. The initial value comes from `localStorage["ui.theme"]` if set, otherwise from `prefers-color-scheme`. An inline-free bootstrap in `src/main.tsx` sets it before first render. A `[data-density="compact|comfortable"]` attribute sits on `<html>` the same way.

### 3.2 Palette summary (light / dark)

| Role | Light | Dark |
|---|---|---|
| Primary | navy-900 | navy-350 |
| Background (canvas) | neutral-25 | neutral-950 |
| Surface | neutral-0 | neutral-900 |
| Text | ink-900 | neutral-100 |
| Muted text | neutral-700 | neutral-400 |
| Border (decorative) | neutral-200 | neutral-800 |
| Border (controls) | neutral-550 | neutral-500 |
| Success / Low risk | green-800 | green-300 |
| Warning / Medium risk | amber-800 | amber-300 |
| Error / High risk | red-700 | red-300 |

### 3.3 Risk semantics

| Level | Icon (lucide-react) | Label (always rendered) | fg / bg / mark tokens |
|---|---|---|---|
| High | `ShieldAlert` | "High" | `--color-risk-high-{fg,bg,mark}` |
| Medium | `TriangleAlert` (exported alias `AlertTriangle`) | "Medium" | `--color-risk-medium-{fg,bg,mark}` |
| Low | `CircleCheck` (exported alias `CheckCircle2`) | "Low" | `--color-risk-low-{fg,bg,mark}` |
| Not assessed (`risk === null`) | `CircleDashed` | "Not assessed" | `--color-fg-muted` on `--color-bg-sunken` |
| Needs human (`needs_human`) | `CircleHelp` | "Needs review" | `--color-fg-default` + `--color-border-strong` outline |

- `fg` is for badge text, icons, the left edge of a highlight and heatmap numbers. It passes 4.5:1 on every surface.
- `bg` is the badge or chip fill.
- `mark` is the fill behind contract text in the viewer and in heatmap cells. Body text on it passes 4.5:1.
- Severity ordering is High > Medium > Low > Not assessed. Where spans overlap, the highest wins (see `contract-viewer-ux` skill).
- Mappings live in one place: `src/features/risk/riskMeta.ts` (`RISK_META: Record<RiskLevel, {icon, label, tokenPrefix, rank}>`).

### 3.4 Tokens (canonical — copy to `src/styles/tokens.css`)

```css
/* tokens:begin */
:root {
  /* ---------- primitives (never referenced by components) ---------- */
  --neutral-0: #FFFFFF;
  --neutral-25: #F8FAFC;
  --neutral-50: #F1F5F9;
  --neutral-100: #E2E8F0;
  --neutral-200: #CBD5E1;
  --neutral-400: #94A3B8;
  --neutral-450: #8494AB;
  --neutral-500: #6B7C93;
  --neutral-550: #64748B;
  --neutral-600: #56657A;
  --neutral-700: #475569;
  --neutral-800: #273449;
  --neutral-850: #1E2A44;
  --neutral-875: #18233A;
  --neutral-900: #111A2B;
  --neutral-925: #0E1626;
  --neutral-950: #0B1220;
  --ink-900: #0F172A;

  --navy-100: #DBE6FF;
  --navy-300: #B4CBFF;
  --navy-350: #93B4FF;
  --navy-400: #7EA6FF;
  --navy-600: #2563EB;
  --navy-700: #1D4ED8;
  --navy-800: #1E40AF;
  --navy-900: #1E3A8A;
  --navy-950: #23396B;

  --red-50: #FEF3F2;
  --red-100: #FDE3E1;
  --red-300: #FDA29B;
  --red-700: #B42318;
  --red-900: #4A1D20;
  --red-950: #3B1518;

  --amber-50: #FFFAEB;
  --amber-100: #FEF0C7;
  --amber-300: #FEC84B;
  --amber-800: #93370D;
  --amber-900: #3F2E0D;
  --amber-950: #33250B;

  --green-50: #ECFDF3;
  --green-100: #DCFAE6;
  --green-300: #75E0A7;
  --green-800: #05603A;
  --green-900: #113826;
  --green-950: #0D2E20;

  /* ---------- semantic: light ---------- */
  color-scheme: light;
  --color-bg-canvas: var(--neutral-25);
  --color-bg-surface: var(--neutral-0);
  --color-bg-sunken: var(--neutral-50);
  --color-bg-raised: var(--neutral-0);
  --color-bg-overlay: var(--neutral-0);
  --color-scrim: rgb(15 23 42 / 0.45);

  --color-fg-default: var(--ink-900);
  --color-fg-muted: var(--neutral-700);
  --color-fg-subtle: var(--neutral-600);
  --color-fg-link: var(--navy-700);
  --color-fg-on-primary: var(--neutral-0);
  --color-fg-on-danger: var(--neutral-0);

  --color-border-default: var(--neutral-200);
  --color-border-strong: var(--neutral-550);

  --color-primary: var(--navy-900);
  --color-primary-hover: var(--navy-800);
  --color-danger: var(--red-700);
  --color-focus-ring: var(--navy-600);

  --color-risk-high-fg: var(--red-700);
  --color-risk-high-bg: var(--red-50);
  --color-risk-high-mark: var(--red-100);
  --color-risk-medium-fg: var(--amber-800);
  --color-risk-medium-bg: var(--amber-50);
  --color-risk-medium-mark: var(--amber-100);
  --color-risk-low-fg: var(--green-800);
  --color-risk-low-bg: var(--green-50);
  --color-risk-low-mark: var(--green-100);

  --color-diff-ins-fg: var(--green-800);
  --color-diff-ins-bg: var(--green-100);
  --color-diff-del-fg: var(--red-700);
  --color-diff-del-bg: var(--red-100);
  --color-search-match-bg: var(--navy-100);

  --shadow-1: 0 1px 2px rgb(15 23 42 / 0.06);
  --shadow-2: 0 4px 12px rgb(15 23 42 / 0.10);
  --shadow-3: 0 12px 32px rgb(15 23 42 / 0.18);
}

[data-theme="dark"] {
  color-scheme: dark;
  --color-bg-canvas: var(--neutral-950);
  --color-bg-surface: var(--neutral-900);
  --color-bg-sunken: var(--neutral-925);
  --color-bg-raised: var(--neutral-875);
  --color-bg-overlay: var(--neutral-850);
  --color-scrim: rgb(0 0 0 / 0.6);

  --color-fg-default: var(--neutral-100);
  --color-fg-muted: var(--neutral-400);
  --color-fg-subtle: var(--neutral-450);
  --color-fg-link: var(--navy-350);
  --color-fg-on-primary: var(--neutral-950);
  --color-fg-on-danger: var(--neutral-950);

  --color-border-default: var(--neutral-800);
  --color-border-strong: var(--neutral-500);

  --color-primary: var(--navy-350);
  --color-primary-hover: var(--navy-300);
  --color-danger: var(--red-300);
  --color-focus-ring: var(--navy-400);

  --color-risk-high-fg: var(--red-300);
  --color-risk-high-bg: var(--red-950);
  --color-risk-high-mark: var(--red-900);
  --color-risk-medium-fg: var(--amber-300);
  --color-risk-medium-bg: var(--amber-950);
  --color-risk-medium-mark: var(--amber-900);
  --color-risk-low-fg: var(--green-300);
  --color-risk-low-bg: var(--green-950);
  --color-risk-low-mark: var(--green-900);

  --color-diff-ins-fg: var(--green-300);
  --color-diff-ins-bg: var(--green-900);
  --color-diff-del-fg: var(--red-300);
  --color-diff-del-bg: var(--red-900);
  --color-search-match-bg: var(--navy-950);

  /* dark elevation = lighter surface + border; shadows only for separation */
  --shadow-1: 0 0 0 1px var(--color-border-default);
  --shadow-2: 0 4px 12px rgb(0 0 0 / 0.45);
  --shadow-3: 0 12px 32px rgb(0 0 0 / 0.6);
}
/* tokens:end */
```

Component-layer, type, spacing, radius, motion and density tokens (§4–§9) are not colors. They live in `src/styles/tokens.css` below the block above, with the values listed in those sections.

### 3.5 Tailwind mapping (Tailwind v4, CSS-first — see ADR-0003)

`src/styles/app.css`:

```css
@import "tailwindcss";
@import "./tokens.css";

@theme inline {
  --color-*: initial;           /* delete Tailwind's default palette: bg-red-500 etc. do not exist */
  --color-canvas: var(--color-bg-canvas);
  --color-surface: var(--color-bg-surface);
  --color-sunken: var(--color-bg-sunken);
  --color-raised: var(--color-bg-raised);
  --color-overlay: var(--color-bg-overlay);
  --color-scrim: var(--color-scrim);
  --color-fg: var(--color-fg-default);
  --color-fg-muted: var(--color-fg-muted);
  --color-fg-subtle: var(--color-fg-subtle);
  --color-link: var(--color-fg-link);
  --color-on-primary: var(--color-fg-on-primary);
  --color-on-danger: var(--color-fg-on-danger);
  --color-border: var(--color-border-default);
  --color-border-strong: var(--color-border-strong);
  --color-primary: var(--color-primary);
  --color-primary-hover: var(--color-primary-hover);
  --color-danger: var(--color-danger);
  --color-ring: var(--color-focus-ring);
  --color-risk-high: var(--color-risk-high-fg);
  --color-risk-high-bg: var(--color-risk-high-bg);
  --color-risk-high-mark: var(--color-risk-high-mark);
  --color-risk-medium: var(--color-risk-medium-fg);
  --color-risk-medium-bg: var(--color-risk-medium-bg);
  --color-risk-medium-mark: var(--color-risk-medium-mark);
  --color-risk-low: var(--color-risk-low-fg);
  --color-risk-low-bg: var(--color-risk-low-bg);
  --color-risk-low-mark: var(--color-risk-low-mark);
  --color-ins: var(--color-diff-ins-fg);
  --color-ins-bg: var(--color-diff-ins-bg);
  --color-del: var(--color-diff-del-fg);
  --color-del-bg: var(--color-diff-del-bg);
  --color-match: var(--color-search-match-bg);
  --color-transparent: transparent;
  --color-current: currentColor;

  --font-sans: "IBM Plex Sans Variable", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Source Serif 4 Variable", "Source Serif 4", ui-serif, Georgia, serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  --shadow-1: var(--shadow-1);
  --shadow-2: var(--shadow-2);
  --shadow-3: var(--shadow-3);
}
```

Usage: `bg-surface text-fg border-border`, `text-risk-high bg-risk-high-bg`, `ring-ring`. The `dark:` variant is almost never needed because semantic tokens switch per theme. Arbitrary color values (`bg-[#…]`, `text-[rgb(…)]`) are banned by the token lint.

### 3.6 Contrast table (computed, WCAG 2.2 relative luminance)

Generated by `node scripts/check-contrast.mjs`, run on this token block on 2026-10-30. Thresholds: 4.5:1 for text (1.4.3) and 3:1 for non-text UI such as icons, focus rings, control borders and highlight edges (1.4.11). Light `--color-bg-raised`/`--color-bg-overlay` equal `--color-bg-surface` (#FFFFFF), so the surface rows cover them.

Result: **contrast: all pairs pass** (104 rows, including 2 informational divider rows).

| Theme | Foreground | Background | Ratio | Req | Use | Pass |
|---|---|---|---|---|---|---|
| light | fg-default `#0F172A` | bg-canvas `#F8FAFC` | 17.06 | 4.5 | text | yes |
| light | fg-muted `#475569` | bg-canvas `#F8FAFC` | 7.24 | 4.5 | text | yes |
| light | fg-subtle `#56657A` | bg-canvas `#F8FAFC` | 5.67 | 4.5 | text | yes |
| light | fg-link `#1D4ED8` | bg-canvas `#F8FAFC` | 6.41 | 4.5 | text | yes |
| light | risk-high-fg `#B42318` | bg-canvas `#F8FAFC` | 6.28 | 4.5 | text+icon | yes |
| light | risk-medium-fg `#93370D` | bg-canvas `#F8FAFC` | 7.19 | 4.5 | text+icon | yes |
| light | risk-low-fg `#05603A` | bg-canvas `#F8FAFC` | 7.32 | 4.5 | text+icon | yes |
| light | focus-ring `#2563EB` | bg-canvas `#F8FAFC` | 4.94 | 3 | focus ring | yes |
| light | border-strong `#64748B` | bg-canvas `#F8FAFC` | 4.55 | 3 | control border | yes |
| light | fg-default `#0F172A` | bg-surface `#FFFFFF` | 17.85 | 4.5 | text | yes |
| light | fg-muted `#475569` | bg-surface `#FFFFFF` | 7.58 | 4.5 | text | yes |
| light | fg-subtle `#56657A` | bg-surface `#FFFFFF` | 5.94 | 4.5 | text | yes |
| light | fg-link `#1D4ED8` | bg-surface `#FFFFFF` | 6.70 | 4.5 | text | yes |
| light | risk-high-fg `#B42318` | bg-surface `#FFFFFF` | 6.57 | 4.5 | text+icon | yes |
| light | risk-medium-fg `#93370D` | bg-surface `#FFFFFF` | 7.52 | 4.5 | text+icon | yes |
| light | risk-low-fg `#05603A` | bg-surface `#FFFFFF` | 7.66 | 4.5 | text+icon | yes |
| light | focus-ring `#2563EB` | bg-surface `#FFFFFF` | 5.17 | 3 | focus ring | yes |
| light | border-strong `#64748B` | bg-surface `#FFFFFF` | 4.76 | 3 | control border | yes |
| light | fg-default `#0F172A` | bg-sunken `#F1F5F9` | 16.30 | 4.5 | text | yes |
| light | fg-muted `#475569` | bg-sunken `#F1F5F9` | 6.92 | 4.5 | text | yes |
| light | fg-subtle `#56657A` | bg-sunken `#F1F5F9` | 5.42 | 4.5 | text | yes |
| light | fg-link `#1D4ED8` | bg-sunken `#F1F5F9` | 6.12 | 4.5 | text | yes |
| light | risk-high-fg `#B42318` | bg-sunken `#F1F5F9` | 6.00 | 4.5 | text+icon | yes |
| light | risk-medium-fg `#93370D` | bg-sunken `#F1F5F9` | 6.86 | 4.5 | text+icon | yes |
| light | risk-low-fg `#05603A` | bg-sunken `#F1F5F9` | 6.99 | 4.5 | text+icon | yes |
| light | focus-ring `#2563EB` | bg-sunken `#F1F5F9` | 4.72 | 3 | focus ring | yes |
| light | border-strong `#64748B` | bg-sunken `#F1F5F9` | 4.34 | 3 | control border | yes |
| light | fg-on-primary `#FFFFFF` | primary `#1E3A8A` | 10.36 | 4.5 | button text | yes |
| light | fg-on-primary `#FFFFFF` | primary-hover `#1E40AF` | 8.72 | 4.5 | button text | yes |
| light | fg-on-danger `#FFFFFF` | danger `#B42318` | 6.57 | 4.5 | button text | yes |
| light | fg-default `#0F172A` | search-match-bg `#DBE6FF` | 14.26 | 4.5 | body on search hit | yes |
| light | fg-default `#0F172A` | diff-ins-bg `#DCFAE6` | 16.03 | 4.5 | diff text | yes |
| light | fg-default `#0F172A` | diff-del-bg `#FDE3E1` | 14.67 | 4.5 | diff text | yes |
| light | diff-ins-fg `#05603A` | diff-ins-bg `#DCFAE6` | 6.88 | 3 | diff decoration | yes |
| light | diff-del-fg `#B42318` | diff-del-bg `#FDE3E1` | 5.40 | 3 | diff decoration | yes |
| light | risk-high-fg `#B42318` | risk-high-bg `#FEF3F2` | 6.05 | 4.5 | badge text | yes |
| light | risk-high-fg `#B42318` | risk-high-mark `#FDE3E1` | 5.40 | 3 | highlight edge | yes |
| light | risk-medium-fg `#93370D` | risk-medium-bg `#FFFAEB` | 7.21 | 4.5 | badge text | yes |
| light | fg-default `#0F172A` | risk-medium-mark `#FEF0C7` | 15.73 | 4.5 | body on highlight | yes |
| light | risk-medium-fg `#93370D` | risk-medium-mark `#FEF0C7` | 6.62 | 3 | highlight edge | yes |
| light | risk-low-fg `#05603A` | risk-low-bg `#ECFDF3` | 7.26 | 4.5 | badge text | yes |
| light | risk-low-fg `#05603A` | risk-low-mark `#DCFAE6` | 6.88 | 3 | highlight edge | yes |
| light | border-default `#CBD5E1` | bg-surface `#FFFFFF` | 1.48 | - | decorative divider (info) | yes |
| dark | fg-default `#E2E8F0` | bg-canvas `#0B1220` | 15.19 | 4.5 | text | yes |
| dark | fg-muted `#94A3B8` | bg-canvas `#0B1220` | 7.30 | 4.5 | text | yes |
| dark | fg-subtle `#8494AB` | bg-canvas `#0B1220` | 6.07 | 4.5 | text | yes |
| dark | fg-link `#93B4FF` | bg-canvas `#0B1220` | 9.11 | 4.5 | text | yes |
| dark | risk-high-fg `#FDA29B` | bg-canvas `#0B1220` | 9.65 | 4.5 | text+icon | yes |
| dark | risk-medium-fg `#FEC84B` | bg-canvas `#0B1220` | 12.11 | 4.5 | text+icon | yes |
| dark | risk-low-fg `#75E0A7` | bg-canvas `#0B1220` | 11.57 | 4.5 | text+icon | yes |
| dark | focus-ring `#7EA6FF` | bg-canvas `#0B1220` | 7.83 | 3 | focus ring | yes |
| dark | border-strong `#6B7C93` | bg-canvas `#0B1220` | 4.40 | 3 | control border | yes |
| dark | fg-default `#E2E8F0` | bg-surface `#111A2B` | 14.12 | 4.5 | text | yes |
| dark | fg-muted `#94A3B8` | bg-surface `#111A2B` | 6.79 | 4.5 | text | yes |
| dark | fg-subtle `#8494AB` | bg-surface `#111A2B` | 5.64 | 4.5 | text | yes |
| dark | fg-link `#93B4FF` | bg-surface `#111A2B` | 8.47 | 4.5 | text | yes |
| dark | risk-high-fg `#FDA29B` | bg-surface `#111A2B` | 8.97 | 4.5 | text+icon | yes |
| dark | risk-medium-fg `#FEC84B` | bg-surface `#111A2B` | 11.25 | 4.5 | text+icon | yes |
| dark | risk-low-fg `#75E0A7` | bg-surface `#111A2B` | 10.76 | 4.5 | text+icon | yes |
| dark | focus-ring `#7EA6FF` | bg-surface `#111A2B` | 7.28 | 3 | focus ring | yes |
| dark | border-strong `#6B7C93` | bg-surface `#111A2B` | 4.09 | 3 | control border | yes |
| dark | fg-default `#E2E8F0` | bg-sunken `#0E1626` | 14.67 | 4.5 | text | yes |
| dark | fg-muted `#94A3B8` | bg-sunken `#0E1626` | 7.05 | 4.5 | text | yes |
| dark | fg-subtle `#8494AB` | bg-sunken `#0E1626` | 5.86 | 4.5 | text | yes |
| dark | fg-link `#93B4FF` | bg-sunken `#0E1626` | 8.79 | 4.5 | text | yes |
| dark | risk-high-fg `#FDA29B` | bg-sunken `#0E1626` | 9.31 | 4.5 | text+icon | yes |
| dark | risk-medium-fg `#FEC84B` | bg-sunken `#0E1626` | 11.69 | 4.5 | text+icon | yes |
| dark | risk-low-fg `#75E0A7` | bg-sunken `#0E1626` | 11.17 | 4.5 | text+icon | yes |
| dark | focus-ring `#7EA6FF` | bg-sunken `#0E1626` | 7.56 | 3 | focus ring | yes |
| dark | border-strong `#6B7C93` | bg-sunken `#0E1626` | 4.24 | 3 | control border | yes |
| dark | fg-default `#E2E8F0` | bg-raised `#18233A` | 12.71 | 4.5 | text | yes |
| dark | fg-muted `#94A3B8` | bg-raised `#18233A` | 6.11 | 4.5 | text | yes |
| dark | fg-subtle `#8494AB` | bg-raised `#18233A` | 5.08 | 4.5 | text | yes |
| dark | fg-link `#93B4FF` | bg-raised `#18233A` | 7.62 | 4.5 | text | yes |
| dark | risk-high-fg `#FDA29B` | bg-raised `#18233A` | 8.07 | 4.5 | text+icon | yes |
| dark | risk-medium-fg `#FEC84B` | bg-raised `#18233A` | 10.13 | 4.5 | text+icon | yes |
| dark | risk-low-fg `#75E0A7` | bg-raised `#18233A` | 9.68 | 4.5 | text+icon | yes |
| dark | focus-ring `#7EA6FF` | bg-raised `#18233A` | 6.55 | 3 | focus ring | yes |
| dark | border-strong `#6B7C93` | bg-raised `#18233A` | 3.68 | 3 | control border | yes |
| dark | fg-default `#E2E8F0` | bg-overlay `#1E2A44` | 11.59 | 4.5 | text | yes |
| dark | fg-muted `#94A3B8` | bg-overlay `#1E2A44` | 5.57 | 4.5 | text | yes |
| dark | fg-subtle `#8494AB` | bg-overlay `#1E2A44` | 4.63 | 4.5 | text | yes |
| dark | fg-link `#93B4FF` | bg-overlay `#1E2A44` | 6.95 | 4.5 | text | yes |
| dark | risk-high-fg `#FDA29B` | bg-overlay `#1E2A44` | 7.36 | 4.5 | text+icon | yes |
| dark | risk-medium-fg `#FEC84B` | bg-overlay `#1E2A44` | 9.24 | 4.5 | text+icon | yes |
| dark | risk-low-fg `#75E0A7` | bg-overlay `#1E2A44` | 8.83 | 4.5 | text+icon | yes |
| dark | focus-ring `#7EA6FF` | bg-overlay `#1E2A44` | 5.98 | 3 | focus ring | yes |
| dark | border-strong `#6B7C93` | bg-overlay `#1E2A44` | 3.35 | 3 | control border | yes |
| dark | fg-on-primary `#0B1220` | primary `#93B4FF` | 9.11 | 4.5 | button text | yes |
| dark | fg-on-primary `#0B1220` | primary-hover `#B4CBFF` | 11.53 | 4.5 | button text | yes |
| dark | fg-on-danger `#0B1220` | danger `#FDA29B` | 9.65 | 4.5 | button text | yes |
| dark | fg-default `#E2E8F0` | search-match-bg `#23396B` | 9.11 | 4.5 | body on search hit | yes |
| dark | fg-default `#E2E8F0` | diff-ins-bg `#113826` | 10.53 | 4.5 | diff text | yes |
| dark | fg-default `#E2E8F0` | diff-del-bg `#4A1D20` | 11.45 | 4.5 | diff text | yes |
| dark | diff-ins-fg `#75E0A7` | diff-ins-bg `#113826` | 8.02 | 3 | diff decoration | yes |
| dark | diff-del-fg `#FDA29B` | diff-del-bg `#4A1D20` | 7.27 | 3 | diff decoration | yes |
| dark | risk-high-fg `#FDA29B` | risk-high-bg `#3B1518` | 8.28 | 4.5 | badge text | yes |
| dark | risk-high-fg `#FDA29B` | risk-high-mark `#4A1D20` | 7.27 | 3 | highlight edge | yes |
| dark | risk-medium-fg `#FEC84B` | risk-medium-bg `#33250B` | 9.63 | 4.5 | badge text | yes |
| dark | fg-default `#E2E8F0` | risk-medium-mark `#3F2E0D` | 10.59 | 4.5 | body on highlight | yes |
| dark | risk-medium-fg `#FEC84B` | risk-medium-mark `#3F2E0D` | 8.44 | 3 | highlight edge | yes |
| dark | risk-low-fg `#75E0A7` | risk-low-bg `#0D2E20` | 9.08 | 4.5 | badge text | yes |
| dark | risk-low-fg `#75E0A7` | risk-low-mark `#113826` | 8.02 | 3 | highlight edge | yes |
| dark | border-default `#273449` | bg-surface `#111A2B` | 1.39 | - | decorative divider (info) | yes |

Diff text is always `fg-default` on the ins/del background (pairs "diff text"). The ins/del `fg` colors are used only for the underline/strikethrough decoration and the `+`/`−` gutter glyph (3:1 non-text), never as the text color.

`--color-border-default` (light 1.48:1, dark 1.39:1 vs surface) is **decorative only**: dividers and card outlines that carry no information. Any border that identifies a control (inputs, checkboxes, segmented controls, table sort buttons) uses `--color-border-strong`.

## 4. Typography

Fonts are self-hosted via Fontsource, with no third-party CDN, to satisfy CSP `font-src 'self'`:
- **IBM Plex Sans Variable** (`@fontsource-variable/ibm-plex-sans`): all UI. Neutral, technical, and it has tabular figures.
- **Source Serif 4 Variable** (`@fontsource-variable/source-serif-4`): contract text in the viewer and redline editor, the executive summary, and H1 page titles. Its optical sizing reads well for long text.
- **IBM Plex Mono** (`@fontsource/ibm-plex-mono`, weights 400/500): ids, offsets, hashes, prompt versions and model ids in the provenance drawer.

(The pairing DB suggested EB Garamond + Lato. Garamond's small x-height loses legibility at 14–16px in dense panes, so we keep a serif for contract text but use Source Serif 4, and use Plex for UI.)

Scale (rem, root 16px so browser zoom and text resize work; line height in px at 1rem = 16px):

| Token | Size | Line | Weight | Font | Use |
|---|---|---|---|---|---|
| `--text-xs` | 0.75rem / 12px | 16px | 500 | sans | badge labels, table meta, captions (minimum size anywhere) |
| `--text-sm` | 0.8125rem / 13px | 20px | 400 | sans | table cells, sidebar outline, helper text |
| `--text-base` | 0.875rem / 14px | 20px | 400 | sans | default UI text, buttons, inputs |
| `--text-md` | 1rem / 16px | 26px | 400 | serif | contract body, redline text, executive summary |
| `--text-lg` (H3) | 1.125rem / 18px | 26px | 600 | sans | panel titles |
| `--text-xl` (H2) | 1.25rem / 20px | 28px | 600 | sans | section titles |
| `--text-2xl` (H1) | 1.5rem / 24px | 32px | 600 | serif | page title (contract title) |
| `--text-3xl` | 1.875rem / 30px | 36px | 600 | sans, tabular-nums | KPI numbers on summary cards |

Rules: at most 3 weights (400/500/600). Use `font-variant-numeric: tabular-nums` for scores, counts, offsets and dates in tables. Contract text measure is max 72ch. Never use all caps except `--text-xs` overlines with `letter-spacing: 0.04em`. Contract text keeps the source's whitespace with `white-space: pre-wrap`.

## 5. Spacing

Base Unit: 4px. Tokens `--space-{n}` = n × 4px. Tailwind's default `--spacing: 0.25rem` already matches, so `p-2` = 8px.

Scale: 0 / 2px (`--space-0_5`, hairline offsets only) / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64.

Defaults: control inner padding 8×12. Card padding 16 (compact 12). Pane gutter 16. Page gutter 24 desktop, 16 tablet, 12 mobile. The vertical gap between form fields is 16. Table cell padding is 8×12 (compact 4×8).

## 6. Border Radius

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | table cells, contract highlights (highlights must not look like buttons) |
| `--radius-sm` | 4px | badges, chips, kbd, checkboxes |
| `--radius-md` | 6px | buttons, inputs, selects, segmented controls |
| `--radius-lg` | 8px | cards, panels, popovers, toasts |
| `--radius-xl` | 12px | dialogs, drawers' leading edge |
| `--radius-full` | 9999px | avatars, status dots only |

## 7. Elevation (Shadows)

Borders come first and shadows second. Light theme: `--shadow-1` for cards (always with a 1px `--color-border-default` border), `--shadow-2` for popovers, menus and toasts, `--shadow-3` for dialogs and drawers. Dark theme: elevation is shown by surface step (surface → raised → overlay) plus the shadows in the token block. There are no colored shadows and no glows.

| Level | Surface | Shadow | Examples |
|---|---|---|---|
| 0 | canvas / surface | none | page, panes, tables |
| 1 | surface | `--shadow-1` | summary cards, sticky risk summary |
| 2 | raised | `--shadow-2` | popover, dropdown, tooltip, toast |
| 3 | overlay | `--shadow-3` + `--color-scrim` behind | dialog, provenance drawer |

## 8. Motion

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | 0ms | state toggles, selection |
| `--duration-fast` | 120ms | hover, focus, press, tooltip in |
| `--duration-base` | 180ms | popover, toast, accordion |
| `--duration-slow` | 260ms | drawer/dialog enter |
| `--ease-standard` | cubic-bezier(0.2, 0, 0, 1) | enter / move |
| `--ease-exit` | cubic-bezier(0.4, 0, 1, 1) | exit (exit = 0.75 × enter duration) |

Only `opacity` and `transform` animate, never width, height, top or left. The "jump to clause" flash is a 600ms `--color-focus-ring` outline fade on the target clause.

Reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  :root { --duration-fast: 0ms; --duration-base: 0ms; --duration-slow: 0ms; }
  html { scroll-behavior: auto; }
}
```

Under reduced motion the clause flash becomes a static 2px outline that stays until the next navigation. Virtualizer `scrollToIndex` uses `behavior: "auto"`. Progress bars do not animate stripes. Spinners are replaced by the static text "Working…".

## 9. Focus ring & density

Focus ring (component tokens): `--focus-ring-width: 2px; --focus-ring-offset: 2px; --focus-ring-color: var(--color-focus-ring)`.
- Apply it on `:focus-visible` only: `outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset)`.
- On filled backgrounds (primary/danger buttons, risk marks, selected rows) use the `focus-ring-double` utility (`box-shadow: 0 0 0 2px var(--color-bg-canvas), 0 0 0 4px var(--focus-ring-color)`, defined once in `app.css`), so it passes on any fill.
- Never use `outline: none` without this replacement. The focused element must not be fully hidden under the sticky header or summary (WCAG 2.4.11). Scroll containers set `scroll-padding-top: var(--sticky-offset)`.

Density (`<html data-density>`, user setting persisted in `localStorage["ui.density"]`; the default is `comfortable`):

| Token | comfortable | compact |
|---|---|---|
| `--control-height` | 36px | 32px |
| `--row-height` | 40px | 32px |
| `--cell-px` / `--cell-py` | 12px / 8px | 8px / 4px |
| `--card-pad` | 16px | 12px |

`@media (pointer: coarse)` forces `comfortable` and a minimum 44×44px hit area on all interactive elements. With a fine pointer the minimum target is 32px, above the WCAG 2.5.8 24px minimum.

## 10. Components

### Buttons (`src/components/ui/Button.tsx`, variants via `cva`)
- **Primary**: `bg-primary text-on-primary`, hover `bg-primary-hover`, height `--control-height`, `--radius-md`, `--text-base` 500, padding 0 12px, optional 16px leading icon. At most one primary per view region.
- **Secondary**: `bg-surface text-fg border border-border-strong`, hover `bg-sunken`.
- **Ghost**: transparent, `text-fg`, hover `bg-sunken`. Used for toolbars.
- **Danger**: `bg-danger text-on-danger`. Only for Reject (redline, package). It always opens a confirmation that names the object ("Reject package for *Acme MSA*?").
- **Icon-only**: square (`--control-height`), `aria-label` required (enforced by a TS prop type: `IconButtonProps` requires `label: string`), and a Radix Tooltip showing the label and shortcut `<kbd>`.
- **Disabled**: `aria-disabled="true"` plus 50% opacity on content (not on the focus ring). The button stays focusable when the reason must be discoverable, with `aria-describedby` pointing to the reason ("Only lawyers can approve").
- **Loading**: keep the width, swap the leading icon for a `Loader2` with `animate-spin` (static under reduced motion), set `aria-busy="true"`, and keep the label text. Do not disable the focus.

### Inputs (`Input`, `Textarea`, `Select` built on Radix Select)
- **Default**: `bg-surface border border-border-strong rounded-md h-[--control-height] px-3 text-base text-fg`.
- **Focus**: the focus ring (§9). The border color does not change.
- **Error**: border `--color-danger`, plus a message below with a 16px `CircleAlert` icon and `text-danger text-sm`, linked by `aria-describedby`. Set `aria-invalid="true"`. Validate on blur and clear on the next valid change.
- **Disabled**: `bg-sunken text-fg-muted`, cursor `not-allowed`.
- **Placeholder**: `text-fg-subtle`, format hints only, never a label. Every input has a visible `<label>`.

### Tables (`DataTable` on TanStack Table, virtualized via TanStack Virtual when rows > 100)
- Header: sticky, `bg-sunken`, `text-xs` 500 uppercase-free, sortable headers are `<button>`s with `aria-sort` on the `<th>`.
- Rows: `--row-height`, 1px `border-border` bottom, hover `bg-sunken`, selected `bg-sunken` plus a 2px `--color-primary` inset left edge plus `aria-selected`.
- Numbers right-aligned and `tabular-nums`. Text left-aligned. Truncate with `title` plus full text in the row detail.
- Below 768px a table collapses to a stacked card list with the same data (no horizontal page scroll).

### Badges (`RiskBadge`, `StatusBadge`)
- `RiskBadge`: `inline-flex gap-1 h-5 px-1.5 rounded-sm text-xs font-medium`, `bg-risk-{l}-bg text-risk-{l}` plus a 12px icon (`aria-hidden`) plus the visible label. Optional score: "High · 87". The accessible name is the visible text.
- `StatusBadge` (ContractStatus/RedlineStatus/package status): a neutral `bg-sunken text-fg border border-border`, a 12px icon per status, and a human label (`awaiting_lawyer` → "Awaiting lawyer"). Never use risk colors for workflow status.

### Cards
`bg-surface border border-border rounded-lg shadow-1 p-[--card-pad]`. A title (`text-lg`), an optional action in the top right, no nested cards.

### Navigation
- **Header**: 48px, `bg-surface border-b border-border`. It holds the wordmark, primary nav (Contracts, Playbook, Evaluation — Playbook edit actions are only for admin), theme toggle, density toggle, and a user menu showing name + role badges + Sign out.
- **Sidebar** (contract-scoped pages): 280px, collapsible. It has the contract title, status, and tabs (Viewer, Risks, Redlines, Approval), then the clause outline (viewer only).
- **Mobile** (<768px): the header collapses to a menu button (Radix Dialog sheet). The contract tabs become a horizontal segmented control under the title, and the outline becomes a bottom sheet.
- **Skip link**: first focusable element, "Skip to main content" → `#main` (`tabIndex=-1`).
- **Footer**: on every page, `text-xs text-fg-muted`: "This tool assists legal review and does not constitute legal advice."

## 11. States

- **Loading**: under 100ms show nothing. 100ms–1s: inline `Loader2` plus text. Over 1s, or first paint of lists and text: skeletons with the final dimensions (no layout shift). The SSE pipeline shows a determinate progress bar (`done/total`) plus the stage text.
- **Empty**: a one-line explanation plus a primary action ("No contracts yet. Upload a .docx or .pdf to start a review." + Upload button). No illustrations.
- **Filtered-zero**: "No clauses match *High · Indemnity*." + "Clear filters".
- **Error**: an inline `Alert` with `CircleAlert` + `text-danger` title + `text-fg` body from the problem+json `title`/`detail`, plus a recovery action (Retry, Sign in again, Go to contracts). Never show raw stack traces or request bodies.
- **Success**: a toast (`role="status"`) at the bottom-right for 4s, pausable on hover/focus. It never auto-dismisses if it contains an action (Undo).
- **Disabled**: see Buttons. Always explain why.

## 12. Icons

Icon library: `lucide-react`, imported per icon (tree-shaken). Default size is 16px in dense UI, 20px in the header and empty states, with stroke width 2. The style is outline only.
Decorative icons next to text get `aria-hidden="true"`. Standalone icons need an accessible name. Never use emoji as icons.
Fixed meanings: `ShieldAlert` High, `TriangleAlert` Medium, `CircleCheck` Low, `CircleDashed` Not assessed, `CircleHelp` Needs review, `FileText` contract, `Upload` upload, `GitCompare` redline, `Gavel` approval, `BookOpen` playbook, `FlaskConical` evaluation, `History` audit, `Info` provenance, `Download` export, `Check` accept, `X` reject, `Pencil` edit, `MessageSquare` comment.

## 13. Responsive Design

Breakpoints (Tailwind defaults): Mobile 0–767px, Tablet 768–1279px (`md`), Desktop ≥1280px (`xl`).
- **Desktop**: three panes in the viewer (outline 280 | text | risk summary 320) and side-by-side redline columns.
- **Tablet**: the outline becomes a toggleable drawer, with two panes (text | summary). Redlines are side by side at ≥1024px, otherwise stacked. Risk review is a fully supported tablet flow.
- **Mobile**: a single column. The risk summary is a sticky top strip (counts only). Redlines are stacked (original above proposed) with Accept/Reject full-width. No horizontal page scroll at 375px.

## 14. Accessibility

WCAG 2.2 AA. See the `legal-a11y` skill for the full checklist. Requirements:
- Semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`) and a skip link.
- Contrast per §3.6, verified by `pnpm tokens:contrast` and by axe in tests.
- Full keyboard operation. Single-key shortcuts (j/k/h, /) are only active when focus is not in an editable field, and they can be turned off in Settings (WCAG 2.1.4).
- Visible focus (§9). Focus moves to the `<h1>` on route change and to the pane heading on pane change.
- Labels on every control. `aria-live="polite"` for agent progress, `role="alert"` for blocking errors.
- Never rely only on color: risk = icon + label + color, diff = underline/strike + sr-only "inserted"/"deleted" + color.
