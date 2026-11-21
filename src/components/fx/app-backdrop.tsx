/** One soft, muted colour wash fixed behind the app (portal-tinted via --backdrop). */
export function AppBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 [background:var(--backdrop)]"
    />
  );
}
