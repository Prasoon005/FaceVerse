import { ShieldAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Person } from "@/types/database";

/** Allowed / flagged indicator with an icon, so colour isn't the only signal. */
export function ListTypeBadge({ listType }: { listType: Person["list_type"] }) {
  if (listType === "none") return <span className="text-muted-foreground">—</span>;
  const allowed = listType === "allowed";
  const Icon = allowed ? ShieldCheck : ShieldAlert;
  return (
    <Badge
      variant="outline"
      className={allowed ? "text-success-foreground" : "text-danger-foreground"}
    >
      <Icon aria-hidden />
      {allowed ? "Allowed" : "Flagged"}
    </Badge>
  );
}
