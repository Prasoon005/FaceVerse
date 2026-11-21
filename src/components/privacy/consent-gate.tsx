"use client";

import { motion } from "framer-motion";
import { Check, Eye, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const POINTS = [
  {
    icon: Eye,
    title: "What is stored",
    text: "Face and voice embeddings (lists of numbers, not photos) and one small thumbnail per person. Album and visitor photos only where you upload them.",
  },
  {
    icon: ShieldCheck,
    title: "Why",
    text: "To recognise people you enrolled, mark attendance, sign you in with face + voice and find you in album photos. Analysis runs on your device.",
  },
  {
    icon: Trash2,
    title: "Your control",
    text: "Export your data or delete all your biometrics any time in Settings → Privacy.",
  },
];

/**
 * PROJECT_SPEC §9: explicit consent before the first enrollment. Shows the children once
 * consent_given_at is set.
 */
export function ConsentGate({ consented, children }: { consented: boolean; children: ReactNode }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(consented);

  if (done) return <>{children}</>;

  async function accept() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id;
      if (!id) throw new Error("Please sign in again.");
      const { error } = await supabase
        .from("profiles")
        .update({ consent_given_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("audit_logs").insert({ actor_id: id, action: "privacy.consent" });
      setDone(true);
      router.refresh();
    } catch (err) {
      toast.error("Couldn't save your consent", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid max-w-2xl gap-5 rounded-2xl border bg-card p-6"
    >
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold">Before you enroll anyone</h2>
        <p className="text-sm text-muted-foreground">
          Biometric data is sensitive. Please read how FaceVerse uses it.
        </p>
      </div>
      <ul className="grid gap-3">
        {POINTS.map((p, i) => (
          <motion.li
            key={p.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * i }}
            className="flex gap-3"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
              <p.icon className="size-4" aria-hidden />
            </span>
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{p.title}</span>
              <span className="text-sm text-muted-foreground">{p.text}</span>
            </span>
          </motion.li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        FaceVerse is a learning project, not production-grade biometric security. Only enroll people
        who have agreed to it. See the{" "}
        <Link href="/settings/privacy" className="underline underline-offset-4">
          privacy settings
        </Link>
        .
      </p>
      <div className="flex items-start gap-3">
        <Checkbox
          id="consent"
          checked={agreed}
          onCheckedChange={(v) => setAgreed(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="consent" className="leading-snug">
          I understand and agree, and I have consent from everyone I enroll.
        </Label>
      </div>
      <Button className="w-fit" disabled={!agreed || saving} onClick={() => void accept()}>
        {saving ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}
        Agree and continue
      </Button>
    </motion.section>
  );
}
