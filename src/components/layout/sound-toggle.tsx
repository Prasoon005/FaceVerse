"use client";

import { Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsClient } from "@/hooks/use-is-client";
import { playFeedback } from "@/lib/audio/feedback";
import { useSoundStore } from "@/stores/sound-store";

/** Mutes/unmutes UI sounds app-wide. The icon renders after hydration (stored preference). */
export function SoundToggle({ className }: { className?: string }) {
  const isClient = useIsClient();
  const enabled = useSoundStore((s) => s.enabled);
  const toggle = useSoundStore((s) => s.toggle);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label="Toggle sounds"
      aria-pressed={isClient ? enabled : undefined}
      onClick={() => {
        if (!enabled) playFeedback("toggle");
        toggle();
      }}
    >
      {!isClient || enabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
    </Button>
  );
}
