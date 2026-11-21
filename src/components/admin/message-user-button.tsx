"use client";

import { MessageSquarePlus, Send } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { postAnnouncement } from "@/lib/actions/admin";

/** Sends a private announcement to one user (pops up for them if marked important). */
export function MessageUserButton({ userId, name }: { userId: string; name: string }) {
  const { run, busyKey } = useServerAction();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [important, setImportant] = useState(true);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <MessageSquarePlus aria-hidden /> Message
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {name}</DialogTitle>
            <DialogDescription>Only {name} sees this, in their announcements.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="msg-title">Title</Label>
              <Input
                id="msg-title"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="msg-body">Message</Label>
              <Textarea
                id="msg-body"
                rows={4}
                value={body}
                maxLength={4000}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="msg-important" checked={important} onCheckedChange={setImportant} />
              <Label htmlFor="msg-important">Pop up on their screen</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || !body.trim() || busyKey === "msg"}
              onClick={() =>
                run(
                  "msg",
                  () =>
                    postAnnouncement({
                      title,
                      body,
                      priority: important ? "important" : "normal",
                      pinned: false,
                      recipientId: userId,
                    }),
                  {
                    success: `Message sent to ${name}`,
                    onSuccess: () => {
                      setOpen(false);
                      setTitle("");
                      setBody("");
                    },
                  },
                )
              }
            >
              <Send aria-hidden /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
