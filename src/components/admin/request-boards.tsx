"use client";

import { decideIdentityChange, decideLeave } from "@/lib/actions/admin";

import { DecisionBoard, type DecisionItem } from "./decision-board";

/** Leave requests queue for admins. */
export function LeaveBoard({ items }: { items: DecisionItem[] }) {
  return (
    <DecisionBoard
      items={items}
      tabs={[
        { value: "pending", label: "To decide", statuses: ["pending"] },
        { value: "approved", label: "Approved", statuses: ["approved"] },
        { value: "closed", label: "Rejected / cancelled", statuses: ["rejected", "cancelled"] },
      ]}
      decide={({ id, approve, note }) => decideLeave({ requestId: id, approve, note })}
      approveHint="Those days show as “On leave” instead of absent."
      emptyText="New leave requests appear here live."
    />
  );
}

/** Identity change requests queue for admins. */
export function ChangeRequestBoard({ items }: { items: DecisionItem[] }) {
  return (
    <DecisionBoard
      items={items}
      tabs={[
        { value: "pending", label: "To decide", statuses: ["pending"] },
        { value: "approved", label: "Unlocked", statuses: ["approved", "completed"] },
        { value: "closed", label: "Rejected / withdrawn", statuses: ["rejected", "cancelled"] },
      ]}
      decide={({ id, approve, note }) => decideIdentityChange({ requestId: id, approve, note })}
      approveLabel="Approve & unlock"
      approveHint="Their identity unlocks once: they re-enroll, it locks again and comes back to Approvals."
      emptyText="When a user asks to change their face or voice, it appears here."
    />
  );
}
