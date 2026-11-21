import { Album } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SharedAlbum } from "@/components/albums/shared-album";
import { AuroraBackground } from "@/components/shared/aurora-background";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Shared album", robots: { index: false } };

/**
 * Public view of a shared album (no sign-in). Only albums the owner made public are shown;
 * photo URLs are short-lived signed URLs created here on the server.
 */
export default async function SharedAlbumPage({ params }: PageProps<"/share/[code]">) {
  const { code } = await params;
  if (!isAdminConfigured() || !/^[0-9a-f]{6,32}$/.test(code)) notFound();

  const admin = createAdminClient();
  const { data: album } = await admin
    .from("albums")
    .select("id, title, event_date, is_public")
    .eq("share_code", code)
    .maybeSingle();
  if (!album?.is_public) notFound();

  const { data: photos } = await admin
    .from("album_photos")
    .select("id, storage_path, width, height")
    .eq("album_id", album.id)
    .order("created_at", { ascending: false })
    .limit(1000);
  const paths = (photos ?? []).map((p) => p.storage_path);
  const { data: signed } = paths.length
    ? await admin.storage.from("album-photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div className="relative isolate min-h-dvh">
      <AuroraBackground className="-z-10 opacity-60" />
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="FaceVerse home" className="rounded-md">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-16 md:px-6">
        <div className="grid gap-1">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Album className="size-4" aria-hidden /> Shared album
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{album.title}</h1>
        </div>
        <SharedAlbum
          code={code}
          title={album.title}
          photos={(photos ?? []).map((p) => ({
            id: p.id,
            url: urlByPath.get(p.storage_path) ?? null,
            width: p.width,
            height: p.height,
          }))}
        />
      </main>
    </div>
  );
}
