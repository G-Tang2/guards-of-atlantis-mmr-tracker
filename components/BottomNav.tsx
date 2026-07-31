"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Swords,
  ScrollText,
  Trophy,
  ChartNoAxesCombined,
} from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  {
    href: "/matches",
    label: "Archives",
    icon: ScrollText,
    match: (p: string) =>
      p === "/matches" ||
      (p.startsWith("/matches/") && !p.startsWith("/matches/new")),
  },
  {
    // Main entry point for building a match: assemble teams on /teams,
    // then continue straight into recording it on /matches/new. Raised
    // and centered as the primary action of the bar.
    href: "/teams",
    label: "Battle",
    icon: Swords,
    match: (p: string) => p.startsWith("/teams") || p.startsWith("/matches/new"),
    center: true,
  },
  {
    href: "/leaderboard",
    label: "Board",
    icon: Trophy,
    match: (p: string) => p.startsWith("/leaderboard"),
  },
  {
    href: "/heroes",
    label: "Heroes",
    icon: ChartNoAxesCombined,
    match: (p: string) => p.startsWith("/heroes"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="goa-bottom-nav">
      {TABS.map(({ href, label, icon: Icon, match, center }) => {
        const active = match(pathname);

        if (center) {
          return (
            <Link
              key={href}
              href={href}
              className={`goa-bottom-nav-item goa-bottom-nav-center ${active ? "active" : ""}`}
            >
              <span className="goa-bottom-nav-center-circle">
                <Icon size={24} />
              </span>
              <span className="goa-bottom-nav-label">{label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className={`goa-bottom-nav-item ${active ? "active" : ""}`}
          >
            <Icon size={20} />
            <span className="goa-bottom-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
