import { TEAMS_DRAFT_STORAGE_KEY } from "@/lib/teamsDraft";
import { RANKED_VOTE_STORAGE_KEY } from "@/lib/rankedVote";

// Which deeper step of the Battle flow (assemble teams on /teams -> an
// optional ranked-balance vote -> an optional live match timer -> record
// the result on /matches/new) the user last successfully loaded. Written
// by each of those three pages once they've confirmed they have real data
// to work with. /teams itself never writes this — it's the flow's own
// starting point, so there's nothing to "resume" back into from there.
export const LAST_BATTLE_STEP_STORAGE_KEY = "goa-last-battle-step";

export type BattleStep = "/teams/vote" | "/matches/timer" | "/matches/new";

export const BATTLE_STEP_LABELS: Record<BattleStep, string> = {
  "/teams/vote": "voting on teams",
  "/matches/timer": "the live match timer",
  "/matches/new": "recording the match",
};

// Guards against a stale pointer: the step is only worth resuming if the
// underlying data it depends on is still there (e.g. it wasn't already
// cleared by the flow completing or being abandoned elsewhere).
export function hasValidBattleProgress(step: string | null): step is BattleStep {
  if (step === "/teams/vote") return !!localStorage.getItem(RANKED_VOTE_STORAGE_KEY);
  if (step === "/matches/timer" || step === "/matches/new")
    return !!localStorage.getItem(TEAMS_DRAFT_STORAGE_KEY);
  return false;
}
