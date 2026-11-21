"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/actions/admin";

import { useSoundFeedback } from "./use-sound-feedback";

/** Runs a Server Action with pending state, a toast and a sound for the outcome. */
export function useServerAction() {
  const { play } = useSoundFeedback();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function run(
    key: string,
    action: () => Promise<ActionResult>,
    { success, onSuccess }: { success: string; onSuccess?: () => void },
  ) {
    setBusyKey(key);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) throw new Error(result.error);
        play("success");
        toast.success(success);
        onSuccess?.();
      } catch (err) {
        play("error");
        toast.error("That didn't work", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setBusyKey(null);
      }
    });
  }

  return { run, pending, busyKey };
}
