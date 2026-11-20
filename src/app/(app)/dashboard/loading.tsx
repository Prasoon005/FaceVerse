import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[360px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
    </div>
  );
}
