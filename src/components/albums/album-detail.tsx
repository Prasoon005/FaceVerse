"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  Copy,
  Download,
  Globe,
  ImagePlus,
  LoaderCircle,
  ScanSearch,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ModelLoader } from "@/components/camera/model-loader";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { recognitionConfig } from "@/config/recognition";
import { useFaceEngine } from "@/hooks/use-face-engine";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import {
  albumKeys,
  deleteAlbum,
  deletePhoto,
  downloadZip,
  findInAlbum,
  type FoundPhoto,
  getAlbum,
  setAlbumPublic,
  type UploadStage,
  uploadAlbumPhoto,
} from "@/lib/data/albums";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

import { FindMeDialog } from "./find-me-dialog";
import { type GridPhoto, PhotoGrid } from "./photo-grid";

type UploadItem = { id: string; name: string; stage: UploadStage; faces?: number; error?: string };

const stageLabel: Record<UploadStage, string> = {
  compressing: "Compressing",
  detecting: "Finding faces",
  uploading: "Uploading",
  done: "Done",
  error: "Failed",
};
const stageProgress: Record<UploadStage, number> = {
  compressing: 20,
  detecting: 55,
  uploading: 85,
  done: 100,
  error: 100,
};

export function AlbumDetail({ albumId }: { albumId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const engine = useFaceEngine();
  const { play } = useSoundFeedback();
  const { data, isPending } = useQuery({
    queryKey: albumKeys.detail(albumId),
    queryFn: () => getAlbum(albumId),
  });
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FoundPhoto[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [viewing, setViewing] = useState<GridPhoto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [zipping, setZipping] = useState<string | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: albumKeys.all });
  };

  async function handleFiles(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    if (!engine.ready) {
      toast.info("The face engine is still loading. Try again in a moment.");
      return;
    }
    const items = list.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      stage: "compressing" as UploadStage,
    }));
    setUploads((prev) => [...items, ...prev]);
    let ok = 0;
    // One at a time: the face engine processes one image at a time anyway.
    for (const [i, file] of list.entries()) {
      const id = items[i]!.id;
      const update = (patch: Partial<UploadItem>) =>
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      try {
        const { faces } = await uploadAlbumPhoto(albumId, file, (stage) => update({ stage }));
        update({ stage: "done", faces });
        ok++;
        if (ok % 5 === 0) refresh();
      } catch (err) {
        update({ stage: "error", error: err instanceof Error ? err.message : "Upload failed" });
      }
    }
    refresh();
    play(ok === list.length ? "success" : "error");
    toast.success(`${ok} of ${list.length} photos added`);
  }

  async function onEmbedding(embedding: Float32Array) {
    setSearching(true);
    try {
      const found = await findInAlbum(albumId, embedding);
      setResults(found);
      setSelected(new Set(found.map((f) => f.photoId)));
      setFindOpen(false);
      play(found.length ? "recognized" : "unknown");
      if (!found.length)
        toast.info("No photos found", { description: "Try a clearer, front-facing selfie." });
    } catch (err) {
      toast.error("Search failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSearching(false);
    }
  }

  async function zip(photos: GridPhoto[], name: string) {
    const withUrls = photos.filter((p) => p.url);
    if (withUrls.length === 0) return;
    setZipping(`0/${withUrls.length}`);
    try {
      await downloadZip(
        name,
        withUrls.map((p, i) => ({
          url: p.url!,
          filename: `photo-${String(i + 1).padStart(3, "0")}.jpg`,
        })),
        (done, total) => setZipping(`${done}/${total}`),
      );
      play("success");
    } catch {
      toast.error("Couldn't build the ZIP.");
    } finally {
      setZipping(null);
    }
  }

  if (isPending) return <Skeleton className="h-96 rounded-xl" />;
  if (!data) {
    return (
      <EmptyState
        title="Album not found"
        description="It may have been deleted."
        action={
          <Button variant="outline" asChild>
            <Link href="/albums">Back to albums</Link>
          </Button>
        }
      />
    );
  }

  const { album, photos } = data;
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/share/${album.share_code}` : "";
  const byId = new Map(photos.map((p) => [p.id, p]));
  const gridPhotos: GridPhoto[] = photos.map((p) => ({
    id: p.id,
    url: p.url,
    width: p.width,
    height: p.height,
    faceCount: p.faceCount,
  }));
  const resultPhotos: GridPhoto[] = (results ?? []).flatMap((r) => {
    const p = byId.get(r.photoId);
    if (!p) return [];
    const sure = r.similarity >= recognitionConfig.face.match;
    return [
      {
        id: p.id,
        url: p.url,
        width: p.width,
        height: p.height,
        box: r.box,
        badge: `${Math.round(r.similarity * 100)}% ${sure ? "match" : "possible"}`,
      },
    ];
  });
  const active = uploads.filter((u) => u.stage !== "done" && u.stage !== "error").length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/albums" aria-label="Back to albums">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div className="grid min-w-0 flex-1 gap-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{album.title}</h1>
          <p className="text-sm text-muted-foreground">
            {album.event_date ? `${formatDay(album.event_date)} · ` : ""}
            {photos.length} photos · {photos.reduce((s, p) => s + p.faceCount, 0)} faces indexed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setFindOpen(true)} disabled={photos.length === 0}>
            <ScanSearch aria-hidden /> Find me
          </Button>
          <Button variant="outline" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden /> Delete album
          </Button>
        </div>
      </div>

      {/* Share */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
        <Globe className="size-4 text-brand" aria-hidden />
        <div className="grid min-w-0 flex-1">
          <span className="text-sm font-medium">Share link</span>
          <span className="truncate text-xs text-muted-foreground">
            {album.is_public
              ? "Anyone with the link can view the photos and find themselves with a selfie."
              : "Off. Turn on to let guests find their photos without an account."}
          </span>
        </div>
        {album.is_public ? (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(shareUrl);
              toast.success("Link copied");
            }}
          >
            <Copy aria-hidden /> Copy link
          </Button>
        ) : null}
        <Switch
          checked={album.is_public}
          aria-label="Share link"
          onCheckedChange={async (on) => {
            try {
              await setAlbumPublic(album.id, on);
              refresh();
              toast.success(on ? "Share link is on" : "Share link is off");
            } catch {
              toast.error("Couldn't change sharing.");
            }
          }}
        />
      </div>

      {/* Upload */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-brand/60",
          dragging && "border-brand bg-brand/5 text-foreground",
        )}
      >
        <motion.span animate={dragging ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}>
          <ImagePlus className="size-8 text-brand" aria-hidden />
        </motion.span>
        <span className="font-medium text-foreground">Drop photos here or click to choose</span>
        <span>
          JPEG/PNG, compressed to {recognitionConfig.albums.maxSide}px. Faces are found on this
          device.
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {!engine.ready ? (
          <span className="text-xs">
            Loading face engine… ({Math.round(engine.progress * 100)}%)
          </span>
        ) : null}
      </label>
      {engine.status === "error" ? (
        <div className="relative min-h-32 rounded-xl border">
          <ModelLoader
            status={engine.status}
            stage={engine.stage}
            progress={engine.progress}
            error={engine.error}
            onRetry={engine.retry}
          />
        </div>
      ) : null}

      {uploads.length > 0 ? (
        <div className="grid gap-2 rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {active > 0 ? `Uploading ${active} photo${active === 1 ? "" : "s"}…` : "Uploads"}
            </span>
            {active === 0 ? (
              <Button size="sm" variant="ghost" onClick={() => setUploads([])}>
                <X aria-hidden /> Clear
              </Button>
            ) : null}
          </div>
          <ul className="grid max-h-56 gap-1.5 overflow-y-auto">
            {uploads.map((u) => (
              <li key={u.id} className="grid gap-1 text-xs">
                <div className="flex items-center gap-2">
                  {u.stage === "done" ? (
                    <CircleCheck className="size-3.5 text-success-foreground" aria-hidden />
                  ) : u.stage === "error" ? (
                    <CircleX className="size-3.5 text-danger-foreground" aria-hidden />
                  ) : (
                    <LoaderCircle className="size-3.5 animate-spin text-brand" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate">{u.name}</span>
                  <span className="text-muted-foreground">
                    {u.stage === "done"
                      ? `${u.faces} face${u.faces === 1 ? "" : "s"}`
                      : u.stage === "error"
                        ? u.error
                        : stageLabel[u.stage]}
                  </span>
                </div>
                <Progress
                  value={stageProgress[u.stage]}
                  className={cn("h-1", u.stage === "error" && "[&>*]:bg-danger")}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Find me results */}
      <AnimatePresence>
        {results ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <ScanSearch className="size-5 text-brand" aria-hidden />
              <h2 className="font-semibold">
                Found you in {results.length} photo{results.length === 1 ? "" : "s"}
              </h2>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={selected.size === 0 || zipping !== null}
                  onClick={() =>
                    void zip(
                      resultPhotos.filter((p) => selected.has(p.id)),
                      `${album.title}-me`,
                    )
                  }
                >
                  {zipping ? (
                    <LoaderCircle className="animate-spin" aria-hidden />
                  ) : (
                    <Download aria-hidden />
                  )}
                  {zipping ? `Zipping ${zipping}` : `Download ${selected.size} (ZIP)`}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setResults(null)}>
                  <X aria-hidden /> Close
                </Button>
              </div>
            </div>
            {resultPhotos.length > 0 ? (
              <PhotoGrid
                photos={resultPhotos}
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
              <p className="text-sm text-muted-foreground">No matching photos in this album.</p>
            )}
          </motion.section>
        ) : null}
      </AnimatePresence>

      {/* All photos */}
      {photos.length === 0 ? (
        <EmptyState
          title="No photos yet"
          description="Upload the event photos above. 30+ group photos work great."
        />
      ) : (
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">All photos</h2>
            <Button
              size="sm"
              variant="outline"
              disabled={zipping !== null}
              onClick={() => void zip(gridPhotos, album.title)}
            >
              <Download aria-hidden /> Download all
            </Button>
          </div>
          <PhotoGrid photos={gridPhotos} onOpen={setViewing} />
        </section>
      )}

      <FindMeDialog
        open={findOpen}
        onOpenChange={setFindOpen}
        onEmbedding={onEmbedding}
        searching={searching}
      />

      <Dialog open={viewing !== null} onOpenChange={(o) => (o ? null : setViewing(null))}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {viewing?.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
            <img
              src={viewing.url}
              alt=""
              className="max-h-[70dvh] w-full rounded-lg object-contain"
            />
          ) : null}
          {viewing ? (
            <div className="flex flex-wrap justify-end gap-2">
              {viewing.url ? (
                <Button variant="outline" asChild>
                  <a href={viewing.url} download target="_blank" rel="noreferrer">
                    <Download aria-hidden /> Download
                  </a>
                </Button>
              ) : null}
              <Button
                variant="destructive"
                onClick={async () => {
                  const p = byId.get(viewing.id);
                  if (!p) return;
                  try {
                    await deletePhoto({ id: p.id, path: p.path });
                    setViewing(null);
                    refresh();
                    toast.success("Photo deleted");
                  } catch {
                    toast.error("Couldn't delete the photo.");
                  }
                }}
              >
                <Trash2 aria-hidden /> Delete
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${album.title}"?`}
        description="All photos and their face data are deleted. This can't be undone."
        actionLabel="Delete album"
        onConfirm={async () => {
          try {
            await deleteAlbum(album.id);
            refresh();
            router.push("/albums");
          } catch {
            toast.error("Couldn't delete the album.");
          }
        }}
      />
    </div>
  );
}
