import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Download } from "lucide-react";
import type { Contract, ReviewPackage } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { useExport } from "../hooks/useApproval";
import { EXPORT_FORMATS, EXPORT_GATE_MESSAGE, exportGate } from "../lib/exportGate";

/** Visible to every role; enabled only when exportGate allows it (never relies on the 409). */
export function ExportMenu({
  contract,
  pkg,
}: {
  contract: Contract | undefined;
  pkg: ReviewPackage | undefined;
}) {
  const gate = exportGate(pkg);
  const exp = useExport(contract);
  if (!gate.allowed) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button leadingIcon={Download} aria-disabled="true" aria-describedby="export-gate">
          Export
        </Button>
        <p id="export-gate" className="text-sm text-fg-muted">
          {EXPORT_GATE_MESSAGE}
        </p>
      </div>
    );
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="primary" leadingIcon={Download} loading={exp.isPending}>
          {exp.isPending ? "Preparing download…" : "Export"}
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-dropdown min-w-64 rounded-lg border border-border bg-raised p-1 text-fg shadow-2"
        >
          {EXPORT_FORMATS.map((f) => (
            <DropdownMenu.Item
              key={f.format}
              onSelect={() => exp.mutate(f.format)}
              className="cursor-pointer rounded-md px-2 py-2 text-base outline-none data-[highlighted]:bg-sunken"
            >
              Export {f.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
