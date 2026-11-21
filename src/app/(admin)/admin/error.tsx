"use client";

import { ErrorPanel } from "@/components/shared/error-panel";

export default function RouteError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPanel {...props} />;
}
