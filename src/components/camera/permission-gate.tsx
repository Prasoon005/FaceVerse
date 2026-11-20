import { Camera, CameraOff, LoaderCircle, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CameraStatus } from "@/hooks/use-camera";

/**
 * Camera permission UX: explains what is needed and why, and what to do when access
 * is denied or unavailable. Rendered over the camera area until the stream is live.
 */
export function PermissionGate({
  status,
  error,
  onRequest,
}: {
  status: CameraStatus;
  error: string | null;
  onRequest: () => void;
}) {
  if (status === "active") return null;

  const content = {
    idle: {
      icon: Camera,
      title: "Camera access needed",
      body: "Video is processed on this device only. Nothing is uploaded unless you save a sample.",
      action: "Enable camera",
    },
    requesting: {
      icon: LoaderCircle,
      title: "Waiting for permission…",
      body: "Allow camera access in your browser's prompt.",
      action: null,
    },
    denied: {
      icon: ShieldAlert,
      title: "Camera blocked",
      body: "Click the camera icon in your address bar, allow access for this site, then try again.",
      action: "Try again",
    },
    unavailable: {
      icon: CameraOff,
      title: "No camera available",
      body: error ?? "Connect a camera, or open this page on a device that has one.",
      action: "Retry",
    },
    error: {
      icon: CameraOff,
      title: "Camera error",
      body: error ?? "Something went wrong starting the camera.",
      action: "Retry",
    },
  }[status];
  const Icon = content.icon;

  return (
    <div
      role="status"
      className="absolute inset-0 grid place-items-center bg-card/95 p-6 text-center"
    >
      <div className="grid max-w-xs justify-items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-brand/10 text-brand">
          <Icon
            className={status === "requesting" ? "size-5 animate-spin" : "size-5"}
            aria-hidden
          />
        </span>
        <h3 className="text-sm font-medium">{content.title}</h3>
        <p className="text-sm text-muted-foreground">{content.body}</p>
        {content.action ? (
          <Button size="sm" onClick={onRequest}>
            {content.action}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
