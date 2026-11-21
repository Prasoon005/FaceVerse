"use client";

import { motion } from "framer-motion";
import { AlarmClock, Gauge, LoaderCircle, Save } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerAction } from "@/hooks/use-server-action";
import { updateScoringRules } from "@/lib/actions/admin";
import { formatClock, parseClock } from "@/lib/attendance/score";

export type ScoringRulesValues = {
  workStart: string;
  lateGraceMinutes: number;
  scoreBase: number;
  deductAbsent: number;
  deductLate: number;
  deductExcused: number;
  deductLateExcused: number;
};

/** Company norms: office start time + grace (what counts as late) and the deduction points. */
export function ScoringRulesForm({ initial }: { initial: ScoringRulesValues }) {
  const { run, pending } = useServerAction();
  const [v, setV] = useState(initial);
  const set = <K extends keyof ScoringRulesValues>(key: K, value: ScoringRulesValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  const lateFrom = formatClock(parseClock(v.workStart || "00:00") + v.lateGraceMinutes + 1);
  // Example month: 1 unexplained absence + 2 unexplained lates.
  const example = Math.max(0, v.scoreBase - v.deductAbsent - 2 * v.deductLate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-4 text-brand" aria-hidden /> Office hours &amp; score rules
        </CardTitle>
        <CardDescription>
          Your company norms. Everyone starts each month at the base score; points are deducted for
          absences and late arrivals without an approved reason.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
            <AlarmClock className="size-4" aria-hidden /> Late arrival
          </legend>
          <div className="grid gap-1.5">
            <Label htmlFor="work-start">Office starts at</Label>
            <Input
              id="work-start"
              type="time"
              value={v.workStart}
              onChange={(e) => set("workStart", e.target.value)}
              className="h-9"
            />
          </div>
          <NumberField
            id="grace"
            label="Grace period (minutes)"
            value={v.lateGraceMinutes}
            onChange={(n) => set("lateGraceMinutes", Math.round(n))}
            max={240}
          />
          <motion.p
            key={lateFrom}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground sm:col-span-2"
          >
            A check-in at <strong className="text-foreground">{lateFrom}</strong> or later counts as
            late.
          </motion.p>
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-medium">Monthly score</legend>
          <NumberField
            id="base"
            label="Starting score"
            value={v.scoreBase}
            onChange={(n) => set("scoreBase", Math.round(n))}
            min={1}
            max={1000}
          />
          <NumberField
            id="d-absent"
            label="Absent (no reason / rejected)"
            value={v.deductAbsent}
            onChange={(n) => set("deductAbsent", n)}
            step={0.5}
          />
          <NumberField
            id="d-late"
            label="Late (no reason / rejected)"
            value={v.deductLate}
            onChange={(n) => set("deductLate", n)}
            step={0.5}
          />
          <NumberField
            id="d-excused"
            label="Absent, reason approved"
            value={v.deductExcused}
            onChange={(n) => set("deductExcused", n)}
            step={0.5}
          />
          <NumberField
            id="d-late-excused"
            label="Late, reason approved"
            value={v.deductLateExcused}
            onChange={(n) => set("deductLateExcused", n)}
            step={0.5}
          />
          <motion.p
            key={example}
            initial={{ scale: 0.97, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="self-end rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground"
          >
            Example: 1 unexplained absence + 2 late days →{" "}
            <strong className="font-mono text-foreground">
              {example}/{v.scoreBase}
            </strong>
          </motion.p>
        </fieldset>

        <Button
          className="w-fit"
          disabled={pending || !v.workStart}
          onClick={() => run("rules", () => updateScoringRules(v), { success: "Rules saved" })}
        >
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          Save rules
        </Button>
      </CardContent>
    </Card>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 1,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
        className="h-9"
      />
    </div>
  );
}
