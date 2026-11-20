import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="FaceVerse home" className="rounded-md">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        {/* Pages marked data-wide (biometric login has a camera view) get more room. */}
        <div className="w-full max-w-sm has-[[data-wide]]:max-w-xl">{children}</div>
      </main>
    </div>
  );
}
