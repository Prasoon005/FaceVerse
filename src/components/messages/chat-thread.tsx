"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCheck, LoaderCircle, MessageCircle, Send } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { listThread, markThreadRead, messageKeys, sendMessage } from "@/lib/data/messages";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/database";

const time = (iso: string) =>
  new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short" }).format(
    d,
  );
};

/**
 * A live chat thread (WhatsApp-style bubbles, day separators, read ticks). Enter sends,
 * Shift+Enter adds a new line. New messages arrive through Supabase Realtime with a chime.
 */
export function ChatThread({
  threadUserId,
  viewerId,
  header,
  emptyText,
}: {
  threadUserId: string;
  viewerId: string;
  header: ReactNode;
  emptyText: string;
}) {
  const queryClient = useQueryClient();
  const { play } = useSoundFeedback();
  const key = messageKeys.thread(threadUserId);
  const { data: messages = [], isPending } = useQuery({
    queryKey: key,
    queryFn: () => listThread(threadUserId),
  });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Live updates for this thread.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`thread-${threadUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `thread_user_id=eq.${threadUserId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const msg = payload.new as Message;
            queryClient.setQueryData<Message[]>(key, (prev = []) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
            );
            if (msg.sender_id !== viewerId) play("recognized");
          } else {
            void queryClient.invalidateQueries({ queryKey: key });
          }
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          void queryClient.invalidateQueries({ queryKey: messageKeys.inbox() });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key derives from threadUserId
  }, [threadUserId, viewerId, queryClient, play]);

  // Scroll to the newest message and mark the other side's messages as read.
  const unreadFromOther = messages.some((m) => m.sender_id !== viewerId && !m.read_at);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);
  useEffect(() => {
    if (!unreadFromOther) return;
    void markThreadRead(threadUserId, viewerId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: messageKeys.inbox() });
    });
  }, [unreadFromOther, threadUserId, viewerId, queryClient]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(threadUserId, body);
      queryClient.setQueryData<Message[]>(key, (prev = []) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      setText("");
      play("step");
    } catch (err) {
      play("error");
      toast.error("Couldn't send", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-card md:h-[calc(100dvh-10rem)]">
      <div className="flex items-center gap-3 border-b px-4 py-3">{header}</div>

      <div className="flex-1 overflow-y-auto bg-muted/20 px-3 py-4 sm:px-4" aria-live="polite">
        {isPending ? (
          <div className="grid gap-3">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="grid justify-items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="size-8" aria-hidden />
              {emptyText}
            </div>
          </div>
        ) : (
          <ul className="grid gap-1.5">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                const mine = m.sender_id === viewerId;
                const prev = messages[i - 1];
                const newDay =
                  !prev ||
                  new Date(prev.created_at).toDateString() !==
                    new Date(m.created_at).toDateString();
                return (
                  <motion.li
                    key={m.id}
                    layout="position"
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="grid gap-1.5"
                  >
                    {newDay ? (
                      <span className="mx-auto my-2 rounded-full bg-background px-3 py-0.5 text-[11px] text-muted-foreground shadow-sm">
                        {dayLabel(m.created_at)}
                      </span>
                    ) : null}
                    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%]",
                          mine
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md bg-background",
                        )}
                      >
                        <p className="break-words whitespace-pre-wrap">{m.body}</p>
                        <span
                          className={cn(
                            "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
                            mine ? "text-primary-foreground/70" : "text-muted-foreground",
                          )}
                        >
                          {time(m.created_at)}
                          {mine ? (
                            m.read_at ? (
                              <CheckCheck className="size-3" aria-label="Read" />
                            ) : (
                              <Check className="size-3" aria-label="Sent" />
                            )
                          ) : null}
                        </span>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Type a message…"
          aria-label="Message"
          className="max-h-32 min-h-10 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || sending}
          aria-label="Send message"
        >
          {sending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        </Button>
      </form>
    </div>
  );
}
