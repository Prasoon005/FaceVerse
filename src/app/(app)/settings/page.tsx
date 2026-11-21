import { ChevronRight, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AppearanceCard } from "@/components/settings/appearance-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Settings" };

const sections: {
  title: string;
  description: string;
  href?: string;
  icon: typeof ShieldCheck;
  comingInPhase?: number;
}[] = [
  {
    title: "Profile",
    description: "Your photo, name, phone and department.",
    href: "/profile",
    icon: UserRound,
  },
  {
    title: "Security",
    description: "Biometric login (face + voice) and recent sign-in attempts.",
    href: "/settings/security",
    icon: ShieldCheck,
  },
  {
    title: "Privacy",
    description: "Consent, data export, delete my biometrics and storage usage.",
    href: "/settings/privacy",
    icon: SlidersHorizontal,
  },
];

export default function SettingsPage() {
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Settings" description="Profile, appearance, security and privacy." />
      <AppearanceCard />
      <ul className="grid gap-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const content = (
            <>
              <span className="icon-glow grid size-10 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="grid flex-1 gap-0.5">
                <span className="font-medium">{section.title}</span>
                <span className="text-sm text-muted-foreground">{section.description}</span>
              </span>
              {section.href ? (
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              ) : (
                <Badge variant="outline">Phase {section.comingInPhase}</Badge>
              )}
            </>
          );
          return (
            <li key={section.title}>
              {section.href ? (
                <Link
                  href={section.href}
                  className="glass-panel hover-lift flex items-center gap-4 rounded-[20px] p-4"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-4 rounded-xl border bg-card p-4 opacity-70">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
