// lib/heroes.ts
// Guards of Atlantis II hero roster
// Star rating = hero complexity (1★ easiest → 4★ hardest)

export type HeroComplexity = "1" | "2" | "3" | "4";

export type Hero = {
  id: string;
  name: string;
  complexity: HeroComplexity;
  icon: string;
};

export const HEROES: Hero[] = [
  // ★ Heroes
  { id: "arien", name: "Arien the Tidemaster", complexity: "1", icon: "/heroes/arien_icon.png"},
  { id: "brogan", name: "Brogan the Destroyer", complexity: "1", icon: "/heroes/brogan_icon.png"},
  { id: "dodger", name: "Dodger the Warlock", complexity: "1", icon: "/heroes/dodger_icon.png"},
  { id: "sabina", name: "Sabina the Commander", complexity: "1", icon: "/heroes/sabina_icon.png"},
  { id: "tigerclaw", name: "Tigerclaw the Cutpurse", complexity: "1", icon: "/heroes/tigerclaw_icon.png"},
  { id: "wasp", name: "Wasp the Warmaiden", complexity: "1", icon: "/heroes/wasp_icon.png"},
  { id: "xargatha", name: "Xargatha the Changed", complexity: "1", icon: "/heroes/xargatha_icon.png"},
  
  // ★★ Heroes
  { id: "bain", name: "Bain the Bounty Hunter", complexity: "2", icon: "/heroes/bain_icon.png" },
  { id: "garrus", name: "Garrus the Gladiator", complexity: "2", icon: "/heroes/garrus_icon.png" },
  { id: "min", name: "Min the Dragonmonk", complexity: "2", icon: "/heroes/min_icon.png" },
  { id: "misa", name: "Misa the Samurai", complexity: "2", icon: "/heroes/misa_icon.png" },
  { id: "rowenna", name: "Rowenna the Vanguard", complexity: "2", icon: "/heroes/rowenna_icon.png" },
  { id: "silverarrow", name: "Silverarrow the Pathfinder", complexity: "2", icon: "/heroes/silverarrow_icon.png" },
  { id: "ursafar", name: "Ursafar the Savage", complexity: "2", icon: "/heroes/ursafar_icon.png" },
  { id: "whisper", name: "Whisper the Outcast", complexity: "2", icon: "/heroes/whisper_icon.png" },

  // ★★★ Heroes
  { id: "brynn", name: "Brynn the Seeker", complexity: "3", icon: "/heroes/brynn_icon.png" },
  { id: "cutter", name: "Cutter the Sky Pirate", complexity: "3", icon: "/heroes/cutter_icon.png" },
  { id: "hanu", name: "Hanu the Trickster", complexity: "3", icon: "/heroes/hanu_icon.png" },
  { id: "mortimer", name: "Mortimer the Awakener", complexity: "3", icon: "/heroes/mortimer_icon.png" },
  { id: "mrak", name: "Mrak the Rockshaper", complexity: "3", icon: "/heroes/mrak_icon.png" },
  { id: "swift", name: "Swift the Sharpshooter", complexity: "3", icon: "/heroes/swift_icon.png" },
  { id: "tali", name: "Tali the Spiritcaller", complexity: "3", icon: "/heroes/tali_icon.png" },
  { id: "trinkets", name: "Trinkets the Scavenger", complexity: "3", icon: "/heroes/trinkets_icon.png" },
  { id: "widget", name: "Widget and Pyro", complexity: "3", icon: "/heroes/widget_icon.png" },
  { id: "wuk", name: "Wuk the Grove Keeper", complexity: "3", icon: "/heroes/wuk_icon.png" },

  // ★★★★ Heroes
  { id: "emmitt", name: "Emmitt the Traveller", complexity: "4", icon: "/heroes/emmitt_icon.png" },
  { id: "gydion", name: "Gydion the Archwizard", complexity: "4", icon: "/heroes/gydion_icon.png" },
  { id: "ignatia", name: "Ignatia the Mad", complexity: "4", icon: "/heroes/ignatia_icon.png" },
  { id: "nebkher", name: "NebKher the Harbinger", complexity: "4", icon: "/heroes/nebkher_icon.png" },
  { id: "razzle", name: "Razzle the Ringmaster", complexity: "4", icon: "/heroes/razzle_icon.png" },
  { id: "snorri", name: "Snorri the Runescribe", complexity: "4", icon: "/heroes/snorri_icon.png" },
  { id: "takahide", name: "Takahide the Warlord", complexity: "4", icon: "/heroes/takahide_icon.png" },
];

export const DIFFICULTY_COLORS: Record<HeroComplexity, string> = {
  "1": "rgba(156, 223, 118, 0.8)",   // green
  "2": "rgba(197, 126, 218, 0.85)",   // purple
  "3": "rgba(91, 223, 223, 0.88)",  // teal
  "4": "rgba(223, 136, 136, 0.93)",  // red
};