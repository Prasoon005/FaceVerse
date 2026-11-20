import { cn } from "@/lib/utils";

/** FaceVerse wordmark: an original face-bracket glyph + name. */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-6" />
      {showText ? (
        <span className="text-[15px] font-semibold tracking-tight">FaceVerse</span>
      ) : null}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("text-brand", className)}>
      <rect width="24" height="24" rx="6" className="fill-brand/15" />
      <path
        d="M6 9V7a1 1 0 0 1 1-1h2M15 6h2a1 1 0 0 1 1 1v2M18 15v2a1 1 0 0 1-1 1h-2M9 18H7a1 1 0 0 1-1-1v-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="10" cy="11" r="0.9" fill="currentColor" />
      <circle cx="14" cy="11" r="0.9" fill="currentColor" />
      <path
        d="M10 14.5c1.1.8 2.9.8 4 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
