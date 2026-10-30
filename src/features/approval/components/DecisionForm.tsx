import { useRef, useState } from "react";
import { Check, MessageSquareWarning, X, type LucideIcon } from "lucide-react";
import { errorMessage } from "@/api/errors";
import type { ApprovalDecision, Contract, ReviewPackage } from "@/api/types";
import { Alert } from "@/components/ui/Alert";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { STATUS_LABEL } from "@/lib/format";
import { useSubmitDecision } from "../hooks/useApproval";

const MAX = 4000;
const OPTIONS: {
  value: ApprovalDecision;
  label: string;
  icon: LucideIcon;
  button: string;
  variant: ButtonVariant;
}[] = [
  {
    value: "approve",
    label: "Approve",
    icon: Check,
    button: "Approve package",
    variant: "primary",
  },
  {
    value: "request_changes",
    label: "Request changes",
    icon: MessageSquareWarning,
    button: "Request changes",
    variant: "secondary",
  },
  { value: "reject", label: "Reject", icon: X, button: "Reject package", variant: "danger" },
];

function blockedReason(pkg: ReviewPackage): string | null {
  switch (pkg.status) {
    case "ready_for_lawyer":
      return null;
    case "draft":
      return "Package is still in draft. Legal Review has not finished.";
    case "approved":
      return "Package already approved.";
    case "rejected":
      return "Package already rejected.";
    case "changes_requested":
      return "Changes were requested. The reviewer must resubmit the package first.";
  }
}

/** Rendered only for lawyers (the caller gates on useCan("approve")). Comment required for Reject; confirm dialog names the decision. */
export function DecisionForm({ pkg, contract }: { pkg: ReviewPackage; contract: Contract }) {
  const [decision, setDecision] = useState<ApprovalDecision>("approve");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const submit = useSubmitDecision(contract.id, pkg.id);
  const blocked = blockedReason(pkg);
  const opt = OPTIONS.find((o) => o.value === decision) ?? OPTIONS[0];
  if (!opt) return null;

  const validate = () => {
    if (decision === "reject" && !comment.trim()) {
      setError("A comment is required to reject.");
      commentRef.current?.focus();
      return false;
    }
    setError(null);
    return true;
  };

  const confirm = () => {
    if (submit.isPending) return; // double-submit guard
    submit.mutate(
      { decision, comment },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          setComment("");
        },
        onError: (e) => {
          setConfirmOpen(false);
          if (e.status === 422) {
            setError(e.detail ?? e.title);
            requestAnimationFrame(() => commentRef.current?.focus());
          }
        },
      },
    );
  };

  const serverError =
    submit.error && submit.error.status !== 422
      ? submit.error.status === 403
        ? "Your account doesn't have the lawyer role."
        : submit.error.status === 409
          ? `This package can no longer be decided. ${errorMessage(submit.error)}`
          : errorMessage(submit.error)
      : null;

  return (
    <section
      aria-labelledby="decision-heading"
      data-print-hide
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-card shadow-1"
    >
      <h2 id="decision-heading" className="text-xl font-semibold">
        Decision
      </h2>
      {blocked ? (
        <p id="decision-blocked" className="text-sm text-fg-muted">
          {blocked} (status: {STATUS_LABEL[pkg.status]})
        </p>
      ) : null}
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (blocked) return;
          if (validate()) setConfirmOpen(true);
        }}
      >
        <fieldset disabled={Boolean(blocked)} className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Decision</legend>
          <div className="flex flex-wrap gap-2">
            {OPTIONS.map((o) => (
              <label
                key={o.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-base has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
                  decision === o.value ? "border-primary bg-sunken" : "border-border-strong",
                )}
              >
                <input
                  type="radio"
                  name="decision"
                  value={o.value}
                  checked={decision === o.value}
                  onChange={() => {
                    setDecision(o.value);
                    if (o.value !== "reject") setError(null);
                  }}
                  className="size-4 accent-primary"
                />
                <o.icon aria-hidden="true" className="size-4" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          label="Comment"
          required={decision === "reject"}
          error={error}
          helper={`A comment is required to reject and recommended when requesting changes. ${comment.length}/${MAX}`}
        >
          {(p) => (
            <textarea
              ref={commentRef}
              value={comment}
              maxLength={MAX}
              rows={4}
              disabled={Boolean(blocked)}
              onChange={(e) => {
                setComment(e.target.value);
                if (e.target.value.trim()) setError(null);
              }}
              className={cn(inputClass, "py-2")}
              {...p}
            />
          )}
        </Field>
        {serverError ? (
          <Alert tone="error" role="alert" title="Decision not recorded.">
            {serverError}
          </Alert>
        ) : null}
        <div>
          <Button
            type="submit"
            variant={opt.variant}
            leadingIcon={opt.icon}
            loading={submit.isPending}
            aria-disabled={blocked ? true : undefined}
            aria-describedby={blocked ? "decision-blocked" : undefined}
          >
            {opt.button}
          </Button>
        </div>
      </form>
      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => !submit.isPending && setConfirmOpen(o)}
        role="alertdialog"
        title={`${opt.label === "Approve" ? "Approve" : opt.label === "Reject" ? "Reject package for" : "Request changes on"} ${contract.title}?`}
        description={
          decision === "approve"
            ? "This records your approval and enables export."
            : decision === "reject"
              ? "This records the rejection. Export stays blocked and redlines are locked."
              : "The reviewer will be asked to update the redlines and resubmit."
        }
      >
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => setConfirmOpen(false)}
            aria-disabled={submit.isPending || undefined}
          >
            Cancel
          </Button>
          <Button
            variant={opt.variant}
            leadingIcon={opt.icon}
            loading={submit.isPending}
            onClick={confirm}
          >
            {opt.button}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
