import { cn } from "@/lib/utils";

/**
 * Soft drifting colour blobs plus an optional moving grid. Pure CSS (no JS), honours
 * "reduce motion" through the global rule in globals.css. Place inside a `relative` parent.
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
      <div className="absolute -top-1/3 -left-1/4 size-[70vmax] animate-aurora rounded-full bg-brand/20 blur-3xl" />
      <div className="absolute -right-1/4 -bottom-1/3 size-[60vmax] animate-aurora rounded-full bg-success/10 blur-3xl [animation-delay:-6s]" />
      <div className="absolute top-1/4 left-1/2 size-[35vmax] animate-aurora rounded-full bg-brand/10 blur-3xl [animation-delay:-11s]" />
      {grid ? (
        <div className="absolute inset-0 animate-grid-pan [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] [background-size:48px_48px] opacity-[0.07]" />
      ) : null}
    </div>
  );
}
