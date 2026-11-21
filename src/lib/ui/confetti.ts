/**
 * A small, dependency-free confetti burst on a temporary full-screen canvas.
 * Used only for real wins (attendance marked, request approved). Skipped for reduced motion.
 */
export function fireConfetti({
  x = 0.5,
  y = 0.45,
  count = 110,
}: { x?: number; y?: number; count?: number } = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const scope = document.querySelector<HTMLElement>("[data-portal]") ?? document.documentElement;
  const css = getComputedStyle(scope);
  const colors = ["--brand", "--success", "--warning", "--chart-1", "--danger"]
    .map((v) => css.getPropertyValue(v).trim())
    .filter(Boolean);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "9999",
  });
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const ox = window.innerWidth * x;
  const oy = window.innerHeight * y;
  const parts = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 6,
      w: 5 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.35,
      color: colors[Math.floor(Math.random() * colors.length)] ?? "#6366f1",
    };
  });

  const start = performance.now();
  const duration = 1800;
  function tick(now: number) {
    const t = (now - start) / duration;
    ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of parts) {
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.32;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      ctx!.save();
      ctx!.globalAlpha = Math.max(0, 1 - t * t);
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx!.restore();
    }
    if (t < 1) requestAnimationFrame(tick);
    else canvas.remove();
  }
  requestAnimationFrame(tick);
}
