import {
  ArrowRight,
  Cpu,
  DoorOpen,
  EyeOff,
  Fingerprint,
  Images,
  KeyRound,
  Lock,
  Radar,
  ScanFace,
  ShieldCheck,
  Target,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

import { HeroMesh } from "@/components/marketing/hero-mesh";
import { SiteHeader } from "@/components/marketing/site-header";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

const features = [
  {
    icon: Fingerprint,
    title: "Passwordless biometric login",
    body: "Face + voice + liveness challenge as an opt-in second way to sign in.",
  },
  {
    icon: Radar,
    title: "Live multi-face recognition",
    body: "Name tags and confidence for every face in the frame, in real time.",
  },
  {
    icon: DoorOpen,
    title: "Smart visitor log",
    body: "Recognise returning visitors, register new ones and export to CSV.",
  },
  {
    icon: Images,
    title: "Event photo finder",
    body: "Upload an album, take a selfie and instantly get every photo you're in.",
  },
  {
    icon: EyeOff,
    title: "Privacy blur",
    body: "Automatically blur faces in photos while keeping the people you choose.",
  },
  {
    icon: Target,
    title: "Focus tracker",
    body: "Eye-closure and head-pose signals help you see when your focus drifts.",
  },
];

const steps = [
  {
    icon: UserPlus,
    title: "Enroll",
    body: "Capture a few guided face angles and voice phrases. Quality checks run as you go.",
  },
  {
    icon: Cpu,
    title: "Recognise on your device",
    body: "AI models run in your browser via WebGL/WASM. Raw video never leaves your machine.",
  },
  {
    icon: ShieldCheck,
    title: "Match securely",
    body: "Only numeric embeddings are compared in a row-level-secured Postgres database.",
  },
];

const privacyPoints = [
  { icon: Cpu, text: "On-device inference: camera and microphone streams stay in your browser." },
  { icon: Lock, text: "Only embeddings (vectors) are stored, protected by row-level security." },
  {
    icon: KeyRound,
    text: "Explicit consent before your first enrollment, with plain-language details.",
  },
  { icon: Trash2, text: "Export your data or delete every biometric sample in one step." },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_40%,color-mix(in_oklch,var(--brand)_18%,transparent),transparent)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
            <div className="grid animate-in gap-6 duration-500 fade-in slide-in-from-bottom-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
                <ScanFace className="size-3.5 text-brand" aria-hidden />
                On-device AI · 100% free stack
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Recognition that respects the person in front of the camera.
              </h1>
              <p className="max-w-xl text-base text-pretty text-muted-foreground">
                {siteConfig.name} combines face, voice and multi-face recognition to make everyday
                things easier: passwordless sign-in, visitor logs, finding yourself in event photos,
                and more. All models run in your browser.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Get started free <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
            </div>
            <div className="relative mx-auto aspect-square w-full max-w-md animate-in duration-700 fade-in">
              <div className="absolute inset-0 rounded-2xl border bg-card/60" />
              <HeroMesh />
              <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 font-mono text-[11px] backdrop-blur">
                <span className="size-1.5 rounded-full bg-success" aria-hidden /> MATCH · 0.92
              </div>
              <div className="absolute right-4 bottom-4 rounded-md border bg-background/80 px-2 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur">
                1024-d embedding · 7 fps
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 border-b">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:py-20">
            <SectionHeading
              eyebrow="Features"
              title="One identity layer, many everyday uses"
              body="Built as modules on top of a shared face and voice engine."
            />
            <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="grid gap-2 bg-card p-6">
                  <f.icon className="size-5 text-brand" aria-hidden />
                  <h3 className="text-base font-medium">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16 border-b">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:py-20">
            <SectionHeading
              eyebrow="How it works"
              title="Three steps, zero servers with GPUs"
              body="The heavy lifting happens on your device; the backend only stores vectors."
            />
            <ol className="grid gap-4 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="grid gap-3 rounded-xl border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-md bg-brand/10 font-mono text-sm text-brand">
                      {i + 1}
                    </span>
                    <s.icon className="size-4 text-muted-foreground" aria-hidden />
                  </div>
                  <h3 className="text-base font-medium">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="scroll-mt-16 border-b">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-2">
            <SectionHeading
              eyebrow="Privacy"
              title="Your biometrics, your rules"
              body="FaceVerse is a demo-grade platform, not bank-grade biometric security. Password and Google sign-in always remain available."
            />
            <ul className="grid gap-3">
              {privacyPoints.map((p) => (
                <li key={p.text} className="flex gap-3 rounded-xl border bg-card p-4 text-sm">
                  <p.icon className="mt-0.5 size-4 shrink-0 text-success-foreground" aria-hidden />
                  {p.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="mx-auto grid max-w-3xl justify-items-center gap-5 px-4 py-20 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Ready to try it on your own face?
            </h2>
            <p className="text-muted-foreground">Create a free account. No credit card, ever.</p>
            <Button size="lg" asChild>
              <Link href="/signup">
                Create your account <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo className="text-foreground" />
          <p>
            Built by{" "}
            <a
              href={siteConfig.author.github}
              className="text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {siteConfig.author.name}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="grid max-w-2xl gap-2">
      <span className="text-sm font-medium text-brand">{eyebrow}</span>
      <h2 className="text-3xl font-semibold tracking-tight text-balance">{title}</h2>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
}
