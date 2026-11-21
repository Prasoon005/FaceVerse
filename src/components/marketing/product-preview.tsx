import { CalendarCheck, Fingerprint, LayoutDashboard, MessagesSquare, Users } from "lucide-react";

import { HeroMesh } from "./hero-mesh";

const sidebar = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: CalendarCheck, label: "Attendance" },
  { icon: Users, label: "People" },
  { icon: MessagesSquare, label: "Messages" },
  { icon: Fingerprint, label: "Identity" },
];

const checkins = [
  { name: "Aarav S.", time: "09:12", tone: "bg-success" },
  { name: "Meera K.", time: "09:18", tone: "bg-success" },
  { name: "Rohan P.", time: "09:41", tone: "bg-warning" },
];

/**
 * A stylised, non-interactive preview of the app (window chrome, sidebar, stats, a face scan
 * and today's check-ins). Pure markup, so it stays sharp at any size. Sample names only.
 */
export function ProductPreview() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-[22px] bg-card shadow-[0_0_0_1px_var(--border),0_40px_80px_-30px_rgb(0_0_0/0.35)] backdrop-blur-(--glass-blur)"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="mx-auto rounded-md bg-foreground/[0.05] px-3 py-0.5 text-[11px] text-muted-foreground">
          faceverse.app/dashboard
        </span>
      </div>

      <div className="grid grid-cols-[150px_1fr] max-md:grid-cols-1">
        <div className="grid content-start gap-1 border-r p-3 max-md:hidden">
          {sidebar.map((s) => (
            <span
              key={s.label}
              className={
                s.active
                  ? "flex items-center gap-2 rounded-lg bg-foreground/[0.07] px-2.5 py-1.5 text-xs font-medium"
                  : "flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground"
              }
            >
              <s.icon className={s.active ? "size-3.5 text-brand" : "size-3.5"} />
              {s.label}
            </span>
          ))}
        </div>

        <div className="grid gap-3 p-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground">Good morning</div>
              <div className="text-base font-semibold tracking-tight">Team overview</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success-foreground">
              <span className="size-1.5 rounded-full bg-success" /> Live
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              ["Checked in", "42"],
              ["On leave", "3"],
              ["Attendance", "96%"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-xl bg-foreground/[0.035] p-3 ring-1 ring-foreground/[0.06]"
              >
                <div className="text-[10px] text-muted-foreground">{k}</div>
                <div className="text-lg font-semibold tracking-tight tabular-nums">{v}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_1.1fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-foreground/[0.035] ring-1 ring-foreground/[0.06]">
              <HeroMesh />
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-card-solid/80 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur">
                <span className="size-1.5 rounded-full bg-success" /> Match 0.94
              </span>
            </div>
            <div className="grid content-start gap-1.5 rounded-xl bg-foreground/[0.035] p-3 ring-1 ring-foreground/[0.06]">
              <div className="text-[11px] font-medium">Today&apos;s check-ins</div>
              {checkins.map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-[11px]">
                  <span className={`size-1.5 rounded-full ${c.tone}`} />
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-auto text-muted-foreground tabular-nums">{c.time}</span>
                </div>
              ))}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full w-[86%] rounded-full bg-brand" />
              </div>
              <div className="text-[10px] text-muted-foreground">86% of the team is in</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
