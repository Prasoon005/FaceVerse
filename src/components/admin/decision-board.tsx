"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { type ReactNode, useState } from "react";

import { PersonAvatar } from "@/components/people/person-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import type { ActionResult } from "@/lib/actions/admin";
import { formatRelative } from "@/lib/format";
import { fireConfetti } from "@/lib/ui/confetti";
import { cn } from "@/lib/utils";

export type DecisionItem = {
  id: string;
  status: string;
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  createdAt: string;
  title: ReactNode;
  body: ReactNode;
  decisionNote: string | null;
};

const statusTone: Record<string, string> = {
  pending: "border-warning/40 text-warning-foreground",
  approved: "border-success/40 text-success-foreground",
  completed: "border-brand/40 text-brand",
  rejected: "border-danger/40 text-danger-foreground",
  cancelled: "text-muted-foreground",
};

/**
 * A tabbed queue of user requests (leave, identity changes) with approve / reject and an
 * optional note for the user. Cards animate out as they're decided.
 */
export function DecisionBoard({
  items,
  tabs,
  decide,
  approveLabel = "Approve",
  approveHint,
  emptyText,
}: {
  items: DecisionItem[];
  tabs: { value: string; label: string; statuses: string[] }[];
  decide: (input: { id: string; approve: boolean; note?: string }) => Promise<ActionResult>;
  approveLabel?: string;
  approveHint?: string;
  emptyText: string;
}) {
  const { run, busyKey } = useServerAction();
  const [tab, setTab] = useState(tabs[0]!.value);
  const [deciding, setDeciding] = useState<{ item: DecisionItem; approve: boolean } | null>(null);
  const [note, setNote] = useState("");
  const current = tabs.find((t) => t.value === tab) ?? tabs[0]!;
  const visible = items.filter((i) => current.statuses.includes(i.status));

  return (
    <div className="grid gap-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="max-w-full justify-start overflow-x-auto">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label} ({items.filter((i) => t.statuses.includes(i.status)).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState title="Nothing here" description={emptyText} />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                className="hover-lift grid gap-3 rounded-xl border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <PersonAvatar
                    name={item.userName}
                    url={item.avatarUrl ?? null}
                    className="size-10"
                  />
                  <div className="grid min-w-0 flex-1">
                    <span className="truncate font-medium">{item.userName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.userEmail} · {formatRelative(item.createdAt)}
                    </span>
                  </div>
                  <Badge variant="outline" className={cn("capitalize", statusTone[item.status])}>
                    {item.status}
                  </Badge>
                </div>
                <div className="grid gap-1">
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.body}</div>
                </div>
                {item.decisionNote ? (
                  <p className="text-xs text-muted-foreground">Note: {item.decisionNote}</p>
                ) : null}
                {item.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={busyKey === item.id}
                      onClick={() => {
                        setNote("");
                        setDeciding({ item, approve: true });
                      }}
                    >
                      <Check aria-hidden /> {approveLabel}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={busyKey === item.id}
                      onClick={() => {
                        setNote("");
                        setDeciding({ item, approve: false });
                      }}
                    >
                      <X aria-hidden /> Reject
                    </Button>
                  </div>
                ) : null}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Dialog open={deciding !== null} onOpenChange={(open) => (open ? null : setDeciding(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deciding?.approve ? approveLabel : "Reject"} {deciding?.item.userName}&apos;s
              request?
            </DialogTitle>
            <DialogDescription>
              {deciding?.approve
                ? (approveHint ?? "The user is notified right away.")
                : "The user is notified and can see your note."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="decision-note">Note for the user (optional)</Label>
            <Textarea
              id="decision-note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeciding(null)}>
              Cancel
            </Button>
            <Button
              variant={deciding?.approve ? "default" : "destructive"}
              onClick={() => {
                if (!deciding) return;
                const { item, approve } = deciding;
                run(item.id, () => decide({ id: item.id, approve, note: note || undefined }), {
                  success: approve ? "Approved" : "Rejected",
                  onSuccess: () => {
                    if (approve) fireConfetti({ count: 80 });
                    setDeciding(null);
                  },
                });
              }}
            >
              {deciding?.approve ? approveLabel : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
