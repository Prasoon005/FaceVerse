"use client";

import { Fingerprint, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Portal } from "@/config/site";

export type ShellUser = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: "admin" | "member";
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ user, portal = "user" }: { user: ShellUser; portal?: Portal }) {
  const router = useRouter();
  const displayName = user.fullName || user.email;

  async function signOut() {
    await fetch("/auth/signout", { method: "POST" });
    router.replace(portal === "admin" ? "/admin/login" : "/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Open user menu">
          <Avatar className="size-7 ring-2 ring-brand/30">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-brand/15 text-xs text-brand">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          {user.role === "admin" ? (
            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium text-brand">
              <ShieldCheck className="size-3" aria-hidden /> Admin
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={portal === "admin" ? "/admin/profile" : "/profile"}>
            <UserRound aria-hidden /> Profile
          </Link>
        </DropdownMenuItem>
        {portal === "admin" ? (
          <DropdownMenuItem asChild>
            <Link href="/admin/settings">
              <Settings aria-hidden /> Workspace settings
            </Link>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/identity">
                <Fingerprint aria-hidden /> My identity
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings aria-hidden /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/security">
                <ShieldCheck aria-hidden /> Security
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onSelect={signOut}>
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
