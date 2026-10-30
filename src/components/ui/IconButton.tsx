import { forwardRef } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, type ButtonProps } from "./Button";
import { Kbd } from "./Kbd";

export interface IconButtonProps extends Omit<ButtonProps, "children" | "leadingIcon"> {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, shortcut, className, variant = "ghost", ...rest },
  ref,
) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button
          ref={ref}
          variant={variant}
          aria-label={label}
          className={cn("w-control px-0", className)}
          {...rest}
        >
          <Icon aria-hidden="true" className="size-4" />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-dropdown flex items-center gap-2 rounded-md border border-border bg-raised px-2 py-1 text-xs text-fg shadow-2"
        >
          {label}
          {shortcut ? <Kbd>{shortcut}</Kbd> : null}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
});
