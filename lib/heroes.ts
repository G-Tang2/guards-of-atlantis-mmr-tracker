// lib/heroes.ts
// Hero roster for Guards of Atlantis 2
// Each hero belongs to a faction or is neutral/mercenary

export type HeroRole = "Guardian" | "Warrior" | "Mage" | "Support" | "Assassin" | "Tank";

export type Hero = {
  id: string;
  name: string;
  role: HeroRole;
  emoji: string; // quick visual identifier
};

// Based on Guards of Atlantis II hero roster
export const HEROES: Hero[] = [
  // Atlantis heroes
  { id: "achilles",     name: "Achilles",     role: "Warrior",   emoji: "⚔️"  },
  { id: "ajax",         name: "Ajax",         role: "Tank",      emoji: "🛡️"  },
  { id: "aphrodite",    name: "Aphrodite",    role: "Support",   emoji: "💫"  },
  { id: "apollo",       name: "Apollo",       role: "Mage",      emoji: "☀️"  },
  { id: "ares",         name: "Ares",         role: "Warrior",   emoji: "🔱"  },
  { id: "artemis",      name: "Artemis",      role: "Assassin",  emoji: "🏹"  },
  { id: "athena",       name: "Athena",       role: "Guardian",  emoji: "🦉"  },
  { id: "chiron",       name: "Chiron",       role: "Support",   emoji: "🐎"  },
  { id: "circe",        name: "Circe",        role: "Mage",      emoji: "🌿"  },
  { id: "dionysus",     name: "Dionysus",     role: "Support",   emoji: "🍇"  },
  { id: "electra",      name: "Electra",      role: "Assassin",  emoji: "⚡"  },
  { id: "hecate",       name: "Hecate",       role: "Mage",      emoji: "🌙"  },
  { id: "heracles",     name: "Heracles",     role: "Tank",      emoji: "💪"  },
  { id: "hermes",       name: "Hermes",       role: "Assassin",  emoji: "👟"  },
  { id: "hippolyta",    name: "Hippolyta",    role: "Warrior",   emoji: "🪓"  },
  { id: "medusa",       name: "Medusa",       role: "Mage",      emoji: "🐍"  },
  { id: "odysseus",     name: "Odysseus",     role: "Guardian",  emoji: "🌊"  },
  { id: "orpheus",      name: "Orpheus",      role: "Support",   emoji: "🎵"  },
  { id: "perseus",      name: "Perseus",      role: "Warrior",   emoji: "✨"  },
  { id: "poseidon",     name: "Poseidon",     role: "Tank",      emoji: "🔱"  },
  { id: "prometheus",   name: "Prometheus",   role: "Mage",      emoji: "🔥"  },
  { id: "scylla",       name: "Scylla",       role: "Assassin",  emoji: "🦑"  },
  { id: "theseus",      name: "Theseus",      role: "Guardian",  emoji: "🗡️"  },
  { id: "zeus",         name: "Zeus",         role: "Mage",      emoji: "⚡"  },
];

export const ROLE_COLORS: Record<HeroRole, string> = {
  Guardian:  "rgba(42,171,184,0.8)",
  Warrior:   "rgba(201,151,58,0.8)",
  Mage:      "rgba(160,100,200,0.8)",
  Support:   "rgba(93,187,138,0.8)",
  Assassin:  "rgba(196,42,58,0.8)",
  Tank:      "rgba(160,160,160,0.8)",
};
