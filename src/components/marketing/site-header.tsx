"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#teams", label: "For teams" },
  { href: "#faq", label: "FAQ" },
];

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/** Floating glass navigation bar that tightens once the page scrolls. */
export function SiteHeader() {
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 12,
    () => false,
  );

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center gap-6 rounded-2xl px-4 transition-all duration-300",
          scrolled ? "glass-panel shadow-(--shadow-card-hover)" : "bg-transparent",
        )}
      >
        <Link href="/" aria-label="FaceVerse home" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 text-sm md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="rounded-full px-4">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
