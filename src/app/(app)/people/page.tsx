import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PeopleTable } from "@/components/people/people-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="People"
        description="Enrolled identities, their samples and when they were last seen."
        actions={
          <Button asChild>
            <Link href="/enroll">
              <UserPlus aria-hidden /> Enroll person
            </Link>
          </Button>
        }
      />
      <PeopleTable />
    </div>
  );
}
