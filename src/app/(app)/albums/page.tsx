import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Albums" };

export default function AlbumsPage() {
  return (
    <ComingSoon
      title="Albums"
      description="Upload event photos and find yourself with a selfie."
      phase={5}
    />
  );
}
