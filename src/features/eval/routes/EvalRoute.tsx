import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { EvalKind, EvalRun } from "@/api/types";
import { client, unwrap } from "@/api/client";
import { QueryErrorAlert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";

export function Component() {
  const qc = useQueryClient();
  const runs = useQuery<EvalRun[]>({
    queryKey: ["eval", "runs"],
    queryFn: ({ signal }) => unwrap(client.GET("/api/v1/eval/runs", { signal })),
  });
  const start = useMutation({
    mutationFn: (kind: EvalKind) => unwrap(client.POST("/api/v1/eval/runs", { body: { kind } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eval", "runs"] }),
  });
  if (runs.isError)
    return <QueryErrorAlert error={runs.error} onRetry={() => void runs.refetch()} />;
  if (runs.isPending) return <Skeleton className="h-64" />;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Evaluation</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Track quality gates for clause extraction, risk scoring, and retrieval.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" loading={start.isPending} onClick={() => start.mutate("smoke")}>
            Start smoke
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={start.isPending}
            onClick={() => start.mutate("full")}
          >
            Start full
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {runs.data.map((run) => (
          <Card key={run.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link to={`/eval/${run.id}`} className="font-medium text-link underline">
                {run.kind} evaluation
              </Link>
              <p className="text-sm text-fg-muted">
                {formatDate(run.started_at)} · {run.status}
              </p>
            </div>
            <span
              className={
                run.passed === true
                  ? "text-success"
                  : run.passed === false
                    ? "text-danger"
                    : "text-fg-muted"
              }
            >
              {run.passed === true ? "Passed" : run.passed === false ? "Failed" : "Running"}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
