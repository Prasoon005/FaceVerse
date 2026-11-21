import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Empty list/section placeholder with an original line illustration and an optional CTA. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[20px] bg-foreground/[0.025] px-6 py-12 text-center ring-1 ring-foreground/[0.06] ring-inset",
        className,
      )}
    >
      <EmptyIllustration />
      <div className="grid max-w-sm gap-1">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function EmptyIllustration() {
  return (
    <svg
      viewBox="0 0 96 64"
      fill="none"
      aria-hidden
      className="h-14 w-auto text-muted-foreground/60"
    >
      <rect x="8" y="8" width="80" height="48" rx="8" stroke="currentColor" strokeDasharray="3 4" />
      <path
        d="M36 22v-3a2 2 0 0 1 2-2h3M55 17h3a2 2 0 0 1 2 2v3M60 42v3a2 2 0 0 1-2 2h-3M41 47h-3a2 2 0 0 1-2-2v-3"
        className="stroke-brand"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="44" cy="29" r="1.5" fill="currentColor" />
      <circle cx="52" cy="29" r="1.5" fill="currentColor" />
      <path d="M44 37h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
