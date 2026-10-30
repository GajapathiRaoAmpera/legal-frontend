import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { DIFF_LIMIT, diffWords, type DiffOp } from "../lib/diff";

const IDLE_THRESHOLD = 20_000;

function useDiff(original: string, proposed: string): DiffOp[] | null | "too-long" {
  const size = original.length + proposed.length;
  const sync = size <= IDLE_THRESHOLD;
  const syncOps = useMemo(
    () => (sync ? diffWords(original, proposed) : null),
    [sync, original, proposed],
  );
  const [idleOps, setIdleOps] = useState<{ key: string; ops: DiffOp[] } | null>(null);
  const key = `${original.length}:${proposed.length}:${original.slice(0, 32)}:${proposed.slice(0, 32)}`;
  useEffect(() => {
    if (sync || size > DIFF_LIMIT) return;
    const run = () => setIdleOps({ key, ops: diffWords(original, proposed) });
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(run, { timeout: 1000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(run, 0);
    return () => clearTimeout(t);
  }, [sync, size, key, original, proposed]);
  if (size > DIFF_LIMIT) return "too-long";
  return syncOps ?? (idleOps?.key === key ? idleOps.ops : null);
}

/** Original (deletions struck) | Proposed (insertions underlined). Text stays text-fg; ins/del colors are decoration only. */
export function RedlineDiff({
  original,
  proposed,
  layout,
  proposedLabel = "Proposed",
}: {
  original: string;
  proposed: string;
  layout: "split" | "stacked";
  proposedLabel?: string;
}) {
  const ops = useDiff(original, proposed);
  const col = "min-w-0 rounded-lg border border-border bg-surface p-card";
  const body = "font-serif text-md whitespace-pre-wrap text-fg";

  let left: ReactNode;
  let right: ReactNode;
  let note: string | null = null;
  if (ops === "too-long") {
    note = "Diff unavailable for very long text.";
    left = original;
    right = proposed;
  } else if (ops === null) {
    left = <Skeleton className="h-24 w-full" />;
    right = <Skeleton className="h-24 w-full" />;
  } else {
    if (original === proposed) note = "No textual change proposed.";
    else if (proposed === "") note = "Proposes deleting this clause.";
    left = ops
      .filter((o) => o.op !== 1)
      .map((o, i) =>
        o.op === 0 ? (
          o.text
        ) : (
          <del key={i} className="bg-del-bg text-fg line-through decoration-del decoration-2">
            <VisuallyHidden.Root>deleted: </VisuallyHidden.Root>
            {o.text}
          </del>
        ),
      );
    right = ops
      .filter((o) => o.op !== -1)
      .map((o, i) =>
        o.op === 0 ? (
          o.text
        ) : (
          <ins
            key={i}
            className="bg-ins-bg text-fg underline decoration-ins decoration-2 underline-offset-2"
          >
            <VisuallyHidden.Root>inserted: </VisuallyHidden.Root>
            {o.text}
          </ins>
        ),
      );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-fg-muted">
        Legend: <span className="line-through decoration-del decoration-2">strikethrough</span> =
        removed,{" "}
        <span className="underline decoration-ins decoration-2 underline-offset-2">underline</span>{" "}
        = added.
      </p>
      {note ? <p className="text-sm font-medium">{note}</p> : null}
      <div className={cn("grid gap-3", layout === "split" ? "grid-cols-2" : "grid-cols-1")}>
        <section aria-label="Original text" className={col}>
          <h4 className="mb-2 text-xs font-medium text-fg-muted">Original</h4>
          <div className={body}>{left}</div>
        </section>
        <section aria-label={`${proposedLabel} text`} className={col}>
          <h4 className="mb-2 text-xs font-medium text-fg-muted">{proposedLabel}</h4>
          <div className={body}>{right || <span className="text-fg-muted">(empty)</span>}</div>
        </section>
      </div>
    </div>
  );
}
