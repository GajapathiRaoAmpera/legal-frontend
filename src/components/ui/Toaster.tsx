import * as T from "@radix-ui/react-toast";
import { CircleAlert, Info, X } from "lucide-react";
import { useToasts } from "@/stores/toasts";

/** Global toasts: role=status, bottom-right, 4s, paused on hover/focus (Radix). */
export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <T.Provider duration={4000} label="Notifications">
      {toasts.map((t) => (
        <T.Root
          key={t.id}
          type={t.tone === "error" ? "foreground" : "background"}
          onOpenChange={(open) => !open && dismiss(t.id)}
          className="flex items-start gap-3 rounded-lg border border-border bg-raised p-3 text-sm text-fg shadow-2"
        >
          {t.tone === "error" ? (
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
          ) : (
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-link" />
          )}
          <div className="min-w-0 flex-1">
            <T.Title className="font-medium">{t.title}</T.Title>
            {t.description ? (
              <T.Description className="mt-0.5 text-fg-muted">{t.description}</T.Description>
            ) : null}
          </div>
          <T.Close
            aria-label="Dismiss"
            className="inline-flex size-6 items-center justify-center rounded-sm hover:bg-sunken"
          >
            <X aria-hidden="true" className="size-4" />
          </T.Close>
        </T.Root>
      ))}
      <T.Viewport className="fixed right-0 bottom-0 z-toast m-0 flex w-full max-w-sm list-none flex-col gap-2 p-4 outline-none" />
    </T.Provider>
  );
}
