"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReviewStatus } from "@/types/database";

import { AskReasonDialog, type AskTarget } from "./ask-reason-dialog";

export type AbsentEntry = {
  userId: string;
  name: string;
  email: string;
  day: string;
  reviewStatus: ReviewStatus | null;
};

const statusText: Record<ReviewStatus, string> = {
  asked: "Asked, waiting",
  answered: "Replied",
  approved: "Excused",
  rejected: "Rejected",
};

/** Users absent on a day, each with an "Ask reason" action. */
export function AbsentList({ entries }: { entries: AbsentEntry[] }) {
  const [target, setTarget] = useState<AskTarget | null>(null);

  if (entries.length === 0) {
    return <EmptyState title="Nobody was absent" description="Everyone checked in." />;
  }

  return (
    <>
      <ul className="divide-y">
        <AnimatePresence initial={false}>
          {entries.map((e, i) => (
            <motion.li
              key={e.userId}
              layout
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04 } }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap items-center gap-3 py-2.5 text-sm"
            >
              <span className="size-2 rounded-full bg-danger" aria-hidden />
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-medium">{e.name}</span>
                <span className="truncate text-xs text-muted-foreground">{e.email}</span>
              </span>
              {e.reviewStatus ? (
                <Badge variant="outline">{statusText[e.reviewStatus]}</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTarget({ userId: e.userId, name: e.name, day: e.day })}
                >
                  <MessageCircleQuestion aria-hidden /> Ask reason
                </Button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <AskReasonDialog target={target} onClose={() => setTarget(null)} />
    </>
  );
}
