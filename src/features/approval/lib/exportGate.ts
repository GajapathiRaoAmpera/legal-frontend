import type { ExportFormat, ReviewPackage } from "@/api/types";

export type ExportGate =
  { allowed: true } | { allowed: false; reason: "not_approved" | "no_approver" | "loading" };

/** Export only when approved AND an approver is recorded (the server also returns 409 otherwise). */
export function exportGate(pkg: ReviewPackage | undefined): ExportGate {
  if (!pkg) return { allowed: false, reason: "loading" };
  if (pkg.status !== "approved") return { allowed: false, reason: "not_approved" };
  if (pkg.approver_id === null) return { allowed: false, reason: "no_approver" };
  return { allowed: true };
}

export const EXPORT_GATE_MESSAGE = "Export is available after a lawyer approves the package.";

export const EXPORT_FORMATS: { format: ExportFormat; label: string; ext: "docx" | "pdf" }[] = [
  { format: "redlined_docx", label: "Redlined .docx (tracked changes)", ext: "docx" },
  { format: "clean_docx", label: "Clean .docx", ext: "docx" },
  { format: "side_by_side_pdf", label: "Side-by-side PDF", ext: "pdf" },
];
