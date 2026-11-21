import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { AnimatedNumber } from "./motion";

type Tone = "default" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  default: "bg-brand/10 text-brand",
  success: "bg-success/10 text-success-foreground",
  warning: "bg-warning/10 text-warning-foreground",
  danger: "bg-danger/10 text-danger-foreground",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <Card className="hover-lift h-full gap-4 px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid size-9 place-items-center rounded-xl", toneClasses[tone])}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      <div className="grid gap-1">
        <div className="text-[30px] leading-none font-semibold tracking-tight tabular-nums">
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </Card>
  );
}
