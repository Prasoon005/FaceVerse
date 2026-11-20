"use client";

import { animate, motion, useReducedMotion, type Variants } from "framer-motion";
import { type ComponentProps, useLayoutEffect, useRef } from "react";

/**
 * Small motion primitives usable from Server Components. All of them follow the
 * OS "reduce motion" setting via <MotionConfig reducedMotion="user"> in Providers.
 */

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 360, damping: 30 } },
};

/** A container whose StaggerItem children fade/slide in one after another. */
export function Stagger(props: ComponentProps<typeof motion.div>) {
  return <motion.div variants={container} initial="hidden" animate="show" {...props} />;
}

export function StaggerItem(props: ComponentProps<typeof motion.div>) {
  return <motion.div variants={item} {...props} />;
}

export function StaggerList(props: ComponentProps<typeof motion.ul>) {
  return <motion.ul variants={container} initial="hidden" animate="show" {...props} />;
}

export function StaggerListItem(props: ComponentProps<typeof motion.li>) {
  return <motion.li variants={item} {...props} />;
}

/** Counts up from 0 to `value` on mount. Server-rendered with the final value. */
export function AnimatedNumber({ value, duration = 0.9 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || reduceMotion || value === 0) return;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        node.textContent = Math.round(v).toLocaleString();
      },
    });
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return <span ref={ref}>{value.toLocaleString()}</span>;
}
