import { forwardRef, useImperativeHandle, useRef } from "react";
import { Check, Pencil, X } from "lucide-react";
import type { Redline } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { useRedlineDecision } from "../hooks/useRedlines";

export type RedlineActionsHandle = {
  accept: () => void;
  reject: () => void;
  focus(which: "accept" | "reject" | "edit"): void;
};

/** Accept / Reject are optimistic (rollback + toast + focus restore in the hook's onError). */
export const RedlineActions = forwardRef<
  RedlineActionsHandle,
  {
    redline: Redline;
    label: string;
    contractId: string;
    locked: boolean;
    canDecide: boolean;
    onEdit: () => void;
  }
>(function RedlineActions({ redline, label, contractId, locked, canDecide, onEdit }, ref) {
  const acceptRef = useRef<HTMLButtonElement>(null);
  const rejectRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const lastAction = useRef<"accept" | "reject">("accept");
  const decision = useRedlineDecision(contractId, {
    onRollback: () => (lastAction.current === "accept" ? acceptRef : rejectRef).current?.focus(),
  });
  const reason = locked
    ? "Redlines are locked because the package was decided."
    : !canDecide
      ? "Only reviewers can decide on redlines."
      : null;
  const reasonId = `redline-lock-${redline.id}`;

  const act = (kind: "accept" | "reject") => {
    if (reason) return;
    lastAction.current = kind;
    decision.mutate({ kind, redlineId: redline.id, label });
  };
  useImperativeHandle(ref, () => ({
    accept: () => act("accept"),
    reject: () => act("reject"),
    focus: (w) => ({ accept: acceptRef, reject: rejectRef, edit: editRef })[w].current?.focus(),
  }));

  const disabled = reason ? { "aria-disabled": true as const, "aria-describedby": reasonId } : {};
  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Decision"
        className="flex flex-wrap gap-2 max-md:[&>button]:flex-1"
      >
        <Button
          ref={acceptRef}
          variant="primary"
          leadingIcon={Check}
          aria-pressed={redline.status === "accepted"}
          onClick={() => act("accept")}
          {...disabled}
        >
          Accept change
        </Button>
        <Button
          ref={rejectRef}
          leadingIcon={X}
          aria-pressed={redline.status === "rejected"}
          onClick={() => act("reject")}
          {...disabled}
        >
          Reject change
        </Button>
        <Button
          ref={editRef}
          variant="ghost"
          leadingIcon={Pencil}
          aria-pressed={redline.status === "edited"}
          onClick={() => !reason && onEdit()}
          {...disabled}
        >
          Edit change
        </Button>
      </div>
      {reason ? (
        <p id={reasonId} className="text-sm text-fg-muted">
          {reason}
        </p>
      ) : null}
    </div>
  );
});
