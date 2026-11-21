"use client";

import { motion, useReducedMotion, useSpring } from "framer-motion";
import { type ReactNode, useRef } from "react";

import { cn } from "@/lib/utils";

/** Tilts its content in 3D toward the mouse (mouse only; touch and reduced motion stay flat). */
export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rotateX = useSpring(0, { stiffness: 220, damping: 18 });
  const rotateY = useSpring(0, { stiffness: 220, damping: 18 });
  const lift = useSpring(0, { stiffness: 260, damping: 20 });

  return (
    <div
      ref={ref}
      className={cn("h-full", className)}
      style={{ perspective: 900 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rotateY.set(px * max * 2);
        rotateX.set(-py * max * 2);
        lift.set(-3);
      }}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
        lift.set(0);
      }}
    >
      <motion.div style={{ rotateX, rotateY, y: lift }} className="h-full will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}
