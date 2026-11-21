import { ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Shown instead of the app when an admin has disabled the account. */
export function AccountDisabled({ email }: { email: string }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="grid max-w-sm justify-items-center gap-4 rounded-xl border bg-card p-8 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-danger/10 text-danger-foreground">
          <ShieldOff className="size-6" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold">Account disabled</h1>
        <p className="text-sm text-muted-foreground">
          An administrator has disabled <span className="font-medium">{email}</span>. Contact your
          admin if you think this is a mistake.
        </p>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
