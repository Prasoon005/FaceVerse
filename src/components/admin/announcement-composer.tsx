"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, Pin, PinOff, Send, Trash2, Users } from "lucide-react";
import { useState } from "react";

import { AnnouncementCard, priorityStyle } from "@/components/announcements/announcement-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { deleteAnnouncement, postAnnouncement, setAnnouncementPinned } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";
import type { AnnouncementPriority } from "@/types/database";

export type SentAnnouncement = {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  pinned: boolean;
  createdAt: string;
  recipientName: string | null;
  reads: number;
  audience: number;
};

const PRIORITIES: AnnouncementPriority[] = ["normal", "important", "urgent"];
const EVERYONE = "everyone";

/** Compose (with a live preview) and manage announcements. */
export function AnnouncementComposer({
  users,
  sent,
}: {
  users: { id: string; name: string; email: string }[];
  sent: SentAnnouncement[];
}) {
  const { run, busyKey } = useServerAction();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [pinned, setPinned] = useState(false);
  const [audience, setAudience] = useState(EVERYONE);

  function send() {
    run(
      "post",
      () =>
        postAnnouncement({
          title,
          body,
          priority,
          pinned,
          recipientId: audience === EVERYONE ? null : audience,
        }),
      {
        success: audience === EVERYONE ? "Sent to everyone" : "Message sent",
        onSuccess: () => {
          setTitle("");
          setBody("");
          setPinned(false);
          setPriority("normal");
        },
      },
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <section className="grid content-start gap-4 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">New announcement</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="ann-title">Title</Label>
          <Input
            id="ann-title"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Office closed on Friday"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ann-body">Message</Label>
          <Textarea
            id="ann-body"
            rows={5}
            value={body}
            maxLength={4000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the details here…"
          />
          <span className="text-right font-mono text-[10px] text-muted-foreground">
            {body.length}/4000
          </span>
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Priority</span>
          <div role="radiogroup" aria-label="Priority" className="grid grid-cols-3 gap-2">
            {PRIORITIES.map((p) => {
              const style = priorityStyle[p];
              const Icon = style.icon;
              const active = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "relative flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-brand text-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="priority-active"
                      className="absolute inset-0 -z-10 rounded-lg bg-brand/10"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  ) : null}
                  <Icon className="size-4" aria-hidden /> {style.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Important and urgent messages pop up on users&apos; screens right away.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ann-audience">Send to</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger id="ann-audience" className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EVERYONE}>Everyone</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 self-end rounded-lg border px-3 py-2">
            <Switch id="ann-pinned" checked={pinned} onCheckedChange={setPinned} />
            <Label htmlFor="ann-pinned">Pin to top</Label>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full sm:w-fit"
          disabled={!title.trim() || !body.trim() || busyKey === "post"}
          onClick={send}
        >
          <Send aria-hidden /> {audience === EVERYONE ? "Send to everyone" : "Send message"}
        </Button>
      </section>

      <section className="grid content-start gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Eye className="size-4" aria-hidden /> Live preview
        </h2>
        <motion.div layout>
          <AnnouncementCard
            title={title}
            body={body}
            priority={priority}
            pinned={pinned}
            createdAt={null}
            direct={audience !== EVERYONE}
            unread
          />
        </motion.div>

        <h2 className="mt-4 text-sm font-medium text-muted-foreground">Sent ({sent.length})</h2>
        {sent.length === 0 ? (
          <EmptyState title="Nothing sent yet" description="Your announcements appear here." />
        ) : (
          <ul className="grid gap-3">
            <AnimatePresence initial={false}>
              {sent.map((a) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <AnnouncementCard
                    title={a.title}
                    body={a.body}
                    priority={a.priority}
                    pinned={a.pinned}
                    createdAt={a.createdAt}
                    direct={a.recipientName !== null}
                    actions={
                      <>
                        <span className="flex min-w-40 flex-1 items-center gap-2 text-xs text-muted-foreground">
                          <Users className="size-3.5 shrink-0" aria-hidden />
                          {a.recipientName ? `To ${a.recipientName} · ` : ""}
                          Read by {a.reads}/{a.audience}
                          <Progress
                            value={a.audience ? (a.reads / a.audience) * 100 : 0}
                            className="h-1.5 max-w-24"
                          />
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyKey === `pin-${a.id}`}
                          onClick={() =>
                            run(
                              `pin-${a.id}`,
                              () => setAnnouncementPinned({ id: a.id, pinned: !a.pinned }),
                              { success: a.pinned ? "Unpinned" : "Pinned" },
                            )
                          }
                        >
                          {a.pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
                          {a.pinned ? "Unpin" : "Pin"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger-foreground"
                          disabled={busyKey === `del-${a.id}`}
                          onClick={() =>
                            run(`del-${a.id}`, () => deleteAnnouncement({ id: a.id }), {
                              success: "Announcement deleted",
                            })
                          }
                        >
                          <Trash2 aria-hidden /> Delete
                        </Button>
                      </>
                    }
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  );
}
