import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Gavel, GitCompare, ShieldAlert } from "lucide-react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { keys } from "@/api/keys";
import { AgentProgress } from "@/components/AgentProgress";
import { QueryErrorAlert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ACTIVE_STATUSES, useContract } from "@/hooks/useContract";
import { useContractEvents } from "@/hooks/useContractEvents";
import { cn } from "@/lib/cn";

const TABS = [
  { to: "", label: "Viewer", icon: FileText, end: true },
  { to: "risks", label: "Risks", icon: ShieldAlert, end: false },
  { to: "redlines", label: "Redlines", icon: GitCompare, end: false },
  { to: "approval", label: "Approval", icon: Gavel, end: false },
];

/** Shared chrome for contract-scoped routes: the single <h1> (contract title), status, section tabs, live progress. */
export function ContractLayout() {
  const { contractId = "" } = useParams();
  const qc = useQueryClient();
  const contract = useContract(contractId);
  const active = contract.data ? ACTIVE_STATUSES.has(contract.data.status) : false;
  const events = useContractEvents(contractId, { enabled: active });

  // contract text is large and immutable: drop it when leaving the contract
  useEffect(
    () => () => qc.removeQueries({ queryKey: keys.contractText(contractId) }),
    [contractId, qc],
  );

  if (contract.isError)
    return <QueryErrorAlert error={contract.error} onRetry={() => void contract.refetch()} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {contract.data ? (
            <h1 tabIndex={-1} className="font-serif text-2xl font-semibold break-words">
              {contract.data.title}
            </h1>
          ) : (
            <>
              <h1 tabIndex={-1} className="sr-only">
                Loading contract
              </h1>
              <Skeleton className="h-8 w-64" />
            </>
          )}
          {contract.data ? <StatusBadge status={contract.data.status} /> : null}
        </div>
        <nav aria-label="Contract sections" data-print-hide className="-mx-1 overflow-x-auto">
          <ul className="flex gap-1 border-b border-border px-1">
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <li key={label}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "-mb-px inline-flex h-control items-center gap-2 border-b-2 px-3 text-base whitespace-nowrap",
                      isActive
                        ? "border-primary font-medium text-fg"
                        : "border-transparent text-fg-muted hover:text-fg",
                    )
                  }
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {active && contract.data ? (
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="mb-2 text-sm font-medium">Analysis in progress. Figures update live.</p>
            <AgentProgress
              title={contract.data.title}
              progress={events.lastProgress}
              status={events.status ?? contract.data.status}
              connection={events.connection}
              paused={events.paused}
            />
          </div>
        ) : null}
      </div>
      <Outlet />
    </div>
  );
}
