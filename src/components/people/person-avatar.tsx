import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function PersonAvatar({
  name,
  url,
  className,
}: {
  name: string;
  url: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      {url ? <AvatarImage src={url} alt="" className="object-cover" /> : null}
      <AvatarFallback className="bg-brand/15 text-xs text-brand">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
