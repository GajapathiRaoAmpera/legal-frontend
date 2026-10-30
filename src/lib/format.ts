import type { ClauseType, ContractStatus, PackageStatus, RedlineStatus } from "@/api/types";

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
const rel = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

export function formatRelative(iso: string, now = Date.now()): string {
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return rel.format(s, "second");
  if (abs < 3600) return rel.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rel.format(Math.round(s / 3600), "hour");
  return rel.format(Math.round(s / 86400), "day");
}

export const CLAUSE_TYPES: readonly ClauseType[] = [
  "liability",
  "indemnity",
  "termination",
  "auto_renewal",
  "payment",
  "ip",
  "confidentiality",
  "data_protection",
  "governing_law",
  "other",
];

export const CLAUSE_TYPE_LABEL: Record<ClauseType, string> = {
  liability: "Liability",
  indemnity: "Indemnity",
  termination: "Termination",
  auto_renewal: "Auto-renewal",
  payment: "Payment",
  ip: "Intellectual property",
  confidentiality: "Confidentiality",
  data_protection: "Data protection",
  governing_law: "Governing law",
  other: "Other",
};

export const STATUS_LABEL: Record<ContractStatus | RedlineStatus | PackageStatus, string> = {
  uploaded: "Uploaded",
  parsing: "Parsing",
  analyzing: "Analyzing",
  awaiting_lawyer: "Awaiting lawyer",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
  failed: "Failed",
  proposed: "Proposed",
  accepted: "Accepted",
  edited: "Edited",
  draft: "Draft",
  ready_for_lawyer: "Ready for lawyer",
};

export const shortHash = (h: string | null | undefined) => (h ? h.slice(0, 7) : "—");
