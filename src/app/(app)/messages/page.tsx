import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChatThread } from "@/components/messages/chat-thread";
import { getViewer } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Messages" };

/** The member's chat with the admin team. */
export default async function MessagesPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return (
    <ChatThread
      threadUserId={viewer.user.id}
      viewerId={viewer.user.id}
      emptyText="Send a message to your admin team. They'll reply here."
      header={
        <>
          <span className="grid size-10 place-items-center rounded-full bg-brand/15 text-brand">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div className="grid">
            <span className="font-semibold">Admin team</span>
            <span className="text-xs text-muted-foreground">
              Usually replies during office hours
            </span>
          </div>
        </>
      }
    />
  );
}
