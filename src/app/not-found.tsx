import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <EmptyState
        className="w-full max-w-md"
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
        }
      />
    </main>
  );
}
