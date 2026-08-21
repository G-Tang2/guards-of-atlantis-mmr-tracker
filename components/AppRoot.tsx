"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

// The timer page hides BottomNav (see components/BottomNav.tsx) so a stray
// tap can't navigate away mid-game — this drops the matching bottom
// padding .app-root normally reserves for that bar, so the timer's own
// fixed-height "fill the screen exactly" layout doesn't leave that space
// sitting empty.
export function AppRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const noBottomNav = pathname.startsWith("/matches/timer");

  return (
    <div className={`app-root${noBottomNav ? " no-bottom-nav" : ""}`}>
      {children}
    </div>
  );
}
