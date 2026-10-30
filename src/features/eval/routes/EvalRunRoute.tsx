import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import type { EvalRun } from "@/api/types";
import { client, unwrap } from "@/api/client";
import { QueryErrorAlert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";

export function Component() {
  const { runId = "" } = useParams();
  const run = useQuery<EvalRun>({
    queryKey: ["eval", "run", runId],
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/eval/runs/{run_id}", { params: { path: { run_id: runId } }, signal }),
      ),
    refetchInterval: (q) => (q.state.data?.status === "running" ? 5000 : false),
  });
  if (run.isError) return <QueryErrorAlert error={run.error} onRetry={() => void run.refetch()} />;
  if (run.isPending) return <Skeleton className="h-64" />;
  return (
    <div className="flex flex-col gap-6">
      <Link to="/eval" className="text-sm text-link underline">
        Back to evaluations
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{run.data.kind} evaluation</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {formatDate(run.data.started_at)} · {run.data.status}
        </p>
      </div>
      <Card>
        <h2 className="font-medium">Metrics</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {Object.entries(run.data.metrics).map(([name, value]) => (
            <div key={name}>
              <dt className="text-sm text-fg-muted">{name}</dt>
              <dd className="font-mono">{value.toFixed(3)}</dd>
            </div>
          ))}
        </dl>
      </Card>
      {run.data.report_md ? (
        <Card>
          <h2 className="font-medium">Report</h2>
          <pre className="mt-3 text-sm whitespace-pre-wrap">{run.data.report_md}</pre>
        </Card>
      ) : null}
    </div>
  );
}
