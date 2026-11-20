import { AudioLines, RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { EngineStatus } from "@/stores/face-engine-store";

/** Inline progress for the voice model (~100 MB on first load, then cached). */
export function VoiceModelStatus({
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
        className="grid justify-items-center gap-2 rounded-lg border p-4 text-center"
      >
        <TriangleAlert className="size-5 text-warning-foreground" aria-hidden />
        <p className="text-sm font-medium">Couldn&apos;t start the voice engine</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCw aria-hidden /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="grid gap-2 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <AudioLines className="size-4 animate-pulse text-brand" aria-hidden />
        <p className="text-sm font-medium">{stage || "Loading voice model"}</p>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {Math.round(progress * 100)}%
        </span>
      </div>
      <Progress value={Math.round(progress * 100)} className="h-1.5" />
      <p className="text-xs text-muted-foreground">
        The first time, this downloads about 100 MB (use Wi-Fi if you can). After that it&apos;s
        cached on this device and loads in seconds.
      </p>
    </div>
  );
}
