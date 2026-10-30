import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-sunken motion-reduce:animate-none", className)}
    />
  );
}

export function LoadingRows({ rows = 5, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <div className="flex flex-col gap-2" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-row w-full" />
      ))}
    </div>
  );
}
