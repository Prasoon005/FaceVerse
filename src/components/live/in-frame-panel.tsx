import { CircleHelp, UserX, Users } from "lucide-react";
import Link from "next/link";

import type { OverlayFace } from "@/components/camera/face-overlay";
import { PersonAvatar } from "@/components/people/person-avatar";
import { ConfidenceRing } from "@/components/shared/confidence-ring";
import type { PersonListItem } from "@/lib/data/people";

/** Side panel: who is in frame right now, plus uncertain and unknown counts. */
export function InFramePanel({
  faces,
  people,
}: {
  faces: OverlayFace[];
  people: PersonListItem[];
}) {
  const byName = new Map(people.map((p) => [p.name, p]));
  // One row per recognised person (the same person can't sensibly appear twice).
  const recognised = new Map<string, OverlayFace>();
  for (const f of faces) {
    if (f.status !== "match" || !f.label) continue;
    const existing = recognised.get(f.label);
    if (!existing || (f.similarity ?? 0) > (existing.similarity ?? 0)) recognised.set(f.label, f);
  }
  const uncertain = faces.filter((f) => f.status === "uncertain").length;
  const unknown = faces.filter((f) => f.status === "unknown").length;

  return (
    <aside className="grid content-start gap-4 rounded-xl border bg-card p-4" aria-label="In frame">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat icon={Users} label="Faces" value={faces.length} />
        <Stat
          icon={CircleHelp}
          label="Uncertain"
          value={uncertain}
          tone="text-warning-foreground"
        />
        <Stat icon={UserX} label="Unknown" value={unknown} tone="text-danger-foreground" />
      </div>

      <div className="grid gap-2">
        <h2 className="text-sm font-medium">In frame now</h2>
        {recognised.size === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            {faces.length === 0 ? "No faces in view." : "No one recognised yet."}
          </p>
        ) : (
          <ul className="grid gap-1" aria-live="polite">
            {[...recognised.values()].map((f) => {
              const person = byName.get(f.label!);
              return (
                <li key={f.label}>
                  <Link
                    href={person ? `/people/${person.id}` : "/people"}
                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-muted"
                  >
                    <PersonAvatar name={f.label!} url={person?.avatarUrl ?? null} />
                    <span className="flex-1 truncate font-medium">{f.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {Math.round((f.similarity ?? 0) * 100)}%
                    </span>
                    <ConfidenceRing value={f.similarity ?? null} status="match" size={22} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="grid gap-1 rounded-lg bg-muted/50 p-2">
      <Icon className={`mx-auto size-4 ${tone ?? "text-muted-foreground"}`} aria-hidden />
      <span className="font-mono text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
