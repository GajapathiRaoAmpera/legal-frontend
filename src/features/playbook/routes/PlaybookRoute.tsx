import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import type { ClauseType, PlaybookPositionOut } from "@/api/types";
import { client, unwrap } from "@/api/client";
import { QueryErrorAlert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCan } from "@/auth/useMe";
import { CLAUSE_TYPE_LABEL, CLAUSE_TYPES } from "@/lib/format";

export function Component() {
  const [type, setType] = useState<ClauseType | "">("");
  const positions = useQuery<PlaybookPositionOut[]>({
    queryKey: ["playbook", "positions", type],
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/playbook/positions", {
          params: { query: type ? { clause_type: type } : {} },
          signal,
        }),
      ),
  });
  const canEdit = useCan("editPlaybook");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <BookOpen aria-hidden="true" className="size-6 text-primary" /> Playbook
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Versioned positions used to assess contract clauses.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="playbook-type" className="text-sm font-medium">
          Clause type
        </label>
        <select
          id="playbook-type"
          className="h-control rounded-md border border-border-strong bg-surface px-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as ClauseType | "")}
        >
          <option value="">All types</option>
          {CLAUSE_TYPES.map((value) => (
            <option key={value} value={value}>
              {CLAUSE_TYPE_LABEL[value]}
            </option>
          ))}
        </select>
        {canEdit ? (
          <span className="text-sm text-fg-muted">Admin editing is enabled for your account.</span>
        ) : null}
      </div>
      {positions.isError ? (
        <QueryErrorAlert error={positions.error} onRetry={() => void positions.refetch()} />
      ) : null}
      {positions.isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(positions.data ?? []).map((position) => (
            <Card key={position.id}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium">{CLAUSE_TYPE_LABEL[position.clause_type]}</h2>
                <span className="rounded border border-border px-1.5 text-xs capitalize">
                  {position.position}
                </span>
              </div>
              <p className="mt-3 text-sm whitespace-pre-wrap">{position.text}</p>
              <p className="mt-3 text-xs text-fg-muted">{position.rationale}</p>
              <p className="mt-2 text-xs text-fg-muted">Escalation: {position.escalation}</p>
            </Card>
          ))}
        </div>
      )}
      {!positions.isPending && !positions.data?.length ? (
        <p className="text-sm text-fg-muted">No positions found.</p>
      ) : null}
      <div>
        <Button size="sm" variant="ghost" onClick={() => void positions.refetch()}>
          Refresh positions
        </Button>
      </div>
    </div>
  );
}
