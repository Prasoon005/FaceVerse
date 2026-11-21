"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Album, CalendarDays, Globe, ImageIcon, Plus, ScanFace } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
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
import { Skeleton } from "@/components/ui/skeleton";
import { albumKeys, createAlbum, listAlbums } from "@/lib/data/albums";
import { formatDay } from "@/lib/format";

/** Grid of album cards (cover, counts, shared badge) with "New album". */
export function AlbumsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data = [], isPending } = useQuery({ queryKey: albumKeys.list(), queryFn: listAlbums });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  const create = useMutation({
    mutationFn: () => createAlbum({ title, eventDate: date || null }),
    onSuccess: (album) => {
      void queryClient.invalidateQueries({ queryKey: albumKeys.all });
      setOpen(false);
      setTitle("");
      setDate("");
      router.push(`/albums/${album.id}`);
    },
    onError: (err) => toast.error("Couldn't create the album", { description: err.message }),
  });

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus aria-hidden /> New album
        </Button>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="No albums yet"
          description="Create an album for an event, upload the photos, and anyone can find their photos with a selfie."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus aria-hidden /> Create your first album
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a, i) => (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.05 }}
            >
              <Link
                href={`/albums/${a.id}`}
                className="hover-lift group block overflow-hidden rounded-xl border bg-card"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {a.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                    <img
                      src={a.coverUrl}
                      alt=""
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground">
                      <Album className="size-10" aria-hidden />
                    </div>
                  )}
                  {a.is_public ? (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-xs backdrop-blur">
                      <Globe className="size-3" aria-hidden /> Shared
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-1 p-3">
                  <span className="truncate font-medium">{a.title}</span>
                  <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {a.event_date ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3" aria-hidden /> {formatDay(a.event_date)}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="size-3" aria-hidden /> {a.photoCount} photos
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ScanFace className="size-3" aria-hidden /> {a.faceCount} faces
                    </span>
                  </span>
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New album</DialogTitle>
            <DialogDescription>
              For one event, e.g. &ldquo;Annual day 2026&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) create.mutate();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="album-title">Title</Label>
              <Input
                id="album-title"
                value={title}
                maxLength={120}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="album-date">Event date (optional)</Label>
              <Input
                id="album-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || create.isPending}>
                <Plus aria-hidden /> Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
