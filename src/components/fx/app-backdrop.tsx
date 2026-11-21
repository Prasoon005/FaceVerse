import { cn } from "@/lib/utils";

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * The colour field the glass sits on: three large, softly drifting orbs (portal-tinted through
 * --orb-1/2/3, brighter in dark mode) plus a fine grain so big glass areas don't look flat.
 * `fixed` for app pages; `absolute` inside a relative container elsewhere.
 */
export function AppBackdrop({
  position = "fixed",
  className,
}: {
  position?: "fixed" | "absolute";
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none inset-0 overflow-hidden",
        position === "fixed" ? "fixed -z-10" : "absolute",
        className,
      )}
    >
      <div className="absolute -top-[25%] -left-[15%] size-[60vmax] animate-aurora rounded-full bg-(--orb-1) blur-[120px]" />
      <div className="absolute -top-[10%] -right-[20%] size-[50vmax] animate-aurora rounded-full bg-(--orb-2) blur-[120px] [animation-delay:-9s]" />
      <div className="absolute -bottom-[30%] left-[20%] size-[55vmax] animate-aurora rounded-full bg-(--orb-3) blur-[130px] [animation-delay:-17s]" />
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay dark:opacity-[0.06]"
        style={{ backgroundImage: NOISE }}
      />
    </div>
  );
}
