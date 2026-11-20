"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const notices: Record<string, { title: string; description: string }> = {
  link_used: {
    title: "Email link already used",
    description: "Your email is probably confirmed already. Please sign in with your password.",
  },
};

/**
 * Surfaces auth problems passed back to /login: `?error=` / `?notice=` from the callback
 * route, plus `#error_description=` fragments that Supabase appends (never sent to the server).
 */
export function AuthErrorToast({ message, notice }: { message?: string; notice?: string }) {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const hashError = hash.get("error_description") ?? hash.get("error");

    if (message || hashError) {
      toast.error("Sign-in problem", { description: message ?? hashError ?? undefined });
    } else if (notice && notices[notice]) {
      toast.info(notices[notice].title, { description: notices[notice].description });
    }

    // Clean the URL so a refresh doesn't show the toast again.
    if (message || notice || window.location.hash) {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      url.searchParams.delete("notice");
      url.hash = "";
      window.history.replaceState(null, "", url);
    }
  }, [message, notice]);

  return null;
}
