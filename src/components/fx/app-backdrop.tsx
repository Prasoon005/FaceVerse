"use client";

import { motion, useReducedMotion, useSpring } from "framer-motion";
import { useEffect } from "react";

/**
 * Fixed aurora behind the whole app: three drifting colour blobs (portal-tinted through
 * --aurora-a/b/c) that also lean gently toward the pointer. The glass surfaces blur it.
 */
export function AppBackdrop() {
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 40, damping: 20 });
  const y = useSpring(0, { stiffness: 40, damping: 20 });

  useEffect(() => {
    if (reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    function onMove(e: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        x.set((e.clientX / window.innerWidth - 0.5) * 60);
        y.set((e.clientY / window.innerHeight - 0.5) * 60);
      });
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduce, x, y]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div style={{ x, y }} className="absolute inset-0">
        <div className="absolute -top-[20%] -left-[10%] size-[55vmax] animate-aurora rounded-full bg-(--aurora-a) blur-[100px]" />
        <div className="absolute top-[10%] -right-[15%] size-[45vmax] animate-aurora rounded-full bg-(--aurora-b) blur-[100px] [animation-delay:-6s]" />
        <div className="absolute -bottom-[25%] left-[25%] size-[50vmax] animate-aurora rounded-full bg-(--aurora-c) blur-[110px] [animation-delay:-12s]" />
      </motion.div>
      {/* Fine grain + a faint grid keep large glass areas from looking flat. */}
      <div className="absolute inset-0 [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_70%)] [background-size:56px_56px] opacity-[0.035]" />
    </div>
  );
}
