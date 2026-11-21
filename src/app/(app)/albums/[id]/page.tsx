import type { Metadata } from "next";

import { AlbumDetail } from "@/components/albums/album-detail";

export const metadata: Metadata = { title: "Album" };

export default async function AlbumPage({ params }: PageProps<"/albums/[id]">) {
  const { id } = await params;
  return <AlbumDetail albumId={id} />;
}
