import { useState } from "react";
import { History } from "lucide-react";
import type { AuditEvent } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

const humanAction = (a: string) => {
  const s = a.replace(/[._]/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));

/** Text only: details render as key/value text, never HTML or markdown. */
export function AuditTrail({ events }: { events: AuditEvent[] }) {
  const [type, setType] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const types = [...new Set(events.map((e) => e.entity_type))];
  const filtered = [...events]
    .filter((e) => type === "all" || e.entity_type === type)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const visible = expanded ? filtered : filtered.slice(0, 20);

  return (
    <section aria-labelledby="audit-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="audit-heading" className="flex items-center gap-2 text-xl font-semibold">
          <History aria-hidden="true" className="size-5" />
          Audit trail
        </h2>
        <div className="flex flex-col gap-1" data-print-hide>
          <label htmlFor="audit-type" className="text-xs font-medium">
            Entity
          </label>
          <select
            id="audit-type"
            className={cn(inputClass, "h-7 w-auto text-sm")}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="all">All</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-fg-muted">No audit events.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {visible.map((e) => (
            <li key={e.id} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{e.actor}</span> · {humanAction(e.action)} ·{" "}
                <span className="text-fg-muted">
                  {e.entity_type}{" "}
                  <code className="font-mono text-xs">{e.entity_id.slice(0, 8)}</code>
                </span>
              </span>
              <time dateTime={e.created_at} className="text-xs text-fg-muted tabular-nums">
                {formatDate(e.created_at)}
              </time>
              {Object.keys(e.details).length ? (
                <dl className="flex flex-wrap gap-x-3 text-xs text-fg-muted">
                  {Object.entries(e.details).map(([k, v]) => (
                    <div key={k} className="flex gap-1">
                      <dt>{k}:</dt>
                      <dd className="break-all text-fg">{show(v)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {filtered.length > 20 ? (
        <Button size="sm" variant="ghost" onClick={() => setExpanded((x) => !x)}>
          {expanded ? "Show fewer events" : `Show all ${filtered.length} events`}
        </Button>
      ) : null}
    </section>
  );
}
