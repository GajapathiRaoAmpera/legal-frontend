import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { PlaybookVersion } from "@/api/types";
import { client, unwrap } from "@/api/client";
import { QueryErrorAlert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, shortHash } from "@/lib/format";

export function Component() {
  const versions = useQuery<PlaybookVersion[]>({
    queryKey: ["playbook", "versions"],
    queryFn: ({ signal }) => unwrap(client.GET("/api/v1/playbook/versions", { signal })),
  });
  if (versions.isError)
    return <QueryErrorAlert error={versions.error} onRetry={() => void versions.refetch()} />;
  if (versions.isPending) return <Skeleton className="h-64" />;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Playbook versions</h1>
        <p className="mt-1 text-sm text-fg-muted">Immutable snapshots of the review positions.</p>
      </div>
      <div className="flex flex-col gap-2">
        {versions.data.map((version, index) => {
          const previous = versions.data[index + 1];
          return (
            <Card key={version.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">Version {version.version}</h2>
                <p className="text-sm text-fg-muted">
                  {formatDate(version.created_at)} by {version.created_by} ·{" "}
                  {version.position_count} positions
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <code className="font-mono" title={version.content_hash}>
                  {shortHash(version.content_hash)}
                </code>
                {previous ? (
                  <Link
                    className="text-link underline"
                    to={`/playbook/versions/${version.id}/diff/${previous.id}`}
                  >
                    Compare
                  </Link>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
