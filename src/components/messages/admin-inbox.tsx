"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { PersonAvatar } from "@/components/people/person-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listInbox, messageKeys } from "@/lib/data/messages";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ChatThread } from "./chat-thread";

/**
 * Admin inbox: every member on the left (latest message, unread badge), the chat on the right.
 * On phones the list and the chat take turns.
 */
export function AdminInbox({ adminId }: { adminId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("user");
  const [query, setQuery] = useState("");
  const { data = [], isPending } = useQuery({
    queryKey: messageKeys.inbox(),
    queryFn: listInbox,
    refetchInterval: 60_000,
  });
  const q = query.trim().toLowerCase();
  const threads = data.filter((t) => !q || t.name.toLowerCase().includes(q));
  const current = data.find((t) => t.userId === selected) ?? null;

  return (
    <div className="grid gap-4 md:grid-cols-[300px_1fr]">
      <aside className={cn("grid content-start gap-3", selected && "hidden md:grid")}>
        <div className="relative">
          <Search
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users…"
            aria-label="Search users"
            className="h-9 pl-8"
          />
        </div>
        {isPending ? (
          <div className="grid gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          <ul className="grid max-h-[calc(100dvh-14rem)] gap-1 overflow-y-auto">
            {threads.map((t, i) => (
              <motion.li
                key={t.userId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
              >
                <Link
                  href={`/admin/messages?user=${t.userId}`}
                  scroll={false}
                  className={cn(
                    "flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted",
                    t.userId === selected && "bg-brand/10",
                  )}
                >
                  <PersonAvatar name={t.name} url={null} className="size-10" />
                  <span className="grid min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm",
                          t.unread ? "font-semibold" : "font-medium",
                        )}
                      >
                        {t.name}
                      </span>
                      {t.lastAt ? (
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                          {formatRelative(t.lastAt)}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-xs",
                          t.unread ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {t.lastMessage
                          ? `${t.lastFromMember ? "" : "You: "}${t.lastMessage}`
                          : "No messages yet"}
                      </span>
                      {t.unread ? (
                        <span className="ml-auto grid min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {t.unread}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </aside>

      <section className={cn(!selected && "hidden md:block")}>
        {selected ? (
          <ChatThread
            key={selected}
            threadUserId={selected}
            viewerId={adminId}
            emptyText={`Start the conversation with ${current?.name ?? "this user"}.`}
            header={
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="md:hidden"
                  aria-label="Back to conversations"
                  onClick={() => router.push("/admin/messages", { scroll: false })}
                >
                  <ArrowLeft aria-hidden />
                </Button>
                <PersonAvatar name={current?.name ?? "User"} url={null} className="size-10" />
                <div className="grid min-w-0">
                  <span className="truncate font-semibold">{current?.name ?? "User"}</span>
                  <Link
                    href={`/admin/users/${selected}`}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    View profile
                  </Link>
                </div>
              </>
            }
          />
        ) : (
          <div className="grid h-[calc(100dvh-10rem)] min-h-[420px] place-items-center rounded-2xl border bg-card text-sm text-muted-foreground">
            Pick a user to start chatting.
          </div>
        )}
      </section>
    </div>
  );
}
