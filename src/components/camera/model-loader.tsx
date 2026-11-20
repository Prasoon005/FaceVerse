import { Cpu, RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { EngineStatus } from "@/stores/face-engine-store";

/** Progress UI for the on-device AI models (first load downloads ~12 MB, then cached). */
export function ModelLoader({
  status,
  stage,
  progress,
  error,
  onRetry,
}: {
  status: EngineStatus;
  stage: string;
  progress: number;
  error: string | null;
  onRetry: () => void;
}) {
  if (status === "ready") return null;

  if (status === "error") {
    return (
      <div
        role="alert"
        className="absolute inset-0 grid place-items-center bg-card/95 p-6 text-center"
      >
        <div className="grid max-w-xs justify-items-center gap-3">
          <TriangleAlert className="size-6 text-warning-foreground" aria-hidden />
          <h3 className="text-sm font-medium">Couldn&apos;t start the face engine</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCw aria-hidden /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 grid place-items-center bg-card/90 p-6 text-center backdrop-blur-sm"
    >
      <div className="grid w-full max-w-xs justify-items-center gap-3">
        <Cpu className="size-6 animate-pulse text-brand" aria-hidden />
        <h3 className="text-sm font-medium">{stage || "Loading AI models"}</h3>
        <Progress value={Math.round(progress * 100)} className="h-1.5 w-full" />
        <p className="text-xs text-muted-foreground">
          First load downloads about 12 MB of models. After that they&apos;re cached on this device.
        </p>
      </div>
    </div>
  );
}
