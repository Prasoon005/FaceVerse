import { Lightbulb } from "lucide-react";

import { type FailureReason, failureTips } from "@/lib/auth/biometric";

/** Suggestions for the reasons a verification failed, deduplicated, most relevant first. */
export function VerificationTips({ reasons }: { reasons: readonly FailureReason[] }) {
  const tips = [...new Set(reasons.flatMap((r) => failureTips[r]))];
  if (tips.length === 0) return null;

  return (
    <div className="grid gap-2 rounded-lg bg-muted/50 p-3">
      <p className="flex items-center gap-2 text-xs font-medium">
        <Lightbulb className="size-3.5 text-warning-foreground" aria-hidden /> Try this
      </p>
      <ul className="grid list-disc gap-1 pl-5 text-xs text-muted-foreground">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}
