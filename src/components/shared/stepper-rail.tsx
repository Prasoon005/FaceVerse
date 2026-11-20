import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type Step = { id: string; label: string; note?: string; disabled?: boolean };

/** Horizontal progress rail for multi-step flows (enrollment, biometric login). */
export function StepperRail({ steps, current }: { steps: Step[]; current: string }) {
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Progress">
      {steps.map((step, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        return (
          <li key={step.id} className="flex shrink-0 items-center gap-2">
            {index > 0 ? (
              <span
                aria-hidden
                className={cn("h-px w-6 sm:w-10", index <= currentIndex ? "bg-brand" : "bg-border")}
              />
            ) : null}
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 text-sm",
                state === "upcoming" && "text-muted-foreground",
                step.disabled && "opacity-50",
              )}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border font-mono text-xs",
                  state === "done" && "border-brand bg-brand text-primary-foreground",
                  state === "current" && "border-brand text-brand",
                )}
              >
                {state === "done" ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span className={cn(state === "current" && "font-medium")}>
                {step.label}
                {step.note ? (
                  <span className="ml-1 text-xs text-muted-foreground">({step.note})</span>
                ) : null}
              </span>
              <span className="sr-only">
                {state === "done" ? "completed" : state === "current" ? "current step" : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
