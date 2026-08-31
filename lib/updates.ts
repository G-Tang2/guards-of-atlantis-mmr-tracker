// lib/updates.ts
// "What's New" feed shown on the home page. Add a new entry (to the top)
// whenever a change is worth surfacing to players.

import type { ComponentType } from "react";
import { Shield, Swords } from "lucide-react";
import { BADGES } from "@/lib/badges";

export type UpdateDetailItem = {
  label?: string;
  text: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
};

export type UpdateEntry = {
  date: string;
  title: string;
  summary: string;
  details: string | UpdateDetailItem[];
};

export const UPDATES: UpdateEntry[] = [
  {
    date: "Aug 23",
    title: "Badge MMR Bonus Removed",
    summary: "Completing a badge is no longer worth extra MMR on top of the usual result.",
    details: [
      {
        text: "The flat MMR bonus for completing a badge (below) has been removed. Badges are still earned and shown on your profile the same way, and the win that completes one still gets the usual first-hero-win 30% boost.",
      },
    ],
  },
  {
    date: "Aug 7",
    title: "Profile Cover Photos",
    summary: "Personalize your profile page with a custom cover photo.",
    details: [
      {
        text: "Tap the Cover button on your profile page to upload a banner image, displayed behind your avatar the same way a hero's banner art is shown on its page.",
      },
      {
        label: "File Types",
        text: "Any image format is accepted, including animated GIFs.",
      },
      {
        label: "Size Limit",
        text: "Up to 8MB per upload.",
      },
    ],
  },
  {
    date: "Aug 7",
    title: "Collectible Badges",
    summary: "Win with every hero in a badge's set to earn it — and a bonus.",
    details: [
      {
        text: "Each badge covers a hero pack. Winning at least one match with every hero in a badge earns it, along with a flat MMR bonus on top of the usual result:",
      },
      // Historical record of the bonus as it stood when this shipped —
      // hardcoded rather than computed, since the bonus itself was
      // removed later (see the "Badge MMR Bonus Removed" entry above).
      ...BADGES.map((badge) => ({
        label: badge.name,
        text: `+${badge.id === "base" ? 75 : 50} MMR (${badge.heroIds.length} heroes)`,
      })),
      {
        text: "Winning with a hero for the first time also grants a 30% MMR boost on that match's gain.",
      },
    ],
  },
  {
    date: "Aug 5",
    title: "Redesigned Match Details",
    summary: "A clearer breakdown of what happened before, during, and after each battle.",
    details: [
      {
        text: "Each battle's detail page is now organised into distinct sections instead of one long list:",
      },
      {
        label: "Pre-Match",
        text: "Draft method, starting wave and life counters, and the win probability, shown together before the result.",
      },
      {
        label: "Post-Match",
        text: "Wave counter(s) and each team's life counter(s) remaining.",
      },
      {
        label: "Teams",
        text: "Each roster, hero picks, and MMR change.",
      },
    ],
  },
  {
    date: "Jul 31",
    title: "Rank Protection",
    summary: "Ranks are now protected against unearned overtakes.",
    details: [
      {
        text: "A lower-ranked player may overtake a higher-ranked player only if at least one of the following conditions is met:",
      },
      {
        label: "Direct Defeat",
        text: "The lower-ranked player defeats the higher-ranked player in the current match.",
      },
      {
        label: "Player Inactivity",
        text: "The higher-ranked player has not participated in any of the last four (4) matches.",
      },
      {
        label: "Match Absence",
        text: "The higher-ranked player loses a match in which the lower-ranked player did not participate.",
      },
      {
        text: "The leaderboard reflects this with two icons:",
      },
      {
        label: "Shield",
        icon: Shield,
        text: "Shown next to a protected player, alongside a countdown of games remaining before they become inactive and lose that protection.",
      },
      {
        label: "Sword",
        icon: Swords,
        text: "Shown next to a player who has higher MMR than the player ranked above them but has not yet met the conditions required to overtake that rank.",
      },
    ],
  },
  {
    date: "Jul 28",
    title: "Bounty Heroes",
    summary: "Underutilised heroes now yield additional MMR upon selection.",
    details: [
      {
        text: "To promote hero pool diversity, selecting any hero that has remained unpicked for seven (7) or more consecutive matches awards a +5 MMR bonus.",
      },
      {
        text: "The full list of eligible Bounty Heroes is available on the Hero Compendium page.",
      },
    ],
  },
  {
    date: "Jul 27",
    title: "Draw Outcomes",
    summary: "Matches can now be recorded as a draw.",
    details: [
      {
        text: "Matches may now be recorded with a draw outcome when neither side achieves a clear victory, rather than requiring a forced win or loss.",
      },
      {
        text: "A draw awards a flat +10 MMR to every participating player, regardless of team.",
      },
    ],
  },
  {
    date: "Jul 25",
    title: "Captain's Draft",
    summary: "A new way to split teams: draft your squad pick by pick.",
    details: [
      {
        text: "Captain's Draft joins Random and Balanced as a third way to split the player pool into teams:",
      },
      {
        label: "Choose Captains",
        text: "Select one captain per team, or randomize the selection.",
      },
      {
        label: "Snake Draft",
        text: "Captains take turns picking from the remaining pool, with pick order reversing each round, until every player is assigned.",
      },
      {
        label: "Begin the Battle",
        text: "Once the draft is complete, proceed directly to recording the match.",
      },
    ],
  },
];
