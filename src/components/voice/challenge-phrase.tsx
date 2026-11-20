import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ChallengePhrase as Phrase } from "@/lib/audio/phrase";

/** The phrase to read aloud: three words and two digits, shown large. */
export function ChallengePhrase({
  phrase,
  onRefresh,
  disabled,
}: {
  phrase: Phrase;
  onRefresh?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
      <div className="grid flex-1 gap-1">
        <span className="text-xs text-muted-foreground">Say this phrase</span>
        <p className="text-xl font-semibold tracking-tight sm:text-2xl" aria-live="polite">
          {phrase.words.join(" ")}{" "}
          <span className="font-mono text-brand">{phrase.digits.join(" ")}</span>
        </p>
      </div>
      {onRefresh ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={disabled}
          aria-label="New phrase"
        >
          <RefreshCw aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
