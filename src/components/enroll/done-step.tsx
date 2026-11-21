"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CircleCheck, Radar, User, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";

const BURST = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  return { x: Math.cos(angle) * 70, y: Math.sin(angle) * 70, hue: i % 3 };
});
const burstColors = ["bg-brand", "bg-success", "bg-warning"];

/** Success screen with a small, motion-safe "confetti-lite" burst. */
export function DoneStep({
  name,
  personId,
  pendingApproval = false,
  onEnrollAnother,
}: {
  name: string;
  personId: string;
  /** A self-enrollment that an admin still has to approve. */
  pendingApproval?: boolean;
  onEnrollAnother: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { play } = useSoundFeedback();
  useEffect(() => play("success"), [play]);

  return (
    <div className="grid justify-items-center gap-4 py-10 text-center">
      <div className="relative grid size-16 place-items-center">
        {!reduceMotion
          ? BURST.map((p, i) => (
              <motion.span
                key={i}
                aria-hidden
                className={`absolute size-1.5 rounded-full ${burstColors[p.hue]}`}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
              />
            ))
          : null}
        <motion.span
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="grid size-16 place-items-center rounded-full bg-success/10 text-success-foreground"
        >
          <CircleCheck className="size-8" aria-hidden />
        </motion.span>
      </div>
      <h2 className="text-xl font-semibold">{name} is enrolled</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Their face samples are saved. Open live recognition to see them identified in real time.
      </p>
      {pendingApproval ? (
        <p className="max-w-sm rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
          This is you, so an admin needs to approve it before you can mark attendance or use
          biometric login. You&apos;ll get a notification.
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/live">
            <Radar aria-hidden /> Open live recognition
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/people/${personId}`}>
            <User aria-hidden /> View person
          </Link>
        </Button>
        <Button variant="ghost" onClick={onEnrollAnother}>
          <UserPlus aria-hidden /> Enroll another
        </Button>
      </div>
    </div>
  );
}
