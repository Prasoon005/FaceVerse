"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during SSR and hydration, true afterwards. For content that must be random per visit. */
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
