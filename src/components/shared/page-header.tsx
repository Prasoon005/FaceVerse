import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  /** Small label above the title (e.g. a section name or date). */
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-1.5">
        {eyebrow ? (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.025em] sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-[15px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
