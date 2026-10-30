import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { RedlineStatus } from "@/api/types";
import { useCan } from "@/auth/useMe";
import { Alert, QueryErrorAlert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Field";
import { LoadingRows } from "@/components/ui/Skeleton";
import { useRiskReport } from "@/features/risk/hooks/useRiskReport";
import { useContract } from "@/hooks/useContract";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { isLocked, usePackage, useResubmit } from "@/hooks/usePackage";
import { usePaneFocus } from "@/hooks/useRouteFocus";
import { cn } from "@/lib/cn";
import { formatDate, STATUS_LABEL } from "@/lib/format";
import { CommentThread } from "../components/CommentThread";
import { NegotiationNote } from "../components/NegotiationNote";
import { RedlineActions, type RedlineActionsHandle } from "../components/RedlineActions";
import { RedlineDiff } from "../components/RedlineDiff";
import { RedlineEditForm } from "../components/RedlineEditForm";
import { redlineLabel, RedlineList } from "../components/RedlineList";
import { useRedlines } from "../hooks/useRedlines";

const FILTERS: (RedlineStatus | "all")[] = ["all", "proposed", "accepted", "edited", "rejected"];

export function Component() {
  const { contractId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const contract = useContract(contractId);
  useDocumentTitle(contract.data?.title, "Redlines");
  const redlines = useRedlines(contractId);
  const report = useRiskReport(contractId);
  const pkg = usePackage(contractId);
  const resubmit = useResubmit(contractId);
  const canDecide = useCan("decideRedline");
  const canResubmit = useCan("resubmit");
  const split = useMediaQuery("(min-width: 1024px)");
  const [statusFilter, setStatusFilter] = useState<RedlineStatus | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const paneHeading = useRef<HTMLHeadingElement>(null);
  const actions = useRef<RedlineActionsHandle>(null);

  const clausesById = useMemo(
    () => new Map((report.data?.items ?? []).map((c) => [c.id, c])),
    [report.data],
  );
  const all = redlines.data ?? [];
  const list = statusFilter === "all" ? all : all.filter((r) => r.status === statusFilter);
  const byClause = params.get("clause");
  const selectedId =
    params.get("redline") ??
    all.find((r) => r.clause_id === byClause)?.id ??
    (all.find((r) => r.status === "proposed") ?? all[0])?.id ??
    null;
  const selected = all.find((r) => r.id === selectedId) ?? null;
  const locked = isLocked(pkg.data);
  const label = selected ? redlineLabel(clausesById.get(selected.clause_id)) : "";

  usePaneFocus(paneHeading, selectedId);
  useEffect(() => setEditing(null), [selectedId]);

  const select = (id: string) =>
    setParams(
      (p) => {
        p.set("redline", id);
        p.delete("clause");
        return p;
      },
      { replace: true },
    );
  const step = (dir: 1 | -1) => {
    const i = list.findIndex((r) => r.id === selectedId);
    const next = list[i + dir];
    if (next) select(next.id);
  };
  const decide = canDecide && !locked && selected !== null && editing === null;
  useHotkeys(
    {
      j: () => step(1),
      k: () => step(-1),
      a: () => decide && actions.current?.accept(),
      r: () => decide && actions.current?.reject(),
      e: (ev) => {
        if (!decide) return;
        ev.preventDefault();
        setEditing(selected.id);
      },
    },
    { enabled: editing === null },
  );

  if (redlines.isError)
    return <QueryErrorAlert error={redlines.error} onRetry={() => void redlines.refetch()} />;
  if (redlines.isPending) return <LoadingRows label="Loading redlines…" />;
  if (all.length === 0) {
    return (
      <EmptyState
        message="No redlines proposed. Only High-risk clauses get redlines."
        action={
          <Link to={`/contracts/${contractId}/risks`} className="text-link underline">
            Open the risk dashboard
          </Link>
        }
      />
    );
  }

  const counts = all.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {},
  );
  const proposedLabel = selected?.status === "edited" ? "Your edit" : "Proposed";
  const proposedText =
    selected?.status === "edited" && selected.edited_text !== null
      ? selected.edited_text
      : (selected?.proposed_text ?? "");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Redline editor</h2>
      {pkg.data && locked ? (
        <Alert
          title={`Package ${STATUS_LABEL[pkg.data.status].toLowerCase()}${pkg.data.approved_at ? ` on ${formatDate(pkg.data.approved_at)}` : ""}. Redlines are locked.`}
        />
      ) : pkg.data?.status === "ready_for_lawyer" ? (
        <Alert title="Changes will be visible to the lawyer reviewing this package." />
      ) : pkg.data?.status === "changes_requested" ? (
        <Alert
          title="The lawyer requested changes."
          action={
            canResubmit ? (
              <Button
                variant="primary"
                size="sm"
                leadingIcon={Send}
                loading={resubmit.isPending}
                onClick={() => pkg.data && resubmit.mutate(pkg.data.id)}
              >
                Resubmit to lawyer
              </Button>
            ) : undefined
          }
        >
          Update the redlines, then resubmit the package. The lawyer&rsquo;s comment is on the{" "}
          <Link to={`/contracts/${contractId}/approval`} className="text-link underline">
            Approval tab
          </Link>
          .
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="redline-filter" className="text-xs font-medium">
              Show
            </label>
            <select
              id="redline-filter"
              className={cn(inputClass, "h-control")}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RedlineStatus | "all")}
            >
              {FILTERS.map((f) => (
                <option key={f} value={f}>
                  {f === "all" ? `All (${all.length})` : `${STATUS_LABEL[f]} (${counts[f] ?? 0})`}
                </option>
              ))}
            </select>
          </div>
          {list.length ? (
            <RedlineList
              redlines={list}
              clausesById={clausesById}
              selectedId={selectedId}
              onSelect={select}
            />
          ) : (
            <p className="text-sm text-fg-muted">No redlines with this status.</p>
          )}
        </div>

        {selected ? (
          <section aria-labelledby="redline-pane" className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3
                id="redline-pane"
                ref={paneHeading}
                tabIndex={-1}
                className="text-xl font-semibold"
              >
                {label}
              </h3>
              <span className="text-sm text-fg-muted">Status: {STATUS_LABEL[selected.status]}</span>
            </div>
            {editing === selected.id ? (
              <RedlineEditForm
                redline={selected}
                label={label}
                contractId={contractId}
                onDone={() => {
                  setEditing(null);
                  requestAnimationFrame(() => actions.current?.focus("edit"));
                }}
              />
            ) : (
              <>
                <RedlineDiff
                  original={selected.original_text}
                  proposed={proposedText}
                  layout={split ? "split" : "stacked"}
                  proposedLabel={proposedLabel}
                />
                <RedlineActions
                  ref={actions}
                  redline={selected}
                  label={label}
                  contractId={contractId}
                  locked={locked}
                  canDecide={canDecide}
                  onEdit={() => setEditing(selected.id)}
                />
              </>
            )}
            <NegotiationNote
              note={selected.negotiation_note}
              defaultOpen={clausesById.get(selected.clause_id)?.risk?.level === "High"}
            />
            <CommentThread redline={selected} contractId={contractId} locked={locked} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
