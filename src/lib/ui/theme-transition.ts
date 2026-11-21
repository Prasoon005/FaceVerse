"use client";

import { useTheme } from "next-themes";
import { useCallback } from "react";
import { flushSync } from "react-dom";

type ViewTransitionDoc = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

/**
 * Toggles light/dark with a circle that grows from the click point (View Transitions API).
 * Falls back to an instant switch where unsupported or when reduced motion is on.
 */
export function useThemeTransition() {
  const { resolvedTheme, setTheme } = useTheme();

  return useCallback(
    (origin?: { clientX: number; clientY: number }) => {
      const next = resolvedTheme === "dark" ? "light" : "dark";
      const doc = document as ViewTransitionDoc;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!doc.startViewTransition || reduce) {
        setTheme(next);
        return;
      }
      const x = origin?.clientX ?? window.innerWidth - 48;
      const y = origin?.clientY ?? 28;
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );
      const transition = doc.startViewTransition(() => {
        // Apply the class right away so the "new" snapshot already has the new theme.
        const root = document.documentElement;
        root.classList.toggle("dark", next === "dark");
        root.style.colorScheme = next;
        flushSync(() => setTheme(next));
      });
      void transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
          },
          {
            duration: 600,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      });
    },
    [resolvedTheme, setTheme],
  );
}
