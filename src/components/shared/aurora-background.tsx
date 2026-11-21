import { cn } from "@/lib/utils";

/**
 * Calm background for standalone screens (auth, share pages): the same soft colour wash as
 * the app, plus an optional faint grid. Static, so nothing distracts from the content.
 */
export function AuroraBackground({
  grid = false,
  className,
}: {
  grid?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="absolute inset-0 [background:var(--backdrop)]" />
      {grid ? (
        <div className="absolute inset-0 [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] [background-size:56px_56px] opacity-[0.04]" />
      ) : null}
    </div>
  );
}
