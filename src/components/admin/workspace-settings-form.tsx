"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { updateAttendanceSettings } from "@/lib/actions/admin";
import { WEEKDAYS } from "@/lib/attendance/days";
import { cn } from "@/lib/utils";

const COMMON_ZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

export function WorkspaceSettingsForm({
  workDays,
  timezone,
}: {
  workDays: number[];
  timezone: string;
}) {
  const { run, pending } = useServerAction();
  const [days, setDays] = useState<number[]>(workDays);
  const [zone, setZone] = useState(timezone);
  const zones = COMMON_ZONES.includes(timezone) ? COMMON_ZONES : [timezone, ...COMMON_ZONES];

  function toggle(iso: number) {
    setDays((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso]));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
        <CardDescription>Applies to everyone in the workspace.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Working days</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((w) => {
              const on = days.includes(w.iso);
              return (
                <button
                  key={w.iso}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(w.iso)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95",
                    on
                      ? "border-brand bg-brand text-primary-foreground"
                      : "text-muted-foreground hover:border-brand/50",
                  )}
                >
                  <span aria-hidden>{w.short}</span>
                  <span className="sr-only">{w.long}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Days not selected are days off: nobody is marked absent on them.
          </p>
        </fieldset>

        <div className="grid gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger id="timezone" className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z} value={z}>
                  {z.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-fit"
          disabled={pending || days.length === 0}
          onClick={() =>
            run("settings", () => updateAttendanceSettings({ workDays: days, timezone: zone }), {
              success: "Settings saved",
            })
          }
        >
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          Save settings
        </Button>
      </CardContent>
    </Card>
  );
}
