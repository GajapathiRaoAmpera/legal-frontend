---
name: enterprise-design-system
description: Use when adding or changing design tokens, theming (light/dark, density), Tailwind theme mapping, or any shared UI primitive in src/components/ui (Button, IconButton, Input, Select, Badge, RiskBadge, Card, DataTable, Dialog, Drawer, Toast, Skeleton, Alert), or when a component needs a color, size, radius, shadow or motion value.
---

# enterprise-design-system

## Purpose
Keep every pixel on the token system in `docs/DESIGN_SYSTEM.md`: primitive → semantic → component tokens, light/dark plus density at runtime, risk colors with verified contrast, and **no hardcoded colors anywhere outside `src/styles/tokens.css`**.

## Inputs / Outputs

```ts
// Inputs: tokens (CSS custom properties) and API enums
import type { RiskLevel, ContractStatus, RedlineStatus, ReviewPackage } from "@/api/types";
// RiskLevel = components["schemas"]["RiskLevel"]  →  "High" | "Medium" | "Low"
type PackageStatus = ReviewPackage["status"];      // "draft" | "ready_for_lawyer" | "approved" | "changes_requested" | "rejected"

// Outputs: typed primitives
type Theme = "light" | "dark";
type Density = "comfortable" | "compact";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;            // default "secondary"
  size?: "md" | "sm";                 // md = --control-height, sm = 28px (never below 24px)
  loading?: boolean;                  // aria-busy, spinner swap, width preserved
  leadingIcon?: LucideIcon;
}
interface IconButtonProps extends Omit<ButtonProps, "children" | "leadingIcon"> {
  icon: LucideIcon;
  label: string;                      // required: aria-label + tooltip text
  shortcut?: string;                  // shown as <kbd> in tooltip, e.g. "J"
}
interface RiskBadgeProps { level: RiskLevel | null; score?: number; needsHuman?: boolean; size?: "sm" | "md" }
interface StatusBadgeProps { status: ContractStatus | RedlineStatus | PackageStatus }

// src/features/risk/riskMeta.ts — single source for risk presentation
import type { LucideIcon } from "lucide-react";
export const RISK_META: Record<RiskLevel, { label: string; icon: LucideIcon; rank: 3 | 2 | 1; cls: { fg: string; bg: string; mark: string } }> = {
  High:   { label: "High",   icon: ShieldAlert,   rank: 3, cls: { fg: "text-risk-high",   bg: "bg-risk-high-bg",   mark: "bg-risk-high-mark" } },
  Medium: { label: "Medium", icon: TriangleAlert, rank: 2, cls: { fg: "text-risk-medium", bg: "bg-risk-medium-bg", mark: "bg-risk-medium-mark" } },
  Low:    { label: "Low",    icon: CircleCheck,   rank: 1, cls: { fg: "text-risk-low",    bg: "bg-risk-low-bg",    mark: "bg-risk-low-mark" } },
};
```

## Procedure
1. **Need a value?** Look it up in DESIGN_SYSTEM.md (§3 color, §4 type, §5 spacing, §6 radius, §7 elevation, §8 motion, §9 focus/density). Use the mapped Tailwind utility (`bg-surface`, `text-fg-muted`, `border-border-strong`, `text-risk-high`, `shadow-2`, `rounded-md`, `p-4`).
2. **Need a new token?** Add the primitive (if new) and the semantic token for **both** `:root` and `[data-theme="dark"]` in `src/styles/tokens.css`. Mirror the change into the DESIGN_SYSTEM.md §3.4 block, map it in `app.css` `@theme inline`, add the pair(s) it must satisfy to `scripts/check-contrast.mjs`, run `pnpm tokens:contrast`, and regenerate the table (`node scripts/check-contrast.mjs --md`) into §3.6.
3. **New primitive component?** Build it on a semantic element or a Radix primitive. Variants via `cva`, classes merged with `cn()` (`clsx` + `tailwind-merge`). Forward refs and spread rest props. Expose only the props above, not `className` overrides for color.
4. **Theme/density bootstrap** (`src/main.tsx`, before `createRoot`):
   ```ts
   const t = localStorage.getItem("ui.theme");
   document.documentElement.dataset.theme = t === "light" || t === "dark" ? t : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
   document.documentElement.dataset.density = localStorage.getItem("ui.density") === "compact" ? "compact" : "comfortable";
   ```
   `useUiStore` (Zustand + `persist` to localStorage keys `ui.theme`, `ui.density`, `ui.shortcutsEnabled`) updates the dataset on change.
5. **Risk display**: always render `RISK_META[level].icon` (`aria-hidden`) plus the visible `label`. For `null`, use `CircleDashed` + "Not assessed". For `needs_human`, add `CircleHelp` + "Needs review".
6. Add a component test with an axe assertion. Visually check light, dark and compact.

## Edge cases
- **Filled backgrounds** (primary, danger, risk marks, selected rows): use the `focus-ring-double` utility defined once in `app.css` (`@utility focus-ring-double { &:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--color-bg-canvas), 0 0 0 4px var(--color-focus-ring); } }`). Never inline that shadow as an arbitrary value.
- **Opacity variants** (`bg-primary/10`) compile to `color-mix()` on the token. Re-verify contrast manually if text sits on one, or better, add a real token.
- **Charts/SVG**: use `fill="currentColor"` plus a token text class, or `fill="var(--color-risk-high-fg)"`. Never put hex in SVG.
- **Third-party components** with their own colors (react-pdf text layer, toasts): override via CSS in `app.css` using tokens only.
- **Forced colors / Windows High Contrast**: risk marks must stay visible. Add `@media (forced-colors: active) { mark { outline: 1px solid CanvasText; } }` (system color keywords are allowed).
- **Print** (approval page): `@media print` switches to the light tokens and removes shadows.

## Definition of done
- [ ] No color literal outside `tokens.css` (`pnpm lint` passes `check-tokens.mjs`; greps in `/verify` are empty)
- [ ] New/changed tokens exist in both themes, mapped in `@theme`, and the contrast gate passes with the table regenerated
- [ ] Primitive covers default/hover/focus-visible/active/disabled/loading and both densities
- [ ] Icon-only controls require `label` at the type level
- [ ] Axe test included; verified in light + dark + compact + 200% zoom

## Anti-patterns
- `className="text-[#B42318]"`, `style={{ color: "red" }}`, `bg-red-600` (the palette is deleted, so this silently renders nothing).
- Using risk colors for non-risk meaning (status, success toasts, brand accents).
- A colored dot or color fill as the only risk signal.
- `dark:` variants sprinkled in components instead of semantic tokens.
- `outline: none` without the token focus ring.
- New one-off shadows, radii or font sizes outside the scale.
- Copying the DESIGN_SYSTEM hex values into TS constants.
