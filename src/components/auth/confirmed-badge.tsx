"use client";

import { motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import { useEffect } from "react";

import { useSoundFeedback } from "@/hooks/use-sound-feedback";

const BURST = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  return { x: Math.cos(angle) * 70, y: Math.sin(angle) * 70, hue: i % 3 };
});
const colors = ["bg-brand", "bg-success", "bg-warning"];

/** Animated "email confirmed" check with a small burst. */
export function ConfirmedBadge() {
  const { play } = useSoundFeedback();
  useEffect(() => play("success"), [play]);
  return (
    <div className="relative grid size-20 place-items-center">
      {BURST.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`absolute size-1.5 rounded-full ${colors[p.hue]}`}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
        />
      ))}
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="grid size-20 place-items-center rounded-full bg-success/10 text-success-foreground"
      >
        <MailCheck className="size-9" aria-hidden />
      </motion.span>
    </div>
  );
}
