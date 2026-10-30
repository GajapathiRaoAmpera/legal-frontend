import {
  CircleCheck,
  CircleDot,
  CircleX,
  Clock,
  FileUp,
  Hourglass,
  Loader,
  MessageSquareWarning,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import type { ContractStatus, PackageStatus, RedlineStatus } from "@/api/types";
import { STATUS_LABEL } from "@/lib/format";

type Status = ContractStatus | RedlineStatus | PackageStatus;
const ICON: Record<Status, LucideIcon> = {
  uploaded: FileUp,
  parsing: Loader,
  analyzing: Loader,
  awaiting_lawyer: Hourglass,
  changes_requested: MessageSquareWarning,
  approved: CircleCheck,
  rejected: CircleX,
  failed: CircleX,
  proposed: CircleDot,
  accepted: CircleCheck,
  edited: Pencil,
  draft: Clock,
  ready_for_lawyer: Hourglass,
};

/** Neutral workflow status: never risk colors (DESIGN_SYSTEM §10). */
export function StatusBadge({ status }: { status: Status }) {
  const Icon = ICON[status];
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-border bg-sunken px-1.5 text-xs font-medium whitespace-nowrap text-fg">
      <Icon aria-hidden="true" className="size-3" />
      {STATUS_LABEL[status]}
    </span>
  );
}
