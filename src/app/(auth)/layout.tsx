import { CalendarCheck, Cpu, Fingerprint, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HeroMesh } from "@/components/marketing/hero-mesh";
import { AuroraBackground } from "@/components/shared/aurora-background";
import { Logo } from "@/components/shared/logo";

const points = [
  { icon: Fingerprint, text: "Sign in with your face and voice, or a password" },
  { icon: CalendarCheck, text: "Mark attendance in seconds with a quick face scan" },
  { icon: Cpu, text: "Recognition runs on your device, video never leaves it" },
  { icon: ShieldCheck, text: "Only encrypted embeddings are stored, behind row-level security" },
];

/**
 * Split layout: a brand panel on large screens (left), the form on the right. On phones and
 * tablets only the form shows, centred.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <AuroraBackground className="-z-10" />

      <aside className="relative hidden p-4 lg:flex">
        <div className="glass-panel flex w-full flex-col overflow-hidden rounded-[32px] p-10">
          <Link href="/" aria-label="FaceVerse home" className="w-fit rounded-md">
            <Logo />
          </Link>
          <div className="my-auto grid gap-10">
            <div className="relative mx-auto aspect-square w-full max-w-[340px]">
              <div className="absolute inset-[12%] -z-10 rounded-full bg-brand/15 blur-3xl dark:bg-brand/30" />
              <div className="absolute inset-0 rounded-[28px] bg-foreground/[0.03] ring-1 ring-foreground/[0.06]" />
              <HeroMesh />
            </div>
            <div className="grid gap-5">
              <h2 className="max-w-md text-[28px] leading-tight font-semibold tracking-[-0.025em]">
                Your identity, recognised in a glance.
              </h2>
              <ul className="grid gap-3">
                {points.map((p) => (
                  <li
                    key={p.text}
                    className="flex items-start gap-3 text-[15px] text-muted-foreground"
                  >
                    <span className="icon-glow mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand">
                      <p.icon className="size-4" aria-hidden />
                    </span>
                    {p.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Face, voice and attendance in one private workspace.
          </p>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" aria-label="FaceVerse home" className="rounded-md lg:invisible">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          {/* Pages marked data-wide (biometric login has a camera view) get more room. */}
          <div className="w-full max-w-[400px] animate-in duration-500 fade-in slide-in-from-bottom-2 has-[[data-wide]]:max-w-xl">
            <div className="glass-panel rounded-[28px] p-6 shadow-(--shadow-card-hover) sm:p-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
