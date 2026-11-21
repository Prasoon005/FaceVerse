"use client";

import { useEffect } from "react";

/**
 * App-wide pointer effects with one set of listeners (no per-component wiring):
 * - spotlight: cards get a soft light that follows the pointer (desktop only)
 * - ripple: every button shows a ripple from the click point
 * - magnetic: elements with `data-magnetic` lean toward the pointer (desktop only)
 * Everything is skipped when the OS asks for reduced motion.
 */
export function InteractionEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let glowCard: HTMLElement | null = null;
    let magnet: HTMLElement | null = null;
    let frame = 0;

    function resetMagnet() {
      if (magnet) magnet.style.transform = "";
      magnet = null;
    }

    function onMove(e: PointerEvent) {
      const target = e.target as Element | null;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const card = target?.closest<HTMLElement>('[data-slot="card"]') ?? null;
        if (card !== glowCard) {
          glowCard?.removeAttribute("data-glow");
          glowCard = card;
          card?.setAttribute("data-glow", "");
        }
        if (card) {
          const r = card.getBoundingClientRect();
          card.style.setProperty("--mx", `${e.clientX - r.left}px`);
          card.style.setProperty("--my", `${e.clientY - r.top}px`);
        }

        const el = target?.closest<HTMLElement>("[data-magnetic]") ?? null;
        if (el !== magnet) resetMagnet();
        if (el) {
          magnet = el;
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) * 0.25;
          const dy = (e.clientY - (r.top + r.height / 2)) * 0.35;
          const clamp = (v: number) => Math.max(-8, Math.min(8, v));
          el.style.transform = `translate(${clamp(dx)}px, ${clamp(dy)}px)`;
        }
      });
    }

    function onLeave() {
      glowCard?.removeAttribute("data-glow");
      glowCard = null;
      resetMagnet();
    }

    function onDown(e: PointerEvent) {
      const el = (e.target as Element | null)?.closest<HTMLElement>(
        '[data-slot="button"], [data-ripple]',
      );
      if (!el || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;
      const rect = el.getBoundingClientRect();
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      const size = Math.max(rect.width, rect.height) * 2.2;
      const host = document.createElement("span");
      host.className = "fx-ripple-host";
      host.setAttribute("aria-hidden", "true");
      const dot = document.createElement("span");
      dot.className = "fx-ripple";
      dot.style.width = dot.style.height = `${size}px`;
      dot.style.left = `${e.clientX - rect.left - size / 2}px`;
      dot.style.top = `${e.clientY - rect.top - size / 2}px`;
      host.appendChild(dot);
      el.appendChild(host);
      window.setTimeout(() => host.remove(), 650);
    }

    if (finePointer) {
      document.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return null;
}
