"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { navFor, type Portal } from "@/config/site";
import { useIsClient } from "@/hooks/use-is-client";
import { isTranscriptionSupported, startTranscriber } from "@/lib/audio/transcribe";

/** Extra spoken names for pages ("go to score" → Reasons & score). */
const ALIASES: Record<string, string[]> = {
  "/reasons": ["reason", "reasons", "score", "late"],
  "/identity": ["identity", "my face", "profile"],
  "/live": ["live", "camera", "recognition", "scan"],
  "/attendance": ["attendance", "check in", "checkin", "mark"],
  "/admin/kiosk": ["kiosk"],
};

function speak(text: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  } catch {
    // Voice feedback is optional.
  }
}

/**
 * X1/X2: voice commands with spoken feedback. Say "open attendance", "go to albums",
 * "dark mode"… Hidden where the browser has no speech recognition.
 */
export function VoiceCommandButton({ portal }: { portal: Portal }) {
  const router = useRouter();
  const isClient = useIsClient();
  const { setTheme } = useTheme();
  const [listening, setListening] = useState(false);

  if (!isClient || !isTranscriptionSupported()) return null;

  async function listen() {
    const t = startTranscriber();
    if (!t) return;
    setListening(true);
    toast.message("Listening…", {
      description: "Say e.g. “open attendance” or “dark mode”.",
      duration: 3500,
    });
    await new Promise((r) => setTimeout(r, 3500));
    const heard = ((await t.stop()) ?? "").toLowerCase().trim();
    setListening(false);
    if (!heard) {
      speak("Sorry, I didn't catch that.");
      toast.error("Didn't catch that");
      return;
    }
    if (/\bdark\b/.test(heard)) {
      setTheme("dark");
      speak("Dark mode on");
      return;
    }
    if (/\blight\b/.test(heard)) {
      setTheme("light");
      speak("Light mode on");
      return;
    }
    const items = navFor(portal).flatMap((s) => s.items);
    const match = items.find((item) => {
      const words = [item.title.toLowerCase(), ...(ALIASES[item.href] ?? [])];
      return words.some((w) => heard.includes(w));
    });
    if (match) {
      speak(`Opening ${match.title}`);
      toast.success(`“${heard}” → ${match.title}`);
      router.push(match.href);
    } else {
      speak("I don't know that command.");
      toast.error(`No command for “${heard}”`);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Voice command"
          aria-pressed={listening}
          onClick={() => void listen()}
          disabled={listening}
          className="relative"
        >
          {listening ? (
            <motion.span
              aria-hidden
              className="absolute inset-1 rounded-full bg-brand/20"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          ) : null}
          <Mic className={listening ? "text-brand" : undefined} aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Voice command</TooltipContent>
    </Tooltip>
  );
}
