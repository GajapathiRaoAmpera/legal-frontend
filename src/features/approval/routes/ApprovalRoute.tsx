import { lazy, Suspense, useState } from "react";
import { Check, Eye, MessageSquareWarning, Send, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ApprovalDecision } from "@/api/types";
import { useCan, useMe } from "@/auth/useMe";
import { Alert, QueryErrorAlert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { LoadingRows, Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RiskBadge } from "@/features/risk/RiskBadge";
import { useRiskReport } from "@/features/risk/hooks/useRiskReport";
import { useContract } from "@/hooks/useContract";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePackage, useResubmit } from "@/hooks/usePackage";
import { CLAUSE_TYPE_LABEL, formatDate, shortHash, STATUS_LABEL } from "@/lib/format";
import { client, unwrap } from "@/api/client";
import { keys } from "@/api/keys";
import { AuditTrail } from "../components/AuditTrail";
import { DecisionForm } from "../components/DecisionForm";
import { ExportMenu } from "../components/ExportMenu";
import { useApprovals, useAudit } from "../hooks/useApproval";
import { exportGate } from "../lib/exportGate";

// redline data comes from the redlines endpoint; this screen only summarizes it

const SideBySidePreview = lazy(() => import("../components/SideBySidePreview"));
const DECISION_ICON: Record<ApprovalDecision, typeof Check> = {
  approve: Check,
  request_changes: MessageSquareWarning,
  reject: X,
};
const DECISION_LABEL: Record<ApprovalDecision, string> = {
  approve: "Approved",
  request_changes: "Changes requested",
  reject: "Rejected",
};

export function Component() {
  const { contractId = "" } = useParams();
  const contract = useContract(contractId);
  useDocumentTitle(contract.data?.title, "Approval");
  const pkg = usePackage(contractId);
  const approvals = useApprovals(pkg.data?.id);
  const audit = useAudit(contractId);
  const report = useRiskReport(contractId);
  const redlines = useQuery({
    queryKey: keys.redlines(contractId),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/contracts/{contract_id}/redlines", {
          params: { path: { contract_id: contractId } },
          signal,
        }),
      ),
  });
  const canApprove = useCan("approve");
  const canResubmit = useCan("resubmit");
  const me = useMe();
  const resubmit = useResubmit(contractId);
  const [preview, setPreview] = useState(false);

  if (pkg.isError) return <QueryErrorAlert error={pkg.error} onRetry={() => void pkg.refetch()} />;
  if (pkg.isPending || !contract.data) return <LoadingRows label="Loading review package…" />;
  const p = pkg.data;
  const c = contract.data;
  const clauses = new Map((report.data?.items ?? []).map((x) => [x.id, x]));
  const undecided = (redlines.data ?? []).filter((r) => r.status === "proposed").length;
  const reviewedByMe = (audit.data ?? []).some(
    (e) => e.entity_type === "redline" && e.actor === me.data?.name,
  );
  const lastReject = approvals.data?.find((a) => a.decision !== "approve" && a.comment);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="sr-only">Lawyer approval</h2>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2">
          Package <StatusBadge status={p.status} />
        </span>
        {p.approved_at ? <span>Approved {formatDate(p.approved_at)}</span> : null}
        <span>
          Playbook{" "}
          <code className="font-mono" title={c.playbook_version_hash ?? undefined}>
            {shortHash(c.playbook_version_hash)}
          </code>
        </span>
      </div>

      {lastReject && p.status !== "approved" ? (
        <Alert title={`${DECISION_LABEL[lastReject.decision]} by lawyer`}>
          <p className="whitespace-pre-wrap">{lastReject.comment}</p>
        </Alert>
      ) : null}
      {p.status === "changes_requested" && canResubmit ? (
        <div>
          <Button
            variant="primary"
            leadingIcon={Send}
            loading={resubmit.isPending}
            onClick={() => resubmit.mutate(p.id)}
          >
            Resubmit to lawyer
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="pkg-summary" className="flex flex-col gap-2">
            <h2 id="pkg-summary" className="text-xl font-semibold">
              Executive summary
            </h2>
            <p className="max-w-[72ch] font-serif text-md whitespace-pre-line">
              {p.executive_summary || "No summary yet."}
            </p>
          </section>

          <section aria-labelledby="pkg-issues" className="flex flex-col gap-2">
            <h2 id="pkg-issues" className="text-xl font-semibold">
              Consistency issues
            </h2>
            {p.consistency_issues.length === 0 ? (
              <p className="text-sm">No consistency issues found by Legal Review.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {p.consistency_issues.map((i) => (
                  <li
                    key={i.kind + i.message}
                    className="rounded-lg border border-border bg-surface p-3 text-sm"
                  >
                    <span className="mr-2 rounded-sm border border-border bg-sunken px-1.5 text-xs font-medium">
                      {i.kind.replace(/_/g, " ")}
                    </span>
                    {i.message}
                    {i.clause_ids.length ? (
                      <span className="mt-1 flex flex-wrap gap-2">
                        {i.clause_ids.map((id) => {
                          const cl = clauses.get(id);
                          return (
                            <Link
                              key={id}
                              to={`/contracts/${contractId}?clause=${id}`}
                              className="text-link underline"
                            >
                              {cl
                                ? (cl.heading ?? CLAUSE_TYPE_LABEL[cl.clause_type])
                                : `Clause ${id.slice(0, 8)}`}
                            </Link>
                          );
                        })}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="pkg-redlines" className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 id="pkg-redlines" className="text-xl font-semibold">
                Redline decisions
              </h2>
              <Link
                to={`/contracts/${contractId}/redlines`}
                className="text-sm text-link underline"
              >
                Open redline editor
              </Link>
            </div>
            {undecided > 0 ? (
              <p className="text-sm font-medium">
                {undecided} {undecided === 1 ? "redline has" : "redlines have"} no decision yet.
              </p>
            ) : null}
            {redlines.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">Redline decisions</caption>
                  <thead className="bg-sunken text-left text-xs font-medium text-fg-muted">
                    <tr>
                      <th scope="col" className="cell">
                        Clause
                      </th>
                      <th scope="col" className="cell">
                        Risk
                      </th>
                      <th scope="col" className="cell">
                        Decision
                      </th>
                      <th scope="col" className="cell text-right">
                        Comments
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(redlines.data ?? []).map((r) => {
                      const cl = clauses.get(r.clause_id);
                      return (
                        <tr key={r.id} className="border-t border-border">
                          <td className="cell">
                            {cl ? (cl.heading ?? CLAUSE_TYPE_LABEL[cl.clause_type]) : "Clause"}
                          </td>
                          <td className="cell">
                            <RiskBadge level={cl?.risk?.level ?? null} />
                          </td>
                          <td className="cell">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="cell text-right tabular-nums">{r.comments.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="pkg-approvals" className="flex flex-col gap-2">
            <h2 id="pkg-approvals" className="text-xl font-semibold">
              Approvals history
            </h2>
            {approvals.data?.length ? (
              <ol className="flex flex-col gap-2">
                {approvals.data.map((a) => {
                  const Icon = DECISION_ICON[a.decision];
                  return (
                    <li
                      key={a.id}
                      className="rounded-lg border border-border bg-surface p-3 text-sm"
                    >
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Icon aria-hidden="true" className="size-4" />
                        {DECISION_LABEL[a.decision]}
                      </span>{" "}
                      · {a.user_id} ·{" "}
                      <time dateTime={a.created_at}>{formatDate(a.created_at)}</time>
                      {a.comment ? <p className="mt-1 whitespace-pre-wrap">{a.comment}</p> : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-fg-muted">No decisions recorded yet.</p>
            )}
          </section>

          {audit.isError ? (
            <QueryErrorAlert error={audit.error} onRetry={() => void audit.refetch()} />
          ) : (
            <AuditTrail events={audit.data ?? []} />
          )}
        </div>

        <div className="flex flex-col gap-4">
          {canApprove ? (
            <>
              {reviewedByMe ? <Alert title="You also reviewed this package." /> : null}
              <DecisionForm pkg={p} contract={c} />
            </>
          ) : (
            <Alert title="Only a lawyer can approve, request changes or reject this package." />
          )}
          <section
            aria-labelledby="export-heading"
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-card"
          >
            <h2 id="export-heading" className="text-xl font-semibold">
              Export
            </h2>
            <ExportMenu contract={c} pkg={p} />
            {exportGate(p).allowed ? (
              <Button
                variant="ghost"
                leadingIcon={Eye}
                aria-expanded={preview}
                onClick={() => setPreview((v) => !v)}
              >
                {preview ? "Hide side-by-side preview" : "Preview side-by-side PDF"}
              </Button>
            ) : null}
            <p className="text-xs text-fg-muted">Status: {STATUS_LABEL[p.status]}</p>
          </section>
        </div>
      </div>
      {preview ? (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <SideBySidePreview contractId={contractId} />
        </Suspense>
      ) : null}
    </div>
  );
}
