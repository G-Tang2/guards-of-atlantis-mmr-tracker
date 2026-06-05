// lib/heroes.ts
// Guards of Atlantis II hero roster
// Star rating = hero complexity (1★ easiest → 4★ hardest)

export type HeroDifficulty = "1" | "2" | "3" | "4";

export type Hero = {
  id: string;
  name: string;
  difficulty: HeroDifficulty;
};

export const HEROES: Hero[] = [
  // ★ Heroes
  { id: "arien", name: "Arien the Tidemaster", difficulty: "1" },
  { id: "brogan", name: "Brogan the Destroyer", difficulty: "1" },
  { id: "dodger", name: "Dodger the Warlock", difficulty: "1" },
  { id: "sabina", name: "Sabina the Commander", difficulty: "1" },
  { id: "tigerclaw", name: "Tigerclaw the Cutpurse", difficulty: "1" },
  { id: "wasp", name: "Wasp the Warmaiden", difficulty: "1" },
  { id: "xargatha", name: "Xargatha the Changed", difficulty: "1" },
  
  // ★★ Heroes
  { id: "bain", name: "Bain the Bounty Hunter", difficulty: "2" },
  { id: "garrus", name: "Garrus the Gladiator", difficulty: "2" },
  { id: "min", name: "Min the Dragonmonk", difficulty: "2" },
  { id: "misa", name: "Misa the Samurai", difficulty: "2" },
  { id: "rowenna", name: "Rowenna the Vanguard", difficulty: "2" },
  { id: "silverarrow", name: "Silverarrow the Pathfinder", difficulty: "2" },
  { id: "ursafar", name: "Ursafar the Savage", difficulty: "2" },
  { id: "whisper", name: "Whisper the Outcast", difficulty: "2" },

  // ★★★ Heroes
  { id: "brynn", name: "Brynn the Seeker", difficulty: "3" },
  { id: "cutter", name: "Cutter the Sky Pirate", difficulty: "3" },
  { id: "hanu", name: "Hanu the Trickster", difficulty: "3" },
  { id: "mortimer", name: "Mortimer the Awakener", difficulty: "3" },
  { id: "mrak", name: "Mrak the Rockshaper", difficulty: "3" },
  { id: "swift", name: "Swift the Sharpshooter", difficulty: "3" },
  { id: "tali", name: "Tali the Spiritcaller", difficulty: "3" },
  { id: "trinkets", name: "Trinkets the Scavenger", difficulty: "3" },
  { id: "widget", name: "Widget and Pyro", difficulty: "3" },
  { id: "wuk", name: "Wuk the Grove Keeper", difficulty: "3" },
  
  // ★★★★ Heroes
  { id: "emmitt", name: "Emmitt the Traveller", difficulty: "4" },
  { id: "gydion", name: "Gydion the Archwizard", difficulty: "4" },
  { id: "ignatia", name: "Ignatia the Mad", difficulty: "4" },
  { id: "nebkher", name: "NebKher the Harbinger", difficulty: "4" },
  { id: "razzle", name: "Razzle the Ringmaster", difficulty: "4" },
  { id: "snorri", name: "Snorri the Runescribe", difficulty: "4" },
  { id: "takahide", name: "Takahide the Warlord", difficulty: "4" },
];

export const DIFFICULTY_COLORS: Record<HeroDifficulty, string> = {
  "1": "rgba(93,187,138,0.8)",   // green
  "2": "rgba(201,151,58,0.8)",   // gold
  "3": "rgba(160,100,200,0.8)",  // purple
  "4": "rgba(196,42,58,0.8)",    // red
};