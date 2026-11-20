"use client";

import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { listTypeLabels, type PersonInput } from "@/lib/validations/person";

import type { CapturedSample } from "./face-capture-step";

export function ReviewStep({
  details,
  existingName,
  samples,
  defaultSaveAvatar,
  saving,
  onBack,
  onSave,
}: {
  details: PersonInput | null;
  existingName?: string;
  samples: CapturedSample[];
  defaultSaveAvatar: boolean;
  saving: boolean;
  onBack: () => void;
  onSave: (opts: { saveAvatar: boolean }) => void;
}) {
  const [saveAvatar, setSaveAvatar] = useState(defaultSaveAvatar);

  return (
    <div className="grid max-w-2xl gap-6">
      <div className="grid gap-3 rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground">Person</h3>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold">{details?.name ?? existingName}</p>
          {details?.label ? (
            <Badge variant="secondary" className="capitalize">
              {details.label}
            </Badge>
          ) : null}
          {details && details.listType !== "none" ? (
            <Badge variant="outline">{listTypeLabels[details.listType]}</Badge>
          ) : null}
          {details?.linkToMe ? <Badge variant="outline">Linked to my account</Badge> : null}
        </div>
        {details?.notes ? <p className="text-sm text-muted-foreground">{details.notes}</p> : null}
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground">
          Face samples <span className="font-mono">({samples.length})</span>
        </h3>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {samples.map((s, i) => (
            <li key={s.previewUrl} className="grid gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img
                src={s.previewUrl}
                alt={`Sample ${i + 1}`}
                className="aspect-square rounded-lg border object-cover"
              />
              <span className="text-center font-mono text-xs text-muted-foreground">
                {Math.round(s.quality * 100)}%
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="saveAvatar"
            checked={saveAvatar}
            onCheckedChange={(v) => setSaveAvatar(v === true)}
            className="mt-0.5"
          />
          <div className="grid gap-0.5">
            <Label htmlFor="saveAvatar">Save the first sample as profile photo</Label>
            <p className="text-xs text-muted-foreground">
              A small compressed thumbnail in private storage. Untick to store embeddings only.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack} disabled={saving}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        <Button onClick={() => onSave({ saveAvatar })} disabled={saving}>
          {saving ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          Save enrollment
        </Button>
      </div>
    </div>
  );
}
