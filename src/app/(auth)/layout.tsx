import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AuroraBackground } from "@/components/shared/aurora-background";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <AuroraBackground className="-z-10" />
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="FaceVerse home" className="rounded-md">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        {/* Pages marked data-wide (biometric login has a camera view) get more room. */}
        <div className="w-full max-w-sm animate-in duration-500 fade-in slide-in-from-bottom-4 has-[[data-wide]]:max-w-xl">
          <div className="rounded-2xl border bg-card/70 p-6 shadow-xl shadow-brand/5 backdrop-blur-xl sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
