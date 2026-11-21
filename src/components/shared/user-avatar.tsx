import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Today's state, shown as a coloured ring around the photo. */
export type PresenceStatus = "present" | "late" | "leave" | "holiday" | "absent" | "away" | "none";

const ring: Record<PresenceStatus, string> = {
  present: "ring-success text-success",
  late: "ring-orange-500 text-orange-500",
  leave: "ring-sky-500 text-sky-500",
  holiday: "ring-violet-500 text-violet-500",
  absent: "ring-danger text-danger",
  away: "ring-foreground/20 text-transparent",
  none: "ring-transparent text-transparent",
};

export const presenceLabel: Record<PresenceStatus, string> = {
  present: "In today",
  late: "In today (late)",
  leave: "On leave",
  holiday: "Holiday",
  absent: "Absent",
  away: "Not in yet",
  none: "",
};

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

/** Photo (or initials) with a status ring; the ring glows softly in dark mode. */
export function UserAvatar({
  name,
  src,
  status = "none",
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  status?: PresenceStatus;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dims = {
    sm: "size-7 text-[10px]",
    md: "size-9 text-xs",
    lg: "size-12 text-sm",
    xl: "size-20 text-xl",
  }[size];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background",
        status !== "none" && status !== "away" && "dark:shadow-[0_0_14px_-2px_currentColor]",
        ring[status],
        className,
      )}
      title={presenceLabel[status] || undefined}
    >
      <Avatar className={cn(dims)}>
        {src ? <AvatarImage src={src} alt="" /> : null}
        <AvatarFallback className="bg-brand/15 font-semibold text-brand">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      {status !== "none" ? <span className="sr-only">{presenceLabel[status]}</span> : null}
    </span>
  );
}
