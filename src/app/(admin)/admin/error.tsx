"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({
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
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center"
    >
      <TriangleAlert className="size-6 text-warning-foreground" aria-hidden />
      <h2 className="text-base font-medium">Something went wrong</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This section failed to load. You can try again; if it keeps happening, check the console.
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
