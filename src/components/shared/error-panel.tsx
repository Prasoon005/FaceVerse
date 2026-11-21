"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/** Friendly glass error panel for route error boundaries. */
export function ErrorPanel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="grid min-h-[60dvh] place-items-center">
      <div className="glass-panel grid w-full max-w-md justify-items-center gap-4 rounded-[28px] px-6 py-10 text-center">
        <span className="icon-glow grid size-14 place-items-center rounded-2xl bg-warning/12 text-warning-foreground">
          <TriangleAlert className="size-7" aria-hidden />
        </span>
        <div className="grid gap-1.5">
          <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
          <p className="text-[15px] text-muted-foreground">
            This section couldn&apos;t load. It&apos;s usually a brief network hiccup, so try again.
          </p>
          {error.digest ? (
            <p className="font-mono text-[11px] text-muted-foreground/70">Ref: {error.digest}</p>
          ) : null}
        </div>
        <Button onClick={reset} className="rounded-full px-5">
          <RotateCw aria-hidden /> Try again
        </Button>
      </div>
    </div>
  );
}
