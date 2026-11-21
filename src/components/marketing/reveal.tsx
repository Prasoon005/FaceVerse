"use client";

import { motion } from "framer-motion";
import type { ComponentProps } from "react";

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({
  delay = 0,
  ...props
}: ComponentProps<typeof motion.div> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      {...props}
    />
  );
}
