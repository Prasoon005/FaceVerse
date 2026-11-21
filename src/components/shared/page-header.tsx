import type { ReactNode } from "react";

import { PageIcon } from "@/components/layout/page-icon";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  icon = true,
}: {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  /** Small label above the title (e.g. a section name or date). */
  eyebrow?: ReactNode;
  /** Show the section icon (from the navigation) beside the title. */
  icon?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-4">
        {icon ? <PageIcon /> : null}
        <div className="grid gap-1">
          {eyebrow ? (
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.03em] sm:text-[32px]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-[15px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
