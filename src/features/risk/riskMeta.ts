import { CircleCheck, ShieldAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { RiskLevel } from "@/api/types";

// Single source of risk presentation: icon + label + token classes (DESIGN_SYSTEM §3.3).
export const RISK_META: Record<
  RiskLevel,
  {
    label: string;
    icon: LucideIcon;
    rank: 3 | 2 | 1;
    cls: { fg: string; bg: string; mark: string };
  }
> = {
  High: {
    label: "High",
    icon: ShieldAlert,
    rank: 3,
    cls: { fg: "text-risk-high", bg: "bg-risk-high-bg", mark: "bg-risk-high-mark" },
  },
  Medium: {
    label: "Medium",
    icon: TriangleAlert,
    rank: 2,
    cls: { fg: "text-risk-medium", bg: "bg-risk-medium-bg", mark: "bg-risk-medium-mark" },
  },
  Low: {
    label: "Low",
    icon: CircleCheck,
    rank: 1,
    cls: { fg: "text-risk-low", bg: "bg-risk-low-bg", mark: "bg-risk-low-mark" },
  },
};

export const RISK_LEVELS: readonly RiskLevel[] = ["High", "Medium", "Low"];
export const rankOf = (level: RiskLevel | null | undefined): 0 | 1 | 2 | 3 =>
  level ? RISK_META[level].rank : 0;
