import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PortalAttribute } from "@/components/layout/portal-attribute";
import { AuroraBackground } from "@/components/shared/aurora-background";
import { Logo } from "@/components/shared/logo";

/** Admin sign-in: its own look (violet accent, moving grid) so it's clearly not the user app. */
export default function AdminAuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-portal="admin" className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <PortalAttribute portal="admin" />
      <AuroraBackground grid className="-z-10" />
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="FaceVerse home" className="flex items-center gap-2 rounded-md">
          <Logo />
          <span className="rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand uppercase">
            Admin console
          </span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
