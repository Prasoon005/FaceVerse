"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarRange,
  Fingerprint,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DONE_KEY = "faceverse-tour-done";

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to FaceVerse",
    body: "Your face is your ID here. Here's a 30-second look at what you can do.",
  },
  {
    icon: Fingerprint,
    title: "Set up your identity",
    body: "Open My identity and capture your face once. An admin approves it, then it's locked so nobody can swap it.",
  },
  {
    icon: CalendarCheck,
    title: "Mark attendance in seconds",
    body: "On the Attendance page, look at the camera for a quick check. Scan again in the evening to check out.",
  },
  {
    icon: CalendarRange,
    title: "Leave and reasons",
    body: "Request leave ahead of time, or explain an absence or a late day. Your monthly score updates automatically.",
  },
  {
    icon: MessagesSquare,
    title: "Stay in touch",
    body: "Read announcements and message your admins directly. Press Ctrl + K anytime to jump anywhere.",
  },
];

/** First-visit introduction for members (replay from Settings → Appearance). */
export function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    let done = true;
    try {
      done = localStorage.getItem(DONE_KEY) === "1";
    } catch {
      // Storage blocked: don't nag on every visit.
    }
    const timer = done ? undefined : window.setTimeout(() => setOpen(true), 900);
    function replay() {
      setStep(0);
      setOpen(true);
    }
    window.addEventListener("faceverse:tour", replay);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("faceverse:tour", replay);
    };
  }, []);

  function finish() {
    setOpen(false);
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {
      // Ignore.
    }
  }

  function go(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  const current = steps[step]!;
  const last = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : finish())}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md" showCloseButton={false}>
        <div className="relative grid h-44 place-items-center overflow-hidden bg-[radial-gradient(120%_120%_at_20%_0%,var(--orb-1),transparent_60%),radial-gradient(120%_120%_at_90%_10%,var(--orb-2),transparent_60%)]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.span
              key={step}
              custom={dir}
              initial={{ opacity: 0, scale: 0.8, x: dir * 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: dir * -40 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="glass-panel icon-glow grid size-20 place-items-center rounded-[26px] text-brand"
            >
              <current.icon className="size-9" aria-hidden />
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="grid gap-5 p-6 pt-5">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="grid gap-1.5 text-center"
            >
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {current.title}
              </DialogTitle>
              <DialogDescription className="text-[15px] leading-relaxed">
                {current.body}
              </DialogDescription>
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-center gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-brand" : "w-1.5 bg-foreground/15",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => go(step - 1)}>
                <ArrowLeft aria-hidden /> Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={finish}>
                Skip
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {step + 1} / {steps.length}
            </span>
            <Button onClick={() => (last ? finish() : go(step + 1))}>
              {last ? "Get started" : "Next"} {last ? null : <ArrowRight aria-hidden />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
