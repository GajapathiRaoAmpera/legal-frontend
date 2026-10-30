import { useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import type { Redline } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { useDraftsStore } from "@/stores/drafts";
import { useRedlineDecision } from "../hooks/useRedlines";

/** Inline edit (no modal). Drafts persist to sessionStorage (debounced) and survive navigation and re-login. */
export function RedlineEditForm({
  redline,
  label,
  contractId,
  onDone,
}: {
  redline: Redline;
  label: string;
  contractId: string;
  onDone: () => void;
}) {
  const base = redline.edited_text ?? redline.proposed_text;
  const draft = useDraftsStore((s) => s.drafts[redline.id]);
  const { setDraft, clearDraft } = useDraftsStore.getState();
  const [text, setText] = useState(draft?.text ?? base);
  const [conflict, setConflict] = useState(
    Boolean(draft && draft.baseUpdatedAt !== redline.updated_at),
  );
  const [confirm, setConfirm] = useState<"discard" | "empty" | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const decision = useRedlineDecision(contractId);
  const changed = text !== base;

  useEffect(() => ref.current?.focus(), []);
  useEffect(() => {
    if (!changed) return;
    const t = setTimeout(() => setDraft(redline.id, text, redline.updated_at), 300);
    return () => clearTimeout(t);
  }, [text, changed, redline.id, redline.updated_at, setDraft]);

  const save = (allowEmpty = false) => {
    if (!changed || decision.isPending) return;
    if (!text.trim() && !allowEmpty) {
      setConfirm("empty");
      return;
    }
    decision.mutate(
      { kind: "edit", redlineId: redline.id, label, editedText: text },
      {
        onSuccess: () => {
          clearDraft(redline.id);
          onDone();
        },
      },
    );
  };
  const cancel = () => {
    if (changed) setConfirm("discard");
    else onDone();
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {conflict ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-md border border-border-strong bg-sunken p-2 text-sm"
        >
          This redline was updated since your draft.
          <Button size="sm" onClick={() => setConflict(false)}>
            Keep draft
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setText(base);
              clearDraft(redline.id);
              setConflict(false);
            }}
          >
            Use latest
          </Button>
        </div>
      ) : null}
      <Field label="Edited text" helper="Ctrl/⌘ + Enter saves. Esc cancels.">
        {(p) => (
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                save();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            rows={Math.min(20, Math.max(4, Math.ceil(text.length / 80)))}
            className={cn(inputClass, "max-h-[60vh] py-2 font-serif text-md")}
            {...p}
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          leadingIcon={Save}
          loading={decision.isPending}
          aria-disabled={!changed || undefined}
          aria-describedby={!changed ? "no-changes" : undefined}
        >
          Save edit
        </Button>
        <Button onClick={cancel}>Cancel</Button>
        {!changed ? (
          <span id="no-changes" className="text-sm text-fg-muted">
            No changes to save
          </span>
        ) : null}
      </div>
      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        role="alertdialog"
        title={confirm === "empty" ? "Save empty text?" : "Discard edit?"}
        description={
          confirm === "empty"
            ? "Saving empty text removes this clause."
            : "Your changes to this redline will be lost."
        }
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setConfirm(null)}>Keep editing</Button>
          {confirm === "empty" ? (
            <Button
              variant="danger"
              onClick={() => {
                setConfirm(null);
                save(true);
              }}
            >
              Remove clause text
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={() => {
                clearDraft(redline.id);
                setConfirm(null);
                onDone();
              }}
            >
              Discard edit
            </Button>
          )}
        </div>
      </Dialog>
    </form>
  );
}
