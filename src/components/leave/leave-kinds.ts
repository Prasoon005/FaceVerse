import { Coffee, HeartPulse, MessageSquare, User } from "lucide-react";

import type { LeaveKind, LeaveStatus } from "@/types/database";

/** Shared by server and client components (so it must not live in a "use client" file). */
export const leaveKinds: Record<LeaveKind, { label: string; icon: typeof Coffee }> = {
  casual: { label: "Casual", icon: Coffee },
  sick: { label: "Sick", icon: HeartPulse },
  personal: { label: "Personal", icon: User },
  other: { label: "Other", icon: MessageSquare },
};

export const leaveStatusBadge: Record<LeaveStatus, string> = {
  pending: "border-warning/40 text-warning-foreground",
  approved: "border-success/40 text-success-foreground",
  rejected: "border-danger/40 text-danger-foreground",
  cancelled: "text-muted-foreground",
};
