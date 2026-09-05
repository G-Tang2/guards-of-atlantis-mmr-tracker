import { HEROES } from "@/lib/heroes";
import { Badge } from "@/lib/badges";

export type Team = "atlantis" | "titans" | "none";

export type Player = {
  id: string;
  name: string;
  mmr: number;
  avatar_url?: string | null;
};

export type MatchPlayer = {
  player_id: string;
  team: Team;
  players: Player;
  mmr_before: number;
  mmr_after: number;
  hero_id?: string | null;
  is_bounty?: boolean;
  is_first_hero_win?: boolean;
  action_time_seconds?: number | null;
  badge_earned?: Badge | null;
  badges_completed?: Badge[];
  // Actual signed MMR amount each badge reward contributed to this row,
  // precomputed at match-recording time (see lib/badgeRewards.ts and
  // app/matches/new/page.tsx) — null/absent on older rows recorded before
  // these existed, and on rows the reward didn't apply to.
  bounty_bonus?: number | null;
  devoted_bonus?: number | null;
  renowned_bonus?: number | null;
  defiant_bonus?: number | null;
};

export enum WinCondition {
  LAST_PUSH = "LAST_PUSH",
  THRONE = "THRONE",
  LIFE_COUNTER = "LIFE_COUNTER",
}

const winConditionLabel: Record<string, string> = {
  LAST_PUSH: "LAST PUSH",
  THRONE: "THRONE",
  LIFE_COUNTER: "LIFE COUNTER",
};

export const formatWinCondition = (wc?: WinCondition | string | null) => {
  if (!wc) return "";
  return `BY ${winConditionLabel[wc]}`;
};

// How a match's two teams were assembled. "custom" covers both a fresh
// manual build (search/add only, no split tool used) and any split-tool
// result that was subsequently hand-edited via drag-and-drop.
export type DraftMethod =
  | "captains_draft"
  | "random"
  | "balanced"
  | "ranked_balanced"
  | "custom";

export const draftMethodLabel: Record<string, string> = {
  captains_draft: "Captain's Draft",
  random: "Random Split",
  balanced: "Balanced Split",
  ranked_balanced: "Ranked Balance",
  custom: "Custom Draft",
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

export const renderStars = (n: number | string | undefined | null) =>
  "★".repeat(Number(n) || 0);

export const getHero = (heroId?: string | null) =>
  HEROES.find((h) => h.id === heroId);

// A draw isn't a win for either side (nor a loss) — check isDraw separately
// wherever that third outcome needs its own handling.
export const didWin = (team: string, winner: string) => team === winner;

export const isDraw = (winner: string) => winner === "none";

export const formatActionTime = (totalSeconds: number) => `${totalSeconds}s`;
