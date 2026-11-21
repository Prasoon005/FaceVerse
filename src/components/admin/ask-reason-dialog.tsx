"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { askAbsenceReason } from "@/lib/actions/admin";
import { formatDay } from "@/lib/format";

export type AskTarget = { userId: string; name: string; day: string };

/** Admin asks a user why they were absent; the user is notified live. */
export function AskReasonDialog({
  target,
  onClose,
}: {
  target: AskTarget | null;
  onClose: () => void;
}) {
  const { run, pending } = useServerAction();
  const [question, setQuestion] = useState("");

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {target ? (
          <>
            <DialogHeader>
              <DialogTitle>Ask {target.name} for a reason</DialogTitle>
              <DialogDescription>
                Absent on {formatDay(target.day, { weekday: "long" })}. They&apos;ll get a
                notification and can reply with a reason and proof.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="ask-question">Message (optional)</Label>
              <Textarea
                id="ask-question"
                rows={3}
                maxLength={500}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="You were marked absent on this day. Please share the reason."
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose} disabled={pending}>
                Cancel
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  run(
                    "ask",
                    () =>
                      askAbsenceReason({
                        userId: target.userId,
                        day: target.day,
                        question: question || undefined,
                      }),
                    {
                      success: `Asked ${target.name} for a reason`,
                      onSuccess: () => {
                        setQuestion("");
                        onClose();
                      },
                    },
                  )
                }
              >
                {pending ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : (
                  <Send aria-hidden />
                )}
                Send
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
