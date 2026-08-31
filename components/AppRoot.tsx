"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";

// The timer page hides BottomNav (see components/BottomNav.tsx) so a stray
// tap can't navigate away mid-game — this drops the matching bottom
// padding .app-root normally reserves for that bar, so the timer's own
// fixed-height "fill the screen exactly" layout doesn't leave that space
// sitting empty.
export function AppRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const noBottomNav = pathname.startsWith("/matches/timer");

  // Any full-viewport-height layout on this app (the home page, the
  // running battle timer) uses --vvh in preference to a plain dvh/svh CSS
  // unit — window.visualViewport.height is the browser's own live,
  // authoritative "how many px are actually visible right now" figure,
  // unaffected by however a given mobile browser's chrome happens to
  // settle after a particular launch path (a normal tab vs. a
  // home-screen shortcut behave differently here, especially on iOS
  // Chrome, which isn't a true standalone launch the way Safari's is —
  // dvh/svh are just static CSS guesses by comparison). Falls back to
  // svh via CSS when visualViewport isn't available at all.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      document.documentElement.style.setProperty("--vvh", `${vv.height}px`);
    };
    update();
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);

  return (
    <div className={`app-root${noBottomNav ? " no-bottom-nav" : ""}`}>
      {children}
    </div>
  );
}
