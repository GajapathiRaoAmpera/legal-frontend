import type { NegotiationNote as Note } from "@/api/types";

const FIELDS: [keyof Note, string][] = [
  ["issue", "Issue"],
  ["ask", "Ask"],
  ["fallback", "Fallback"],
  ["walk_away", "Walk-away"],
  ["business_justification", "Business justification"],
];

export function NegotiationNote({ note, defaultOpen }: { note: Note; defaultOpen: boolean }) {
  return (
    <details open={defaultOpen} className="rounded-lg border border-border bg-surface p-card">
      <summary className="cursor-pointer text-base font-semibold">Negotiation note</summary>
      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
        {FIELDS.map(([k, label]) => (
          <div key={k} className="contents">
            <dt className="font-medium text-fg-muted">{label}</dt>
            <dd className="whitespace-pre-wrap">{note[k]}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
