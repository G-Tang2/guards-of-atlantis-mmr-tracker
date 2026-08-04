// Collectible badges — a player earns a badge once they have at least one
// win with every hero listed for it. Each hero belongs to exactly one badge.

export type Badge = {
  id: string;
  name: string;
  heroIds: string[];
};

export const BADGES: Badge[] = [
  {
    id: "base",
    name: "Base",
    heroIds: [
      "arien",
      "brogan",
      "dodger",
      "tigerclaw",
      "wasp",
      "sabina",
      "xargatha",
    ],
  },
  {
    id: "arcane",
    name: "Arcane",
    heroIds: ["rowenna", "mrak", "snorri", "razzle", "gydion"],
  },
  {
    id: "wayward",
    name: "Wayward",
    heroIds: ["brynn", "mortimer", "takahide", "widget", "emmitt"],
  },
  {
    id: "devoted",
    name: "Devoted",
    heroIds: ["whisper", "misa", "ursafar", "silverarrow", "tali"],
  },
  {
    id: "defiant",
    name: "Defiant",
    heroIds: ["garrus", "bain", "cutter", "nebkher", "trinkets"],
  },
  {
    id: "renowned",
    name: "Renowned",
    heroIds: ["min", "swift", "wuk", "hanu", "ignatia"],
  },
];
