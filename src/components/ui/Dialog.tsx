import type { ReactNode } from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const overlay = "fixed inset-0 z-dialog bg-scrim";

/** Centered modal dialog; Radix traps focus and restores it to the trigger on close. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  role,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  trigger?: ReactNode;
  role?: "alertdialog";
}) {
  return (
    <D.Root {...(open === undefined ? {} : { open })} {...(onOpenChange ? { onOpenChange } : {})}>
      {trigger ? <D.Trigger asChild>{trigger}</D.Trigger> : null}
      <D.Portal>
        <D.Overlay className={overlay} />
        <D.Content
          role={role}
          {...(description ? {} : { "aria-describedby": undefined })}
          className="fixed top-1/2 left-1/2 z-dialog flex max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-auto rounded-xl border border-border bg-overlay p-6 text-fg shadow-3"
        >
          <div className="flex items-start justify-between gap-4">
            <D.Title className="text-lg font-semibold">{title}</D.Title>
            <D.Close
              aria-label="Close"
              className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-sunken"
            >
              <X aria-hidden="true" className="size-4" />
            </D.Close>
          </div>
          {description ? (
            <D.Description className="text-base text-fg-muted">{description}</D.Description>
          ) : null}
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Right-side drawer (full screen on mobile); focus goes to the title on open. */
export function Drawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className={overlay} />
        <D.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)
              ?.querySelector<HTMLElement>("[data-drawer-title]")
              ?.focus();
          }}
          className={cn(
            "fixed inset-y-0 right-0 z-drawer flex w-full flex-col overflow-hidden border-l border-border bg-overlay text-fg shadow-3 md:w-[480px] md:rounded-l-xl",
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
            <D.Title data-drawer-title tabIndex={-1} className="text-lg font-semibold">
              {title}
            </D.Title>
            <D.Close
              aria-label="Close"
              className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-sunken"
            >
              <X aria-hidden="true" className="size-4" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export const DialogClose = D.Close;
