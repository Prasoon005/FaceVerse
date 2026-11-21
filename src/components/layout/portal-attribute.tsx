"use client";

import { useEffect } from "react";

import type { Portal } from "@/config/site";

/**
 * Mirrors the portal onto <html data-portal>, so dialogs and toasts (rendered outside the
 * shell) pick up the admin accent colour too.
 */
export function PortalAttribute({ portal }: { portal: Portal }) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.portal = portal;
    return () => {
      delete root.dataset.portal;
    };
  }, [portal]);
  return null;
}
