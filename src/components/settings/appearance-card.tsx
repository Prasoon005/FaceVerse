"use client";

import { Check, Monitor, Moon, PlayCircle, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCENTS, type Accent, applyAccent } from "@/lib/ui/accent";
import { cn } from "@/lib/utils";

function subscribeAccent(cb: () => void) {
  window.addEventListener("faceverse:accent", cb);
  return () => window.removeEventListener("faceverse:accent", cb);
}
const readAccent = () => (document.documentElement.dataset.accent as Accent | undefined) ?? "blue";

/** Theme (light / dark) and accent colour, plus replaying the welcome tour. */
export function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const accent = useSyncExternalStore(subscribeAccent, readAccent, () => "blue" as Accent);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Make FaceVerse yours. Saved on this device.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Theme</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["light", "Light", Sun],
                ["dark", "Dark", Moon],
                ["system", "Auto", Monitor],
              ] as const
            ).map(([value, label, Icon]) => {
              const on = mounted && theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={on}
                  className={cn(
                    "grid justify-items-center gap-2 rounded-2xl p-3 text-sm ring-1 ring-foreground/[0.08] transition-all hover:bg-foreground/[0.04]",
                    on && "nav-pill ring-brand/40",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-14 w-full place-items-center rounded-xl",
                      value === "light" && "bg-[#f2f2f7] text-[#1d1d1f]",
                      value === "dark" && "bg-[#1c1c1e] text-[#f5f5f7]",
                      value === "system" &&
                        "bg-[linear-gradient(135deg,#f2f2f7_50%,#1c1c1e_50%)] text-[#8e8e93]",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Accent colour</legend>
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => {
              const on = accent === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => applyAccent(a.id)}
                  aria-pressed={on}
                  aria-label={a.label}
                  title={a.label}
                  className="group grid justify-items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-background transition-all group-hover:scale-110",
                      on && "ring-foreground/60",
                    )}
                    style={{
                      background: `linear-gradient(180deg, ${a.swatch[0]}, ${a.swatch[1]})`,
                      boxShadow: on ? `0 0 18px -2px ${a.swatch[0]}` : undefined,
                    }}
                  >
                    {on ? <Check className="size-4 text-white" aria-hidden /> : null}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{a.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-foreground/[0.03] px-4 py-3 ring-1 ring-foreground/[0.06]">
          <span className="grid">
            <span className="text-sm font-medium">Welcome tour</span>
            <span className="text-xs text-muted-foreground">See the quick introduction again.</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new Event("faceverse:tour"))}
          >
            <PlayCircle aria-hidden /> Replay
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
