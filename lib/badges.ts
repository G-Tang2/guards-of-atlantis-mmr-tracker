// Collectible badges — a player earns a badge once they have at least one
// win with every hero listed for it. Each hero belongs to exactly one badge.
// Once earned, a badge also grants its owner an ongoing perk (`description`)
// — see lib/badgeRewards.ts and lib/bounty.ts for where each one is
// actually applied.

export type Badge = {
  id: string;
  name: string;
  icon: string;
  heroIds: string[];
  description: string;
};

export const BADGES: Badge[] = [
  {
    id: "base",
    name: "Base",
    icon: "/badges/base.png",
    heroIds: [
      "arien",
      "brogan",
      "dodger",
      "tigerclaw",
      "wasp",
      "sabina",
      "xargatha",
    ],
    description:
      "Your vote counts for 1.5x in Ranked Balance and Balanced team-split voting.",
  },
  {
    id: "arcane",
    name: "Arcane",
    icon: "/badges/arcane.png",
    heroIds: ["rowenna", "mrak", "snorri", "razzle", "gydion"],
    description:
      "For you, heroes qualify as bounty heroes after just 6 unplayed games instead of the usual 8.",
  },
  {
    id: "wayward",
    name: "Wayward",
    icon: "/badges/wayward.png",
    heroIds: ["brynn", "mortimer", "takahide", "widget", "emmitt"],
    description: "Bounty heroes grant you 7 MMR instead of 5 when played.",
  },
  {
    id: "devoted",
    name: "Devoted",
    icon: "/badges/devoted.png",
    heroIds: ["whisper", "misa", "ursafar", "silverarrow", "tali"],
    description: "Lose 3 MMR less whenever you lose.",
  },
  {
    id: "defiant",
    name: "Defiant",
    icon: "/badges/defiant.png",
    heroIds: ["garrus", "bain", "cutter", "nebkher", "trinkets"],
    description: "Optionally wager 5 MMR before battle: win to gain 5 MMR, or lose to lose 5 MMR.",
  },
  {
    id: "renowned",
    name: "Renowned",
    icon: "/badges/renowned.png",
    heroIds: ["min", "swift", "wuk", "hanu", "ignatia"],
    description: "Gain 2 extra MMR whenever you win.",
  },
];
