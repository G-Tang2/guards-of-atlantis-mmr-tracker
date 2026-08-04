// Collectible badges — a player earns a badge once they have at least one
// win with every hero listed for it. Each hero belongs to exactly one badge.

export type Badge = {
  id: string;
  name: string;
  icon: string;
  heroIds: string[];
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
  },
  {
    id: "arcane",
    name: "Arcane",
    icon: "/badges/arcane.png",
    heroIds: ["rowenna", "mrak", "snorri", "razzle", "gydion"],
  },
  {
    id: "wayward",
    name: "Wayward",
    icon: "/badges/wayward.png",
    heroIds: ["brynn", "mortimer", "takahide", "widget", "emmitt"],
  },
  {
    id: "devoted",
    name: "Devoted",
    icon: "/badges/devoted.png",
    heroIds: ["whisper", "misa", "ursafar", "silverarrow", "tali"],
  },
  {
    id: "defiant",
    name: "Defiant",
    icon: "/badges/defiant.png",
    heroIds: ["garrus", "bain", "cutter", "nebkher", "trinkets"],
  },
  {
    id: "renowned",
    name: "Renowned",
    icon: "/badges/renowned.png",
    heroIds: ["min", "swift", "wuk", "hanu", "ignatia"],
  },
];
