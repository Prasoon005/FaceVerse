"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number; z: number };

/** Deterministic PRNG so the mesh looks the same on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds an original, stylised face point cloud in a -1..1 space. */
function buildFace(): { points: Point[]; edges: [number, number][] } {
  const rand = mulberry32(7);
  const points: Point[] = [];

  // Face outline (egg shape: narrower chin).
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const y = Math.sin(a);
    const x = Math.cos(a) * (y > 0 ? 0.72 - y * 0.16 : 0.74);
    points.push({ x, y: y * 0.98, z: 0 });
  }
  // Interior scatter, denser towards the centre.
  for (let i = 0; i < 70; i++) {
    const r = Math.sqrt(rand()) * 0.86;
    const a = rand() * Math.PI * 2;
    const y = Math.sin(a) * r;
    const x = Math.cos(a) * r * (y > 0 ? 0.68 - y * 0.12 : 0.7);
    points.push({ x, y, z: Math.sqrt(Math.max(0, 1 - r * r)) });
  }
  // Feature rings: eyes, nose bridge, mouth.
  const ring = (cx: number, cy: number, rx: number, ry: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      points.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, z: 0.9 });
    }
  };
  ring(-0.28, -0.18, 0.13, 0.06, 10);
  ring(0.28, -0.18, 0.13, 0.06, 10);
  for (let i = 0; i < 5; i++) points.push({ x: 0, y: -0.1 + i * 0.08, z: 1 });
  ring(0, 0.48, 0.2, 0.06, 12);

  // Connect each point to its 3 nearest neighbours.
  const edges = new Set<string>();
  points.forEach((p, i) => {
    points
      .map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 }))
      .filter((n) => n.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .forEach(({ j }) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });

  return {
    points,
    edges: [...edges].map((e) => e.split("-").map(Number) as [number, number]),
  };
}

/** Animated face-mesh hero visual drawn on canvas. Pauses off-screen and for reduced motion. */
export function HeroMesh() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { points, edges } = buildFace();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const t = reduceMotion ? 0 : (now - start) / 1000;
      const { width, height } = canvas.getBoundingClientRect();
      const brand = getComputedStyle(canvas).getPropertyValue("--brand").trim() || "#6366f1";
      const size = Math.min(width, height) * 0.42;
      const cx = width / 2;
      const cy = height / 2;
      const yaw = Math.sin(t * 0.6) * 0.35;
      const scanY = ((t * 0.35) % 1.4) * 2 - 1.2; // sweeps -1.2 .. 1.6

      const projected = points.map((p) => ({
        x: cx + (p.x * Math.cos(yaw) + p.z * Math.sin(yaw) * 0.35) * size,
        y: cy + p.y * size,
        glow: Math.max(0, 1 - Math.abs(p.y - scanY) * 6),
      }));

      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      for (const [a, b] of edges) {
        const pa = projected[a]!;
        const pb = projected[b]!;
        ctx.globalAlpha = 0.18 + Math.max(pa.glow, pb.glow) * 0.5;
        ctx.strokeStyle = brand;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
      for (const p of projected) {
        ctx.globalAlpha = 0.5 + p.glow * 0.5;
        ctx.fillStyle = brand;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4 + p.glow * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Scan line.
      if (!reduceMotion) {
        const y = cy + scanY * size;
        const grad = ctx.createLinearGradient(cx - size, 0, cx + size, 0);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.5, brand);
        grad.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx - size, y);
        ctx.lineTo(cx + size, y);
        ctx.stroke();
      }

      // Corner brackets around the face.
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = brand;
      ctx.lineWidth = 2;
      const bw = size * 0.95;
      const bh = size * 1.15;
      const len = size * 0.18;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        const x = cx + sx * bw;
        const y = cy + sy * bh;
        ctx.beginPath();
        ctx.moveTo(x, y - sy * len);
        ctx.lineTo(x, y);
        ctx.lineTo(x - sx * len, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (visible && !reduceMotion) raf = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    });

    const onResize = () => {
      resize();
      // With reduced motion there is no animation loop, so repaint the static frame.
      if (reduceMotion) draw(performance.now());
    };

    resize();
    observer.observe(canvas);
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Animated illustration of a face mesh being scanned"
      className="size-full"
    />
  );
}
