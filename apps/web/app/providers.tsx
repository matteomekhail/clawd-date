"use client";

import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";
import { convex } from "@/lib/convex";

export function Providers({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
