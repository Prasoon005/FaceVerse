"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatDay, formatRelative } from "@/lib/format";
import type { AbsenceReview } from "@/types/database";

import { AbsenceAnswerDialog } from "./absence-answer-dialog";

/** Admin questions waiting for the user's answer, shown at the top of the attendance page. */
export function AbsenceQuestions({
  reviews,
  userId,
}: {
  reviews: AbsenceReview[];
  userId: string;
}) {
  const [answering, setAnswering] = useState<AbsenceReview | null>(null);

  return (
    <>
      <AnimatePresence initial={false}>
        {reviews.map((review) => (
          <motion.div
            key={review.id}
            layout
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/50 bg-warning/5 p-4"
            role="status"
          >
            <span className="relative grid size-9 place-items-center rounded-full bg-warning/15 text-warning-foreground">
              <MessageCircleQuestion className="size-5" aria-hidden />
              <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-ping rounded-full bg-warning" />
            </span>
            <div className="grid min-w-0 flex-1 gap-0.5">
              <p className="text-sm font-medium">
                Your admin asked about {formatDay(review.day, { weekday: "long" })}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {review.question} · {formatRelative(review.asked_at)}
              </p>
            </div>
            <Button size="sm" onClick={() => setAnswering(review)}>
              Answer
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
      {answering ? (
        <AbsenceAnswerDialog
          key={answering.id}
          open
          onOpenChange={(open) => !open && setAnswering(null)}
          userId={userId}
          day={answering.day}
          question={answering.question}
          initialReason={answering.reason}
        />
      ) : null}
    </>
  );
}
