import type { ReactNode } from "react";

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border-strong bg-surface p-6">
      <p className="text-base text-fg">{message}</p>
      {action}
    </div>
  );
}
