"use client";

import { CalendarPlus, LoaderCircle, PartyPopper, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerAction } from "@/hooks/use-server-action";
import { deleteHoliday, saveHoliday } from "@/lib/actions/admin";
import { formatDay } from "@/lib/format";

/** Admin: the workspace holiday calendar. Holidays never count as absences. */
export function HolidaysCard({
  holidays,
  today,
}: {
  holidays: { day: string; name: string }[];
  today: string;
}) {
  const { run, pending, busyKey } = useServerAction();
  const [day, setDay] = useState("");
  const [name, setName] = useState("");
  const upcoming = holidays.filter((h) => h.day >= today);
  const past = holidays.filter((h) => h.day < today).slice(-5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PartyPopper className="size-4 text-brand" aria-hidden /> Holidays
        </CardTitle>
        <CardDescription>
          Company-wide days off. Nobody is marked absent and no score is deducted.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <form
          className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            run("add", () => saveHoliday({ day, name }), {
              success: "Holiday saved",
              onSuccess: () => {
                setDay("");
                setName("");
              },
            });
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="holiday-day">Date</Label>
            <Input
              id="holiday-day"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="holiday-name">Name</Label>
            <Input
              id="holiday-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Diwali"
              maxLength={80}
              required
            />
          </div>
          <Button type="submit" disabled={pending || !day || !name.trim()}>
            {busyKey === "add" ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <CalendarPlus aria-hidden />
            )}
            Add
          </Button>
        </form>

        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No holidays yet.</p>
        ) : (
          <div className="grid gap-4">
            <HolidayList
              title="Upcoming"
              items={upcoming}
              busyKey={busyKey}
              onDelete={(d) =>
                run(`del-${d}`, () => deleteHoliday(d), { success: "Holiday removed" })
              }
            />
            {past.length ? (
              <HolidayList
                title="Recent"
                items={past}
                muted
                busyKey={busyKey}
                onDelete={(d) =>
                  run(`del-${d}`, () => deleteHoliday(d), { success: "Holiday removed" })
                }
              />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HolidayList({
  title,
  items,
  muted = false,
  busyKey,
  onDelete,
}: {
  title: string;
  items: { day: string; name: string }[];
  muted?: boolean;
  busyKey: string | null;
  onDelete: (day: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-2">
      <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </span>
      <ul className="grid gap-1.5">
        {items.map((h) => (
          <li
            key={h.day}
            className={`flex items-center gap-3 rounded-xl bg-foreground/[0.03] px-3 py-2 ring-1 ring-foreground/[0.06] ${muted ? "opacity-60" : ""}`}
          >
            <span className="grid w-11 shrink-0 justify-items-center rounded-lg bg-violet-500/12 py-1 text-violet-700 dark:text-violet-300">
              <span className="text-[10px] font-semibold uppercase">
                {formatDay(h.day, { weekday: undefined, day: undefined, month: "short" })}
              </span>
              <span className="text-base leading-none font-semibold tabular-nums">
                {Number(h.day.slice(8))}
              </span>
            </span>
            <span className="grid min-w-0 flex-1">
              <span className="truncate text-sm font-medium">{h.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDay(h.day, { weekday: "long" })}
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${h.name}`}
              disabled={busyKey === `del-${h.day}`}
              onClick={() => onDelete(h.day)}
            >
              {busyKey === `del-${h.day}` ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Trash2 aria-hidden />
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
