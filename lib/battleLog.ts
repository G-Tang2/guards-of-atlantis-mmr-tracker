import { Skull, Sword, Shield, Target, Flame, Heart, Ghost, Coins, LucideIcon } from "lucide-react";

// Handoff between /matches/battle-log (round-by-round detail entry) and
// /matches/new (final save) — same sessionStorage pattern as teamsDraft.ts.
// Only present when the user opted into detailed recording from /teams;
// /matches/new saves it alongside the match if found, then clears it.
export const BATTLE_LOG_STORAGE_KEY = "goa-battle-log";

export const ROUND_STAT_KEYS = [
  "hero_kills",
  "deaths",
  "hero_attacks",
  "hero_defends",
  "minion_kills",
  "heavy_minion_kills",
  "farm",
  "heals",
] as const;

export type RoundStatKey = (typeof ROUND_STAT_KEYS)[number];

export const ROUND_STAT_LABELS: Record<RoundStatKey, string> = {
  hero_kills: "Hero Kill",
  deaths: "Death",
  hero_attacks: "Hero Attack",
  hero_defends: "Hero Defend",
  minion_kills: "Minion Kill",
  heavy_minion_kills: "Heavy Minion Kill",
  farm: "Farm",
  heals: "Heal",
};

export const ROUND_STAT_ICONS: Record<RoundStatKey, LucideIcon> = {
  hero_kills: Skull,
  deaths: Ghost,
  hero_attacks: Sword,
  hero_defends: Shield,
  minion_kills: Target,
  heavy_minion_kills: Flame,
  farm: Coins,
  heals: Heart,
};

export type PlayerRoundStats = Record<RoundStatKey, number>;

export const emptyRoundStats = (): PlayerRoundStats => ({
  hero_kills: 0,
  deaths: 0,
  hero_attacks: 0,
  hero_defends: 0,
  minion_kills: 0,
  heavy_minion_kills: 0,
  farm: 0,
  heals: 0,
});

export type Round = {
  roundNumber: number;
  // player_id -> that player's stats for this round
  stats: Record<string, PlayerRoundStats>;
};

export type BattleLog = {
  rounds: Round[];
};
