import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import type { PlaybookDiff } from "@/api/types";
import { client, unwrap } from "@/api/client";
import { QueryErrorAlert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CLAUSE_TYPE_LABEL } from "@/lib/format";

export function Component() {
  const { a = "", b = "" } = useParams();
  const diff = useQuery<PlaybookDiff>({
    queryKey: ["playbook", "diff", a, b],
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/playbook/versions/{a}/diff/{b}", {
          params: { path: { a, b } },
          signal,
        }),
      ),
  });
  if (diff.isError)
    return <QueryErrorAlert error={diff.error} onRetry={() => void diff.refetch()} />;
  if (diff.isPending) return <Skeleton className="h-64" />;
  const d = diff.data;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/playbook/versions" className="text-sm text-link underline">
          Back to versions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Playbook diff</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(
          [
            ["Added", d.added],
            ["Changed", d.changed],
            ["Removed", d.removed],
          ] as const
        ).map(([label, items]) => (
          <Card key={label}>
            <h2 className="font-medium">
              {label} ({items.length})
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {items.map((item) => {
                const position = "after" in item ? item.after : item;
                return (
                  <li key={position.id}>
                    {CLAUSE_TYPE_LABEL[position.clause_type]} ·{" "}
                    <span className="capitalize">{position.position}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
