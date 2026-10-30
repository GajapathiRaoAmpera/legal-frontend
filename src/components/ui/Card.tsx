import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-card shadow-1", className)}>
      {children}
    </div>
  );
}
