"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, FileText, Hourglass, ImageIcon, X } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { decideAbsence } from "@/lib/actions/admin";
import { formatDay, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/types/database";

export type ReviewItem = {
  id: string;
  name: string;
  email: string;
  day: string;
  status: ReviewStatus;
  question: string | null;
  reason: string | null;
  proofUrl: string | null;
  proofIsPdf: boolean;
  decisionNote: string | null;
  askedAt: string | null;
  answeredAt: string | null;
  decidedAt: string | null;
};

type Tab = "answered" | "asked" | "decided";

const statusBadge: Record<ReviewStatus, { label: string; className: string }> = {
  asked: { label: "Waiting for user", className: "border-warning/40 text-warning-foreground" },
  answered: { label: "Replied", className: "border-brand/40 text-brand" },
  approved: { label: "Excused", className: "border-success/40 text-success-foreground" },
  rejected: { label: "Rejected", className: "border-danger/40 text-danger-foreground" },
};

/** Absence reviews by stage, with approve / reject and a note for answered ones. */
export function ReviewBoard({ items }: { items: ReviewItem[] }) {
  const [tab, setTab] = useState<Tab>("answered");
  const inTab = (i: ReviewItem) =>
    tab === "decided" ? i.status === "approved" || i.status === "rejected" : i.status === tab;
  const visible = items.filter(inTab);
  const count = (t: Tab) =>
    items.filter((i) =>
      t === "decided" ? i.status === "approved" || i.status === "rejected" : i.status === t,
    ).length;

  return (
    <div className="grid gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="answered">To decide ({count("answered")})</TabsTrigger>
          <TabsTrigger value="asked">Waiting for reply ({count("asked")})</TabsTrigger>
          <TabsTrigger value="decided">Decided ({count("decided")})</TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState
          title={tab === "answered" ? "No replies to decide" : "Nothing here"}
          description={
            tab === "answered"
              ? "When users reply with a reason, it shows up here live."
              : "Ask for a reason from the overview or the attendance report."
          }
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              >
                <ReviewCard item={item} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const { run, pending } = useServerAction();
  const [note, setNote] = useState("");
  const badge = statusBadge[item.status];

  return (
    <article className="grid gap-3 rounded-xl border bg-card p-4">
      <header className="flex flex-wrap items-center gap-2">
        <div className="grid min-w-0 flex-1">
          <span className="truncate font-medium">{item.name}</span>
          <span className="truncate text-xs text-muted-foreground">{item.email}</span>
        </div>
        <Badge variant="outline" className={cn(badge.className)}>
          {badge.label}
        </Badge>
      </header>
      <p className="text-sm">
        Absent on <span className="font-medium">{formatDay(item.day, { weekday: "long" })}</span>
      </p>
      {item.question ? (
        <p className="rounded-lg bg-muted/50 p-2 text-sm text-muted-foreground">
          You asked: {item.question}
        </p>
      ) : null}
      {item.reason ? (
        <blockquote className="border-l-2 border-brand pl-3 text-sm">
          {item.reason}
          <span className="mt-1 block text-xs text-muted-foreground">
            {item.question ? "Replied" : "Explained without being asked"}{" "}
            {formatRelative(item.answeredAt)}
          </span>
        </blockquote>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hourglass className="size-4" aria-hidden /> Waiting for a reply (asked{" "}
          {formatRelative(item.askedAt)})
        </p>
      )}
      {item.proofUrl ? (
        <a
          href={item.proofUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
        >
          {item.proofIsPdf ? (
            <FileText className="size-4" aria-hidden />
          ) : (
            <ImageIcon className="size-4" aria-hidden />
          )}
          View proof
        </a>
      ) : null}
      {item.decisionNote ? (
        <p className="text-xs text-muted-foreground">Decision note: {item.decisionNote}</p>
      ) : null}

      {item.status === "answered" ? (
        <div className="grid gap-2 border-t pt-3">
          <Label htmlFor={`note-${item.id}`} className="text-xs">
            Note to the user (optional)
          </Label>
          <Textarea
            id={`note-${item.id}`}
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={pending}
              onClick={() =>
                run(item.id, () => decideAbsence({ reviewId: item.id, approve: true, note }), {
                  success: `Excused ${item.name}'s absence`,
                })
              }
            >
              <Check aria-hidden /> Approve (excused)
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={pending}
              onClick={() =>
                run(item.id, () => decideAbsence({ reviewId: item.id, approve: false, note }), {
                  success: `Rejected ${item.name}'s reason`,
                })
              }
            >
              <X aria-hidden /> Reject
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
