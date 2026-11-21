"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "faceverse-install-dismissed";

function subscribeNone() {
  return () => {};
}

/**
 * "Install FaceVerse" banner. Chrome/Edge/Android get the native install prompt; iPhone and
 * iPad get the Share → Add to Home Screen hint. Hidden once installed or dismissed.
 */
export function InstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const env = useSyncExternalStore(
    subscribeNone,
    () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      let wasDismissed = false;
      try {
        wasDismissed = localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        // Storage blocked: show the banner, it can still be closed for this visit.
      }
      return `${standalone ? 1 : 0}${ios ? 1 : 0}${wasDismissed ? 1 : 0}`;
    },
    () => "100",
  );
  const [standalone, ios, wasDismissed] = env.split("").map((c) => c === "1");

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    }
    function onInstalled() {
      setPromptEvent(null);
      setDismissed(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function close() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore: it stays hidden for this visit.
    }
  }

  const show = !standalone && !wasDismissed && !dismissed && (promptEvent !== null || ios);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.5rem)] z-40 md:right-6 md:bottom-6 md:left-auto md:w-[360px]"
          role="dialog"
          aria-label="Install FaceVerse"
        >
          <div className="glass-panel flex items-start gap-3 rounded-[22px] p-4 shadow-(--shadow-card-hover)">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
            <img src="/icons/icon-192.png" alt="" className="size-11 rounded-xl" />
            <div className="grid min-w-0 flex-1 gap-1">
              <span className="text-sm font-semibold">Install FaceVerse</span>
              <span className="text-xs text-muted-foreground">
                {ios ? (
                  <>
                    Tap <Share className="inline size-3.5 align-[-2px]" aria-label="Share" /> then
                    &ldquo;Add to Home Screen&rdquo; for a full-screen app.
                  </>
                ) : (
                  "Open it from your home screen or dock, like a native app."
                )}
              </span>
              {promptEvent ? (
                <Button
                  size="sm"
                  className="mt-1 w-fit"
                  onClick={async () => {
                    await promptEvent.prompt();
                    const { outcome } = await promptEvent.userChoice;
                    if (outcome === "accepted") close();
                    setPromptEvent(null);
                  }}
                >
                  <Download aria-hidden /> Install
                </Button>
              ) : null}
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Not now" onClick={close}>
              <X aria-hidden />
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
