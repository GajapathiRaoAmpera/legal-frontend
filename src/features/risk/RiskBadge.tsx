import { CircleDashed, CircleHelp } from "lucide-react";
import type { RiskLevel } from "@/api/types";
import { cn } from "@/lib/cn";
import { RISK_META } from "./riskMeta";

const base =
  "inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap";

/** Risk is never color-only: icon (aria-hidden) + visible label + token color. Accessible name = visible text. */
export function RiskBadge({
  level,
  score,
  needsHuman = false,
}: {
  level: RiskLevel | null;
  score?: number;
  needsHuman?: boolean;
}) {
  if (needsHuman && level === null) {
    return (
      <span className={cn(base, "border border-border-strong bg-surface text-fg")}>
        <CircleHelp aria-hidden="true" className="size-3" />
        Needs review
      </span>
    );
  }
  if (level === null) {
    return (
      <span className={cn(base, "bg-sunken text-fg-muted")}>
        <CircleDashed aria-hidden="true" className="size-3" />
        Not assessed
      </span>
    );
  }
  const m = RISK_META[level];
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn(base, m.cls.bg, m.cls.fg)}>
        <Icon aria-hidden="true" className="size-3" />
        {m.label}
        {score === undefined ? null : <span className="tabular-nums"> · {score}</span>}
      </span>
      {needsHuman ? (
        <span className={cn(base, "border border-border-strong bg-surface text-fg")}>
          <CircleHelp aria-hidden="true" className="size-3" />
          Needs review
        </span>
      ) : null}
    </span>
  );
}
