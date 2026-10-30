import type { ClauseType, ContractStatus } from "./types";

export const keys = {
  me: () => ["me"] as const,
  contracts: (p?: { limit: number; offset: number; status: ContractStatus | null }) =>
    p ? (["contracts", p] as const) : (["contracts"] as const),
  contract: (id: string) => ["contract", id] as const,
  contractText: (id: string) => ["contract-text", id] as const,
  clauses: (id: string) => ["clauses", id] as const,
  riskReport: (id: string) => ["risk-report", id] as const,
  redlines: (id: string) => ["redlines", id] as const,
  package: (id: string) => ["package", id] as const,
  approvals: (packageId: string) => ["approvals", packageId] as const,
  audit: (id: string) => ["audit", id] as const,
  positions: (clauseType: ClauseType | null) => ["playbook", "positions", clauseType] as const,
  versions: () => ["playbook", "versions"] as const,
  versionDiff: (a: string, b: string) => ["playbook", "diff", a, b] as const,
  evalRuns: () => ["eval", "runs"] as const,
  evalRun: (id: string) => ["eval", "run", id] as const,
};
