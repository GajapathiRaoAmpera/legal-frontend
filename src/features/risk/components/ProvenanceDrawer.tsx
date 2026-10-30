import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import type { ClauseWithRisk } from "@/api/types";
import { QueryErrorAlert } from "@/components/ui/Alert";
import { Drawer } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { CLAUSE_TYPE_LABEL } from "@/lib/format";
import { usePositions } from "../hooks/useRiskReport";
import { RiskBadge } from "../RiskBadge";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-border pb-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

const POSITION_LABEL = {
  preferred: "Preferred",
  fallback: "Fallback",
  unacceptable: "Unacceptable",
} as const;

export function ProvenanceDrawer({
  contractId,
  clause,
  open,
  onOpenChange,
  currentPlaybookHash,
}: {
  contractId: string;
  clause: ClauseWithRisk | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlaybookHash: string | null;
}) {
  const risk = clause?.risk ?? null;
  const positions = usePositions(
    clause?.clause_type ?? null,
    open && risk?.playbook_position_id != null,
  );
  const position = positions.data?.find((p) => p.id === risk?.playbook_position_id) ?? null;
  const p = risk?.provenance;
  const stale = p && currentPlaybookHash && p.playbook_version_hash !== currentPlaybookHash;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={risk ? `Why this is ${risk.level} risk` : "Provenance"}
    >
      {!clause || !risk || !p ? (
        <p className="text-sm text-fg-muted">This clause has no risk assessment.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Section title="Assessment">
            <div className="flex items-center gap-2">
              <RiskBadge level={risk.level} score={risk.score} needsHuman={clause.needs_human} />
              <span className="text-sm text-fg-muted">{CLAUSE_TYPE_LABEL[clause.clause_type]}</span>
            </div>
            <p className="text-sm">{risk.rationale}</p>
            <blockquote className="font-serif text-md underline decoration-2 underline-offset-4">
              {risk.quoted_span}
            </blockquote>
            {risk.red_flags.length ? (
              <ul className="ml-4 list-disc text-sm">
                {risk.red_flags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            ) : null}
          </Section>
          <Section title="Playbook position">
            {risk.playbook_position_id === null ? (
              <p className="text-sm">No playbook position matched. Assessed on general rules.</p>
            ) : positions.isPending ? (
              <Skeleton className="h-16 w-full" />
            ) : positions.isError ? (
              <QueryErrorAlert error={positions.error} onRetry={() => void positions.refetch()} />
            ) : position ? (
              <dl className="flex flex-col gap-1.5">
                <Row label="Position">{POSITION_LABEL[position.position]}</Row>
                <Row label="Text">{position.text}</Row>
                <Row label="Rationale">{position.rationale}</Row>
                <Row label="Escalation">{position.escalation}</Row>
              </dl>
            ) : (
              <p className="text-sm">
                Position <code className="font-mono">{risk.playbook_position_id}</code> is not in
                the current playbook version.
              </p>
            )}
          </Section>
          <Section title="Model">
            <dl className="flex flex-col gap-1.5">
              <Row label="Provider">{p.provider}</Row>
              <Row label="Model">
                <code className="font-mono">{p.model_id}</code>
              </Row>
              <Row label="Prompt">
                <code className="font-mono">
                  {p.prompt_id}@{p.prompt_version}
                </code>
              </Row>
            </dl>
          </Section>
          <Section title="Traceability">
            {stale ? (
              <p className="flex items-start gap-1.5 text-sm">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  Assessed against an older playbook version.{" "}
                  <Link to="/playbook/versions" className="text-link underline">
                    Compare versions
                  </Link>
                </span>
              </p>
            ) : null}
            <dl className="flex flex-col gap-1.5">
              <Row label="Playbook version">
                <code className="font-mono">{p.playbook_version_hash}</code>
              </Row>
              <Row label="Retrieved chunks">
                {p.retrieved_chunk_ids.length ? (
                  <ul className="font-mono">
                    {p.retrieved_chunk_ids.map((id) => (
                      <li key={id}>{id}</li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Langfuse trace">
                <code className="font-mono">{p.langfuse_trace_id ?? "—"}</code>
              </Row>
            </dl>
          </Section>
          <Link
            to={`/contracts/${contractId}?clause=${clause.id}`}
            className="text-sm text-link underline"
          >
            View clause in contract
          </Link>
        </div>
      )}
    </Drawer>
  );
}
