"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, LoaderCircle, ScanSearch, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { recognitionConfig } from "@/config/recognition";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { downloadZip } from "@/lib/data/albums";
import type { ShareFindResponse } from "@/app/api/share/[code]/find/route";

import { FindMeDialog } from "./find-me-dialog";
import { type GridPhoto, PhotoGrid } from "./photo-grid";

/** Guest view: browse the album and "Find me" with a selfie, then download your photos. */
export function SharedAlbum({
  code,
  title,
  photos,
}: {
  code: string;
  title: string;
  photos: GridPhoto[];
}) {
  const { play } = useSoundFeedback();
  const [findOpen, setFindOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GridPhoto[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [zipping, setZipping] = useState<string | null>(null);
  const byId = new Map(photos.map((p) => [p.id, p]));

  async function onEmbedding(embedding: Float32Array) {
    setSearching(true);
    try {
      const res = await fetch(`/api/share/${code}/find`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedding: Array.from(embedding) }),
      });
      const body = (await res.json()) as ShareFindResponse;
      if (!body.ok) throw new Error(body.message);
      const found = body.matches.flatMap((m) => {
        const p = byId.get(m.photoId);
        if (!p) return [];
        const sure = m.similarity >= recognitionConfig.face.match;
        return [
          {
            ...p,
            box: m.box,
            badge: `${Math.round(m.similarity * 100)}% ${sure ? "match" : "possible"}`,
          },
        ];
      });
      setResults(found);
      setSelected(new Set(found.map((f) => f.id)));
      setFindOpen(false);
      play(found.length ? "recognized" : "unknown");
    } catch (err) {
      toast.error("Search failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSearching(false);
    }
  }

  async function zip(list: GridPhoto[], name: string) {
    const withUrls = list.filter((p) => p.url);
    if (!withUrls.length) return;
    setZipping(`0/${withUrls.length}`);
    try {
      await downloadZip(
        name,
        withUrls.map((p, i) => ({
          url: p.url!,
          filename: `photo-${String(i + 1).padStart(3, "0")}.jpg`,
        })),
        (d, t) => setZipping(`${d}/${t}`),
      );
    } catch {
      toast.error("Couldn't build the ZIP.");
    } finally {
      setZipping(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card/80 p-4 backdrop-blur">
        <div className="grid flex-1 gap-0.5">
          <p className="font-medium">Were you at this event?</p>
          <p className="text-sm text-muted-foreground">
            Take a selfie and we&apos;ll show every photo you&apos;re in. {photos.length} photos.
          </p>
        </div>
        <Button size="lg" onClick={() => setFindOpen(true)} disabled={photos.length === 0}>
          <ScanSearch aria-hidden /> Find me
        </Button>
      </div>

      <AnimatePresence>
        {results ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">
                You&apos;re in {results.length} photo{results.length === 1 ? "" : "s"}
              </h2>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  disabled={!selected.size || zipping !== null}
                  onClick={() =>
                    void zip(
                      results.filter((r) => selected.has(r.id)),
                      `${title}-me`,
                    )
                  }
                >
                  {zipping ? (
                    <LoaderCircle className="animate-spin" aria-hidden />
                  ) : (
                    <Download aria-hidden />
                  )}
                  {zipping ? `Zipping ${zipping}` : `Download ${selected.size}`}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setResults(null)}>
                  <X aria-hidden /> Close
                </Button>
              </div>
            </div>
            {results.length ? (
              <PhotoGrid
                photos={results}
                selected={selected}
                onToggle={(id) =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No photos found. Try a clearer selfie.
              </p>
            )}
          </motion.section>
        ) : null}
      </AnimatePresence>

      {photos.length === 0 ? (
        <EmptyState title="No photos yet" description="The organiser hasn't uploaded photos yet." />
      ) : (
        <PhotoGrid
          photos={photos}
          onOpen={(p) => p.url && window.open(p.url, "_blank", "noopener")}
        />
      )}

      <FindMeDialog
        open={findOpen}
        onOpenChange={setFindOpen}
        onEmbedding={onEmbedding}
        searching={searching}
      />
    </div>
  );
}
