import type { Metadata } from "next";

import { PersonDetail } from "@/components/people/person-detail";

export const metadata: Metadata = { title: "Person" };

export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  return <PersonDetail id={id} />;
}
