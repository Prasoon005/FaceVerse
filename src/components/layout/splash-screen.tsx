import { LogoMark } from "@/components/shared/logo";

/**
 * Logo splash on a full page load (pure CSS: it fades itself out, needs no JavaScript and is
 * skipped instantly when the OS asks for reduced motion).
 */
export function SplashScreen() {
  return (
    <div
      aria-hidden
      className="splash pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-background"
    >
      <div className="splash-logo grid justify-items-center gap-4">
        <span className="glass-panel icon-glow grid size-20 place-items-center rounded-[26px] text-brand">
          <LogoMark className="size-11" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">FaceVerse</span>
      </div>
    </div>
  );
}
