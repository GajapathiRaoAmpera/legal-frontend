import { useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";

/** Visible label + helper + error wiring (aria-describedby / aria-invalid) for any single control. */
export function Field({
  label,
  required,
  helper,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: ReactNode;
  error?: string | null;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }) => ReactNode;
}) {
  const id = useId();
  const helperId = `${id}-help`;
  const errorId = `${id}-err`;
  const describedBy = [helper ? helperId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required ? <span className="font-normal text-fg-muted"> (required)</span> : null}
      </label>
      {children({
        id,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(error ? { "aria-invalid": true as const } : {}),
      })}
      {helper ? (
        <p id={helperId} className="text-sm text-fg-muted">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-border-strong bg-surface px-3 text-base text-fg placeholder:text-fg-subtle aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-muted";
