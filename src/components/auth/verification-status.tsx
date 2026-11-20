"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AudioLines, Check, Eye, LoaderCircle, ScanFace, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type FactorState = "pending" | "active" | "passed" | "failed";

export type Factors = { liveness: FactorState; face: FactorState; voice: FactorState };

const FACTORS = [
  { key: "liveness", label: "Liveness", icon: Eye },
  { key: "face", label: "Face", icon: ScanFace },
  { key: "voice", label: "Voice", icon: AudioLines },
] as const;

const stateText: Record<FactorState, string> = {
  pending: "waiting",
  active: "in progress",
  passed: "verified",
  failed: "failed",
};

/** Live status of each factor; a passed factor "locks in" with a small pop. */
export function VerificationStatus({
  factors,
  voiceNote,
}: {
  factors: Factors;
  /** e.g. "Attempt 2 of 3" */
  voiceNote?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <ul className="grid grid-cols-3 gap-2" aria-label="Verification status">
      {FACTORS.map(({ key, label, icon: Icon }) => {
        const state = factors[key];
        return (
          <li
            key={key}
            className={cn(
              "relative grid justify-items-center gap-1 overflow-hidden rounded-lg border p-2 text-center transition-colors",
              state === "pending" && "text-muted-foreground",
              state === "active" && "border-brand/50 bg-brand/5",
              state === "passed" && "border-success/40 bg-success/5",
              state === "failed" && "border-danger/40 bg-danger/5",
            )}
          >
            <span className="relative grid size-7 place-items-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={state}
                  className="grid place-items-center"
                  initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={reduceMotion ? undefined : { scale: 0.4, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                >
                  {state === "passed" ? (
                    <Check className="size-5 text-success-foreground" aria-hidden />
                  ) : state === "failed" ? (
                    <X className="size-5 text-danger-foreground" aria-hidden />
                  ) : state === "active" ? (
                    <LoaderCircle className="size-5 animate-spin text-brand" aria-hidden />
                  ) : (
                    <Icon className="size-5" aria-hidden />
                  )}
                </motion.span>
              </AnimatePresence>
              {state === "passed" && !reduceMotion ? (
                <motion.span
                  key="ring"
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-success"
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              ) : null}
            </span>
            <span className="text-xs font-medium">{label}</span>
            <span className="text-[10px] text-muted-foreground">
              {key === "voice" && voiceNote && state !== "passed" ? voiceNote : stateText[state]}
            </span>
            <span className="sr-only">
              {label}: {stateText[state]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
