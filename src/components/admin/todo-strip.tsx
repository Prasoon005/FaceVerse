import { ArrowRight, CircleCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { AnimatedNumber, StaggerList, StaggerListItem } from "@/components/shared/motion";
import { cn } from "@/lib/utils";

/** "Needs your attention" row for the admin dashboard (server component; icons stay on the server). */
export function TodoStrip({
  items,
}: {
  items: { label: string; count: number; href: string; icon: LucideIcon }[];
}) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  return (
    <section aria-label="Needs your attention" className="grid gap-2">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        {total === 0 ? (
          <>
            <CircleCheck className="size-4 text-success-foreground" aria-hidden /> All caught up
          </>
        ) : (
          <>
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-danger" />
            </span>
            {total} item{total === 1 ? "" : "s"} need your attention
          </>
        )}
      </h2>
      <StaggerList className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <StaggerListItem key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "hover-lift group flex items-center gap-3 rounded-xl border bg-card p-4",
                item.count > 0 && "border-brand/40",
              )}
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-lg",
                  item.count > 0 ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground",
                )}
              >
                <item.icon className="size-5" aria-hidden />
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="font-mono text-2xl font-semibold">
                  <AnimatedNumber value={item.count} />
                </span>
                <span className="truncate text-xs text-muted-foreground">{item.label}</span>
              </span>
              <ArrowRight
                className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </StaggerListItem>
        ))}
      </StaggerList>
    </section>
  );
}
