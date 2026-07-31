"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Swords,
  ScrollText,
  Trophy,
  ChartNoAxesCombined,
  Users,
} from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  {
    href: "/matches/new",
    label: "Record",
    icon: Swords,
    match: (p: string) => p.startsWith("/matches/new"),
  },
  {
    href: "/matches",
    label: "Archives",
    icon: ScrollText,
    match: (p: string) =>
      p === "/matches" ||
      (p.startsWith("/matches/") && !p.startsWith("/matches/new")),
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
  {
    href: "/teams",
    label: "Teams",
    icon: Users,
    match: (p: string) => p.startsWith("/teams"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="goa-bottom-nav">
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
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
