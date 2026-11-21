import type { Metadata } from "next";

import { AlbumsView } from "@/components/albums/albums-view";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Albums" };

export default function AlbumsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Albums"
        description="Upload event photos, then find every photo someone is in with a single selfie."
      />
      <AlbumsView />
    </div>
  );
}
