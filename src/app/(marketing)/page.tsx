import {
  ArrowRight,
  CalendarCheck,
  CalendarRange,
  ChevronDown,
  Cpu,
  DoorOpen,
  EyeOff,
  Fingerprint,
  Gauge,
  Images,
  KeyRound,
  Lock,
  Megaphone,
  MessagesSquare,
  MonitorSmartphone,
  Radar,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

import { AppBackdrop } from "@/components/fx/app-backdrop";
import { HeroMesh } from "@/components/marketing/hero-mesh";
import { ProductPreview } from "@/components/marketing/product-preview";
import { Reveal } from "@/components/marketing/reveal";
import { SiteHeader } from "@/components/marketing/site-header";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const highlights = [
  { value: "On-device", label: "Face and voice models run in your browser" },
  { value: "< 1 s", label: "To recognise a face and mark attendance" },
  { value: "0", label: "Raw images or recordings stored" },
  { value: "Free", label: "No card, no trial limits" },
];

const steps = [
  {
    icon: UserPlus,
    title: "Enroll once",
    body: "A guided capture takes a few face angles (and an optional voice phrase) with quality checks as you go.",
  },
  {
    icon: Cpu,
    title: "Recognise on your device",
    body: "Models run in the browser through WebGL and WebAssembly. Video never leaves the camera.",
  },
  {
    icon: ShieldCheck,
    title: "Match securely",
    body: "Only numeric embeddings are compared, inside a database protected by row-level security.",
  },
];

const teamFeatures = [
  {
    icon: CalendarCheck,
    title: "Face attendance",
    body: "Check in and out with a two-second scan.",
  },
  {
    icon: MonitorSmartphone,
    title: "Kiosk mode",
    body: "One shared screen at the door for everyone.",
  },
  {
    icon: CalendarRange,
    title: "Leave requests",
    body: "Request, approve and track leave in one place.",
  },
  {
    icon: Gauge,
    title: "Fair scoring",
    body: "Late and absence rules that follow your company norms.",
  },
  {
    icon: MessagesSquare,
    title: "Team messaging",
    body: "Members talk to admins directly, in real time.",
  },
  {
    icon: Megaphone,
    title: "Announcements",
    body: "Send updates to the whole team or one person.",
  },
];

const privacyPoints = [
  { icon: Cpu, text: "On-device inference: camera and microphone streams stay in your browser." },
  { icon: Lock, text: "Only embeddings (vectors) are stored, protected by row-level security." },
  { icon: KeyRound, text: "Clear consent before your first enrollment, in plain language." },
  { icon: Trash2, text: "Export your data or delete every biometric sample in one step." },
];

const faqs = [
  {
    q: "Does FaceVerse upload my photos or video?",
    a: "No. Recognition runs in your browser. Only a numeric embedding (a list of numbers that can't be turned back into a photo) is saved to your account.",
  },
  {
    q: "Can I still sign in with a password?",
    a: "Yes. Face and voice sign-in is optional. Email and password, and Google sign-in, always work.",
  },
  {
    q: "What happens if I want to change my face data?",
    a: "Your identity is locked after enrollment so nobody can swap it. Send a change request and an admin can unlock it once for you to re-enroll.",
  },
  {
    q: "Does it work on phones and tablets?",
    a: "Yes. FaceVerse works in any modern browser on phone, tablet or desktop, with a layout that adapts to each screen.",
  },
  {
    q: "How do I delete my data?",
    a: "Open Settings, then Privacy, and delete every biometric sample in one step. You can also export everything first.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <AppBackdrop />
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative">
          <div className="mx-auto grid max-w-6xl justify-items-center gap-7 px-5 pt-16 pb-14 text-center sm:px-6 md:pt-24">
            <Reveal>
              <span className="glass-panel inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="dot-glow size-1.5 rounded-full bg-success text-success" />
                Face, voice and attendance in one private workspace
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mx-auto max-w-4xl text-[40px] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-[56px] md:text-[68px]">
                Recognition that respects
                <span className="block bg-gradient-to-b from-foreground/70 to-foreground/35 bg-clip-text text-transparent">
                  the person in front of it.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto max-w-2xl text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
                {siteConfig.name} signs people in with their face, marks attendance in seconds and
                keeps your team connected. Every model runs on the device, so faces never leave it.
              </p>
            </Reveal>
            <Reveal delay={0.15} className="flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild className="h-12 rounded-full px-6 text-[15px]">
                <Link href="/signup">
                  Get started free <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 rounded-full px-6 text-[15px]"
              >
                <a href="#how-it-works">See how it works</a>
              </Button>
            </Reveal>
          </div>

          <Reveal delay={0.2} className="relative mx-auto max-w-5xl px-5 pb-20 sm:px-6">
            {/* Light pooling under the preview (strongest in dark mode). */}
            <div
              aria-hidden
              className="absolute inset-x-[10%] top-[10%] bottom-[20%] -z-10 rounded-full bg-brand/20 blur-[90px] dark:bg-brand/35"
            />
            <ProductPreview />
          </Reveal>
        </section>

        {/* Highlights */}
        <section className="glass-panel border-y-0">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 sm:px-6 lg:grid-cols-4">
            {highlights.map((h, i) => (
              <Reveal key={h.label} delay={i * 0.05} className="grid gap-1 px-2 py-8 text-center">
                <span className="text-[28px] font-semibold tracking-tight tabular-nums">
                  {h.value}
                </span>
                <span className="text-[13px] text-muted-foreground">{h.label}</span>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Features: bento grid */}
        <section id="features" className="scroll-mt-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-6">
            <SectionHeading
              eyebrow="Features"
              title="One identity layer. Many everyday uses."
              body="Built as modules on top of a shared face and voice engine."
            />
            <div className="grid auto-rows-[minmax(200px,auto)] gap-4 md:grid-cols-3">
              <Reveal className="md:col-span-2 md:row-span-2">
                <BentoCard
                  icon={Fingerprint}
                  title="Passwordless biometric sign-in"
                  body="Face, voice and a liveness challenge as an opt-in second way to sign in. Password and Google always stay available."
                  className="h-full"
                >
                  <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl bg-foreground/[0.03] ring-1 ring-foreground/[0.06]">
                    <HeroMesh />
                  </div>
                </BentoCard>
              </Reveal>
              <Reveal delay={0.05}>
                <BentoCard
                  icon={Radar}
                  title="Live multi-face recognition"
                  body="Names and confidence for every face in the frame, in real time."
                />
              </Reveal>
              <Reveal delay={0.1}>
                <BentoCard
                  icon={DoorOpen}
                  title="Smart visitor log"
                  body="Recognise returning visitors, register new ones and export to CSV."
                />
              </Reveal>
              <Reveal>
                <BentoCard
                  icon={Images}
                  title="Event photo finder"
                  body="Take a selfie and instantly get every album photo you appear in."
                />
              </Reveal>
              <Reveal delay={0.05}>
                <BentoCard
                  icon={EyeOff}
                  title="Privacy blur"
                  body="Blur faces in photos automatically, keeping only the people you choose."
                />
              </Reveal>
              <Reveal delay={0.1}>
                <BentoCard
                  icon={CalendarCheck}
                  title="Attendance that runs itself"
                  body="Check-ins, late marks, leave and reasons, with a clear monthly score."
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24 border-t">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-6">
            <SectionHeading
              eyebrow="How it works"
              title="Three steps. No GPU servers."
              body="The heavy lifting happens on your device. The backend only stores vectors."
            />
            <div className="relative grid gap-4 md:grid-cols-3">
              <span
                aria-hidden
                className="absolute top-10 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
              />
              {steps.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.08}>
                  <div className="glass-panel grid h-full gap-3 rounded-[24px] p-7">
                    <div className="flex items-center justify-between">
                      <span className="icon-glow grid size-11 place-items-center rounded-2xl bg-brand/12 text-brand">
                        <s.icon className="size-5" aria-hidden />
                      </span>
                      <span className="text-sm font-medium text-muted-foreground tabular-nums">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                    <p className="text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* For teams */}
        <section id="teams" className="scroll-mt-24 border-t">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 sm:px-6 lg:grid-cols-[1fr_1.15fr]">
            <SectionHeading
              eyebrow="For teams"
              title="An admin console that keeps everyone in sync."
              body="A separate, secure console for admins: approve identities, review absences, manage leave and talk to your team, all updating live."
            >
              <Button asChild className="mt-4 h-11 w-fit rounded-full px-5">
                <Link href="/signup">
                  Set up your team <ArrowRight aria-hidden />
                </Link>
              </Button>
            </SectionHeading>
            <div className="grid gap-3 sm:grid-cols-2">
              {teamFeatures.map((f, i) => (
                <Reveal key={f.title} delay={(i % 2) * 0.05}>
                  <div className="glass-panel hover-lift flex h-full gap-3 rounded-[22px] p-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground/[0.05]">
                      <f.icon className="size-[18px]" aria-hidden />
                    </span>
                    <div className="grid gap-0.5">
                      <h3 className="text-[15px] font-semibold tracking-tight">{f.title}</h3>
                      <p className="text-sm text-muted-foreground">{f.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="scroll-mt-24 px-5 sm:px-6">
          <Reveal className="glass-panel mx-auto grid max-w-6xl gap-10 overflow-hidden rounded-[32px] p-8 sm:p-12 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <span className="text-xs font-semibold tracking-wider text-brand uppercase">
                Privacy
              </span>
              <h2 className="text-[32px] leading-tight font-semibold tracking-[-0.03em] sm:text-[40px]">
                Your biometrics. Your rules.
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                FaceVerse is a demo-grade platform, not bank-grade biometric security. Password and
                Google sign-in always remain available.
              </p>
            </div>
            <ul className="grid gap-3">
              {privacyPoints.map((p) => (
                <li
                  key={p.text}
                  className="flex gap-3 rounded-2xl bg-foreground/[0.04] p-4 text-[15px] ring-1 ring-foreground/[0.06]"
                >
                  <p.icon
                    className="mt-0.5 size-[18px] shrink-0 text-success-foreground"
                    aria-hidden
                  />
                  {p.text}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24">
          <div className="mx-auto grid max-w-3xl gap-10 px-5 py-24 sm:px-6">
            <SectionHeading eyebrow="FAQ" title="Questions, answered." centered />
            <div className="grid gap-2">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="group glass-panel rounded-[20px] open:shadow-(--shadow-card-hover)"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="px-5 pb-5 text-[15px] leading-relaxed text-muted-foreground">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-24 sm:px-6">
          <Reveal className="glass-panel mx-auto grid max-w-6xl justify-items-center gap-5 overflow-hidden rounded-[32px] px-6 py-16 text-center">
            <h2 className="max-w-2xl text-[32px] leading-tight font-semibold tracking-[-0.03em] sm:text-[44px]">
              Ready to try it on your own face?
            </h2>
            <p className="text-[17px] text-muted-foreground">
              Create a free account in under a minute.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild className="h-12 rounded-full px-6 text-[15px]">
                <Link href="/signup">
                  Create your account <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 rounded-full px-6 text-[15px]"
              >
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="grid content-start gap-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              Face, voice and attendance in one private workspace.
            </p>
          </div>
          <FooterColumn
            title="Product"
            links={[
              { href: "#features", label: "Features" },
              { href: "#how-it-works", label: "How it works" },
              { href: "#teams", label: "For teams" },
            ]}
          />
          <FooterColumn
            title="Account"
            links={[
              { href: "/signup", label: "Create account" },
              { href: "/login", label: "Sign in" },
              { href: "/admin/login", label: "Admin console" },
            ]}
          />
        </div>
        <div className="border-t">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <span>
              © {new Date().getFullYear()} {siteConfig.name}
            </span>
            <span>
              Built by{" "}
              <a
                href={siteConfig.author.github}
                className="text-foreground underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {siteConfig.author.name}
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  centered = false,
  children,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  centered?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Reveal className={cn("grid max-w-2xl gap-3", centered && "mx-auto text-center")}>
      <span className="text-xs font-semibold tracking-wider text-brand uppercase">{eyebrow}</span>
      <h2 className="text-[32px] leading-tight font-semibold tracking-[-0.03em] sm:text-[40px]">
        {title}
      </h2>
      {body ? <p className="text-[17px] leading-relaxed text-muted-foreground">{body}</p> : null}
      {children}
    </Reveal>
  );
}

function BentoCard({
  icon: Icon,
  title,
  body,
  className,
  children,
}: {
  icon: typeof Radar;
  title: string;
  body: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn("glass-panel hover-lift flex h-full flex-col rounded-[26px] p-7", className)}
    >
      <span className="icon-glow grid size-11 place-items-center rounded-2xl bg-brand/12 text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="grid content-start gap-3">
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </span>
      <ul className="grid gap-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-foreground/80 transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
