// lib/heroes.ts
// Guards of Atlantis II hero roster
// Star rating = hero complexity (1★ easiest → 4★ hardest)

export type HeroComplexity = "1" | "2" | "3" | "4";

export type Hero = {
  id: string;
  name: string;
  complexity: HeroComplexity;
};

export const HEROES: Hero[] = [
  // ★ Heroes
  { id: "arien", name: "Arien the Tidemaster", complexity: "1" },
  { id: "brogan", name: "Brogan the Destroyer", complexity: "1" },
  { id: "dodger", name: "Dodger the Warlock", complexity: "1" },
  { id: "sabina", name: "Sabina the Commander", complexity: "1" },
  { id: "tigerclaw", name: "Tigerclaw the Cutpurse", complexity: "1" },
  { id: "wasp", name: "Wasp the Warmaiden", complexity: "1" },
  { id: "xargatha", name: "Xargatha the Changed", complexity: "1" },
  
  // ★★ Heroes
  { id: "bain", name: "Bain the Bounty Hunter", complexity: "2" },
  { id: "garrus", name: "Garrus the Gladiator", complexity: "2" },
  { id: "min", name: "Min the Dragonmonk", complexity: "2" },
  { id: "misa", name: "Misa the Samurai", complexity: "2" },
  { id: "rowenna", name: "Rowenna the Vanguard", complexity: "2" },
  { id: "silverarrow", name: "Silverarrow the Pathfinder", complexity: "2" },
  { id: "ursafar", name: "Ursafar the Savage", complexity: "2" },
  { id: "whisper", name: "Whisper the Outcast", complexity: "2" },

  // ★★★ Heroes
  { id: "brynn", name: "Brynn the Seeker", complexity: "3" },
  { id: "cutter", name: "Cutter the Sky Pirate", complexity: "3" },
  { id: "hanu", name: "Hanu the Trickster", complexity: "3" },
  { id: "mortimer", name: "Mortimer the Awakener", complexity: "3" },
  { id: "mrak", name: "Mrak the Rockshaper", complexity: "3" },
  { id: "swift", name: "Swift the Sharpshooter", complexity: "3" },
  { id: "tali", name: "Tali the Spiritcaller", complexity: "3" },
  { id: "trinkets", name: "Trinkets the Scavenger", complexity: "3" },
  { id: "widget", name: "Widget and Pyro", complexity: "3" },
  { id: "wuk", name: "Wuk the Grove Keeper", complexity: "3" },
  
  // ★★★★ Heroes
  { id: "emmitt", name: "Emmitt the Traveller", complexity: "4" },
  { id: "gydion", name: "Gydion the Archwizard", complexity: "4" },
  { id: "ignatia", name: "Ignatia the Mad", complexity: "4" },
  { id: "nebkher", name: "NebKher the Harbinger", complexity: "4" },
  { id: "razzle", name: "Razzle the Ringmaster", complexity: "4" },
  { id: "snorri", name: "Snorri the Runescribe", complexity: "4" },
  { id: "takahide", name: "Takahide the Warlord", complexity: "4" },
];

export const DIFFICULTY_COLORS: Record<HeroComplexity, string> = {
  "1": "rgba(93,187,138,0.8)",   // green
  "2": "rgba(201,151,58,0.8)",   // gold
  "3": "rgba(160,100,200,0.8)",  // purple
  "4": "rgba(196,42,58,0.8)",    // red
};