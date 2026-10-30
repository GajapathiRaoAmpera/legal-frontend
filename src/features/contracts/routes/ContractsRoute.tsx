import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { Contract, ContractStatus } from "@/api/types";
import { useCan } from "@/auth/useMe";
import { QueryErrorAlert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Field";
import { LoadingRows } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RISK_LEVELS, RISK_META } from "@/features/risk/riskMeta";
import { ACTIVE_STATUSES } from "@/hooks/useContract";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/cn";
import { formatDate, STATUS_LABEL } from "@/lib/format";
import { ProgressCell } from "../components/ProgressCell";
import { UploadDialog } from "../components/UploadDialog";
import { PAGE_SIZE, useContracts } from "../hooks/useContracts";

const STATUSES: ContractStatus[] = [
  "uploaded",
  "parsing",
  "analyzing",
  "awaiting_lawyer",
  "changes_requested",
  "approved",
  "rejected",
  "failed",
];
const MAX_STREAMS = 6; // HTTP/1.1 per-origin connection limit

const prefetchViewer = () => void import("@/features/viewer/routes/ViewerRoute");

function RiskCounts({ c }: { c: Contract }) {
  return (
    <span className="inline-flex flex-wrap gap-2">
      {RISK_LEVELS.map((l) => {
        const m = RISK_META[l];
        const Icon = m.icon;
        return (
          <span
            key={l}
            className={cn("inline-flex items-center gap-1 text-sm tabular-nums", m.cls.fg)}
          >
            <Icon aria-hidden="true" className="size-3.5" />
            <span className="sr-only">{m.label}:</span>
            {c.risk_counts[l]}
          </span>
        );
      })}
    </span>
  );
}

export function Component() {
  useDocumentTitle("Contracts");
  const [params, setParams] = useSearchParams();
  const offset = Math.max(0, Number(params.get("offset") ?? 0) || 0);
  const statusParam = params.get("status");
  const status = STATUSES.includes(statusParam as ContractStatus)
    ? (statusParam as ContractStatus)
    : null;
  const q = useContracts({ offset, status });
  const canUpload = useCan("upload");
  const set = (patch: Record<string, string | null>) =>
    setParams((p) => {
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) p.delete(k);
        else p.set(k, v);
      }
      return p;
    });

  const items = q.data?.items ?? [];
  let streams = 0;
  const streamFor = new Set(
    items.filter((c) => ACTIVE_STATUSES.has(c.status) && streams++ < MAX_STREAMS).map((c) => c.id),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 tabIndex={-1} className="font-serif text-2xl font-semibold">
            Contracts
          </h1>
          <p className="text-fg-muted">
            Upload a contract to start a review, or open one in progress.
          </p>
        </div>
        {canUpload ? <UploadDialog /> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="status-filter" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status-filter"
          className={cn(inputClass, "h-control w-auto")}
          value={status ?? ""}
          onChange={(e) => set({ status: e.target.value || null, offset: null })}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {q.isPending ? (
        <LoadingRows label="Loading contracts…" />
      ) : q.isError ? (
        <QueryErrorAlert error={q.error} onRetry={() => void q.refetch()} />
      ) : items.length === 0 ? (
        status ? (
          <EmptyState
            message={`No contracts with status ${STATUS_LABEL[status]}.`}
            action={
              <Button onClick={() => set({ status: null, offset: null })}>Clear filter</Button>
            }
          />
        ) : (
          <EmptyState
            message="No contracts yet. Upload a .docx or .pdf to start a review."
            action={canUpload ? <UploadDialog /> : undefined}
          />
        )
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse text-sm max-md:block">
              <caption className="sr-only">Contracts</caption>
              <thead className="bg-sunken text-left text-xs font-medium text-fg-muted max-md:hidden">
                <tr>
                  <th scope="col" className="cell">
                    Title
                  </th>
                  <th scope="col" className="cell">
                    Status
                  </th>
                  <th scope="col" className="cell">
                    Risk (High / Medium / Low)
                  </th>
                  <th scope="col" className="cell text-right">
                    Pages
                  </th>
                  <th scope="col" className="cell">
                    Uploaded by
                  </th>
                  <th scope="col" className="cell">
                    Updated
                  </th>
                  <th scope="col" className="cell">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="max-md:block">
                {items.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border align-top hover:bg-sunken max-md:flex max-md:flex-col max-md:gap-1 max-md:p-3"
                  >
                    <td className="cell max-md:p-0">
                      <Link
                        to={`/contracts/${c.id}`}
                        onMouseEnter={prefetchViewer}
                        onFocus={prefetchViewer}
                        className="font-medium text-link underline-offset-2 hover:underline"
                      >
                        {c.title}
                      </Link>
                      <span className="block text-xs text-fg-muted">{c.filename}</span>
                    </td>
                    <td className="cell max-md:p-0">
                      <div className="flex flex-col gap-2">
                        <StatusBadge status={c.status} />
                        <ProgressCell contract={c} stream={streamFor.has(c.id)} />
                      </div>
                    </td>
                    <td className="cell max-md:p-0">
                      <RiskCounts c={c} />
                    </td>
                    <td className="cell text-right tabular-nums max-md:p-0 max-md:text-left">
                      <span className="md:sr-only">Pages: </span>
                      {c.page_count}
                    </td>
                    <td className="cell max-md:p-0">{c.uploaded_by}</td>
                    <td className="cell whitespace-nowrap tabular-nums max-md:p-0">
                      <time dateTime={c.updated_at}>{formatDate(c.updated_at)}</time>
                    </td>
                    <td className="cell max-md:p-0">
                      {ACTIVE_STATUSES.has(c.status) ? null : (
                        <Link
                          to={`/contracts/${c.id}`}
                          className="inline-flex items-center gap-1 text-link underline"
                          aria-label={`Open review: ${c.title}`}
                        >
                          Open review
                          <ExternalLink aria-hidden="true" className="size-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="Pagination" className="flex items-center justify-between gap-2 text-sm">
            <span className="text-fg-muted tabular-nums">
              {offset + 1}–{offset + items.length} of {q.data.total}
            </span>
            <span className="flex gap-2">
              <Button
                size="sm"
                leadingIcon={ChevronLeft}
                aria-disabled={offset === 0 || undefined}
                onClick={() => set({ offset: String(Math.max(0, offset - PAGE_SIZE)) })}
              >
                Previous page
              </Button>
              <Button
                size="sm"
                aria-disabled={offset + PAGE_SIZE >= q.data.total || undefined}
                onClick={() => set({ offset: String(offset + PAGE_SIZE) })}
              >
                Next page
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </span>
          </nav>
        </>
      )}
    </div>
  );
}
