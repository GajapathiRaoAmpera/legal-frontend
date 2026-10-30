import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export const buttonClass = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors transition-fast select-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-hover focus-ring-double",
        secondary: "border border-border-strong bg-surface text-fg hover:bg-sunken",
        ghost: "bg-transparent text-fg hover:bg-sunken",
        danger: "bg-danger text-on-danger focus-ring-double hover:opacity-90",
      },
      size: { md: "h-control px-3 text-base", sm: "h-7 px-2 text-sm" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  loading?: boolean;
  leadingIcon?: LucideIcon;
}

/** Disabled-with-reason uses aria-disabled (stays focusable); onClick is swallowed while aria-disabled or loading. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    loading = false,
    leadingIcon: Icon,
    className,
    children,
    type = "button",
    onClick,
    ...rest
  },
  ref,
) {
  const reduced = useReducedMotion();
  const inert = rest["aria-disabled"] === true || rest["aria-disabled"] === "true" || loading;
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonClass({ variant, size }), className)}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (inert) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {loading ? (
        reduced ? null : (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        )
      ) : (
        Icon && <Icon aria-hidden="true" className="size-4" />
      )}
      {children}
      {loading && reduced ? <span className="sr-only"> Working…</span> : null}
    </button>
  );
});
