import { useState } from "react";
import { MessageSquare } from "lucide-react";
import type { Redline } from "@/api/types";
import { useMe } from "@/auth/useMe";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { formatDate, formatRelative } from "@/lib/format";
import { useAddComment } from "../hooks/useRedlines";

const MAX = 2000;

export function CommentThread({
  redline,
  contractId,
  locked,
}: {
  redline: Redline;
  contractId: string;
  locked: boolean;
}) {
  const me = useMe();
  const add = useAddComment(contractId, me.data?.name ?? "You");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const post = () => {
    const text = body.trim();
    if (!text) {
      setError("Write a comment first.");
      return;
    }
    add.mutate({ redlineId: redline.id, body: text });
    setBody("");
    setError(null);
  };

  return (
    <section
      aria-labelledby={`comments-${redline.id}`}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-card"
    >
      <h3 id={`comments-${redline.id}`} className="flex items-center gap-2 text-base font-semibold">
        <MessageSquare aria-hidden="true" className="size-4" />
        Comments ({redline.comments.length})
      </h3>
      {redline.comments.length === 0 ? (
        <p className="text-sm text-fg-muted">No comments yet.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {redline.comments.map((c) => (
            <li
              key={c.id}
              className={cn(
                "border-l-2 border-border pl-3",
                c.id.startsWith("temp-") && "opacity-70",
              )}
            >
              <p className="text-xs text-fg-muted">
                <span className="font-medium text-fg">{c.author}</span> ·{" "}
                <time dateTime={c.created_at} title={formatDate(c.created_at)}>
                  {formatRelative(c.created_at)}
                </time>
                {c.id.startsWith("temp-") ? " · Sending…" : null}
              </p>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ol>
      )}
      {locked ? null : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            post();
          }}
        >
          <Field
            label="Add comment"
            error={error}
            helper={`Ctrl/⌘ + Enter posts. ${body.length}/${MAX}`}
          >
            {(p) => (
              <textarea
                value={body}
                maxLength={MAX}
                rows={3}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (e.target.value.trim()) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    post();
                  }
                }}
                className={cn(inputClass, "py-2")}
                {...p}
              />
            )}
          </Field>
          <div>
            <Button type="submit" leadingIcon={MessageSquare}>
              Post comment
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
