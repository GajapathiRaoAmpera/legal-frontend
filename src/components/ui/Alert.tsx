import type { ReactNode } from "react";
import { CircleAlert, Info } from "lucide-react";
import { errorMessage } from "@/api/errors";
import { cn } from "@/lib/cn";

export function Alert({
  tone = "info",
  title,
  children,
  action,
  role,
}: {
  tone?: "info" | "error";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
}) {
  const Icon = tone === "error" ? CircleAlert : Info;
  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-surface p-3 text-sm",
        tone === "error" ? "border-danger" : "border-border",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("mt-0.5 size-4 shrink-0", tone === "error" ? "text-danger" : "text-link")}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium", tone === "error" ? "text-danger" : "text-fg")}>{title}</p>
        {children ? <div className="mt-1 text-fg">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function QueryErrorAlert({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert
      tone="error"
      role="alert"
      title="Couldn't load this data."
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium text-link underline"
          >
            Retry
          </button>
        ) : undefined
      }
    >
      {errorMessage(error)}
    </Alert>
  );
}
