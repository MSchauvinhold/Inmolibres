import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ stats = 0, rows = 6 }: { stats?: number; rows?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Stat cards */}
      {stats > 0 && (
        <div className={`grid gap-4 grid-cols-2 lg:grid-cols-${stats}`}>
          {Array.from({ length: stats }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {/* Table / list area */}
      <div className="rounded-xl border border-[#DDD5C8] overflow-hidden">
        <Skeleton className="h-11 w-full rounded-none" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-t border-[#DDD5C8]">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
