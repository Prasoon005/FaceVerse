"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Check, ScanFace, X } from "lucide-react";
import { useState } from "react";

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
import { reviewEnrollment } from "@/lib/actions/admin";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApprovalStatus } from "@/types/database";

export type ApprovalItem = {
  personId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  faceSamples: number;
  voiceSamples: number;
  createdAt: string;
  status: ApprovalStatus;
  note: string | null;
};

const statusBadge: Record<ApprovalStatus, string> = {
  pending: "border-warning/40 text-warning-foreground",
  approved: "border-success/40 text-success-foreground",
  rejected: "border-danger/40 text-danger-foreground",
};

/** Self-enrollment queue with approve / reject (with an optional note). */
export function ApprovalQueue({ items }: { items: ApprovalItem[] }) {
  const { run, busyKey } = useServerAction();
  const [tab, setTab] = useState<ApprovalStatus>("pending");
  const [rejecting, setRejecting] = useState<ApprovalItem | null>(null);
  const [note, setNote] = useState("");
  const visible = items.filter((i) => i.status === tab);
  const count = (s: ApprovalStatus) => items.filter((i) => i.status === s).length;

  return (
    <div className="grid gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as ApprovalStatus)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({count("pending")})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({count("approved")})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({count("rejected")})</TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState
          title={tab === "pending" ? "Nothing to review" : `No ${tab} enrollments`}
          description={
            tab === "pending"
              ? "New self-enrollments appear here live."
              : "Enrollments move here once reviewed."
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((item) => (
              <motion.li
                key={item.personId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                className="grid gap-3 rounded-xl border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <PersonAvatar name={item.name} url={item.avatarUrl} className="size-14" />
                  <div className="grid min-w-0 flex-1">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(item.createdAt)}
                    </span>
                  </div>
                  <Badge variant="outline" className={cn("capitalize", statusBadge[item.status])}>
                    {item.status}
                  </Badge>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ScanFace className="size-3.5" aria-hidden /> {item.faceSamples} face
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <AudioLines className="size-3.5" aria-hidden /> {item.voiceSamples} voice
                  </span>
                </div>
                {item.note ? (
                  <p className="text-xs text-muted-foreground">Note: {item.note}</p>
                ) : null}
                <div className="flex gap-2">
                  {item.status !== "approved" ? (
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={busyKey === item.personId || item.faceSamples === 0}
                      onClick={() =>
                        run(
                          item.personId,
                          () => reviewEnrollment({ personId: item.personId, approve: true }),
                          { success: `${item.name} approved` },
                        )
                      }
                    >
                      <Check aria-hidden /> Approve
                    </Button>
                  ) : null}
                  {item.status !== "rejected" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={busyKey === item.personId}
                      onClick={() => {
                        setNote("");
                        setRejecting(item);
                      }}
                    >
                      <X aria-hidden /> Reject
                    </Button>
                  ) : null}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejecting?.name}&apos;s enrollment?</DialogTitle>
            <DialogDescription>
              They won&apos;t be able to mark attendance or use biometric login until they re-enroll
              and you approve it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reject-note">Reason for the user (optional)</Label>
            <Textarea
              id="reject-note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Photo is too dark, please re-enroll in good light."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejecting) return;
                const item = rejecting;
                run(
                  item.personId,
                  () =>
                    reviewEnrollment({
                      personId: item.personId,
                      approve: false,
                      note: note || undefined,
                    }),
                  { success: `${item.name} rejected`, onSuccess: () => setRejecting(null) },
                );
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
