import { ArrowLeft, Compass, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { AppBackdrop } from "@/components/fx/app-backdrop";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-5">
      <AppBackdrop />
      <div className="glass-panel grid w-full max-w-lg justify-items-center gap-6 rounded-[32px] px-6 py-12 text-center sm:px-10">
        <Logo />
        <div className="relative">
          <span className="block bg-gradient-to-b from-foreground to-foreground/20 bg-clip-text text-[112px] leading-none font-semibold tracking-[-0.06em] text-transparent sm:text-[140px]">
            404
          </span>
          <span className="glass-panel icon-glow absolute -right-4 -bottom-2 grid size-14 place-items-center rounded-2xl text-brand">
            <Compass className="size-7" aria-hidden />
          </span>
        </div>
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">This page wandered off</h1>
          <p className="max-w-sm text-[15px] text-muted-foreground">
            The link may be broken, or the page was moved. Let&apos;s get you back on track.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild size="lg" className="rounded-full px-5">
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden /> Go to dashboard
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-5">
            <Link href="/">
              <ArrowLeft aria-hidden /> Home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
