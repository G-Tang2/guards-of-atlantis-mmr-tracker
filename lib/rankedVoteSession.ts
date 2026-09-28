// Shared between the match creator's own page (app/teams/vote/page.tsx)
// and the public shareable-link page any other voter opens
// (app/vote/[id]/page.tsx) — both devices read and write the *same*
// ranked_vote_sessions row (see supabase/migrations/0012), kept in sync
// live via Postgres realtime, so this is the one place their shared
// vote-tallying logic and DB access live.

import { supabaseClient } from "@/lib/supabase/client";
import { Split } from "@/lib/rankedBalance";

export type VoteSessionPlayer = {
  id: string;
  name: string;
  mmr: number;
  avatar_url?: string | null;
};

export type VoteStage =
  | "impossible"
  | "setup"
  | "ban_ballot"
  | "ban_results"
  | "ballot"
  | "results";

export type VoteSessionRow = {
  id: string;
  player_ids: string[];
  vote_allowance: Record<string, number>;
  splits: Split<VoteSessionPlayer>[];
  total_votes: number;
  stage: VoteStage;
  wants_ban: boolean | null;
  active_indices: number[];
  ban_votes: number[];
  ban_votes_cast: number;
  ban_voters: Record<string, number>;
  banned_indices: number[];
  votes: number[];
  votes_cast: number;
  voters: Record<string, number>;
  winner_index: number | null;
  tied_indices: number[];
  skipped_voting: boolean;
  choose_round_skipped: boolean;
};

// How many options get banned before the final choice — fixed at 2 per
// the group's own house rule for this vote.
export const BAN_COUNT = 2;

export const computeVoteAllowance = (
  playerIds: string[],
  baseOwnerIds: Set<string>,
): Record<string, number> => {
  const allowance: Record<string, number> = {};
  playerIds.forEach((id) => {
    allowance[id] = baseOwnerIds.has(id) ? 2 : 1;
  });
  return allowance;
};

export const totalVotesFromAllowance = (allowance: Record<string, number>): number =>
  Object.values(allowance).reduce((s, n) => s + n, 0);

// Works out exactly which `countToEliminate` indices (by ban-vote count,
// most-banned first) should be removed. Splits the answer into `locked`
// (unambiguously in — strictly more ban votes than the cutoff) and
// `tiedPool` (tied at the cutoff value, contested for whatever slots
// `locked` didn't already fill) so the caller only needs to run a random
// tie-break when tiedPool has more entries than it actually needs to fill.
function computeElimination(
  voteCounts: number[],
  indices: number[],
  countToEliminate: number,
): { locked: number[]; tiedPool: number[]; neededFromTied: number } {
  const sorted = [...indices].sort((a, b) => voteCounts[b] - voteCounts[a]);
  const cutoffValue = voteCounts[sorted[countToEliminate - 1]];
  const locked = indices.filter((i) => voteCounts[i] > cutoffValue);
  const tiedPool = indices.filter((i) => voteCounts[i] === cutoffValue);
  const neededFromTied = countToEliminate - locked.length;
  return { locked, tiedPool, neededFromTied };
}

// Never eliminates more options than actually got a ban vote — if everyone
// converged on banning the same single option and left every other option
// at 0, that's the group's real intent, not a reason to force a second,
// arbitrary elimination among untouched options just to hit BAN_COUNT.
export function resolveBanElimination(
  finalBanVotes: number[],
  activeIndices: number[],
  splitCount: number,
): number[] {
  const votedOptionCount = activeIndices.filter((i) => finalBanVotes[i] > 0).length;
  const countToEliminate = Math.min(BAN_COUNT, splitCount - 1, votedOptionCount);
  const { locked, tiedPool, neededFromTied } = computeElimination(
    finalBanVotes,
    activeIndices,
    countToEliminate,
  );
  const eliminated =
    neededFromTied > 0 && tiedPool.length > neededFromTied
      ? [...tiedPool].sort(() => Math.random() - 0.5).slice(0, neededFromTied)
      : tiedPool.slice(0, Math.max(neededFromTied, 0));
  return [...locked, ...eliminated];
}

// Choose-round settle: who won, and which indices were tied for it. The
// winner is decided here, once, the same instant for every device — the
// match creator's own page can still play a brief reveal flourish over
// `tied` afterward (see runTieBreak there), but that's cosmetic playback
// of an already-decided result, not a separate/later determination.
export function resolveChooseWinner(
  finalVotes: number[],
  activeIndices: number[],
): { winnerIndex: number; tied: number[] } {
  const max = Math.max(...activeIndices.map((i) => finalVotes[i]));
  const tied = activeIndices.filter((i) => finalVotes[i] === max);
  const winnerIndex = tied[Math.floor(Math.random() * tied.length)];
  return { winnerIndex, tied };
}

// Display order for a list that includes banned options — everything
// still in the running first (in its original order), banned options
// pushed to the bottom (also keeping their own relative order).
export function sortBannedLast<T>(splits: T[], bannedIndices: number[]): number[] {
  const banned = new Set(bannedIndices);
  const indices = splits.map((_, i) => i);
  return [...indices.filter((i) => !banned.has(i)), ...indices.filter((i) => banned.has(i))];
}

// ── DB access ────────────────────────────────────────────────────────────
// Every write below is guarded on the vote-count column it's changing
// still matching what the caller last saw — two devices completing a tap
// at (almost) the same instant otherwise risk double-counting it, or
// double-settling the round (each rolling its own random tie-break and
// disagreeing on the outcome). Losing that race isn't an error: it just
// means the write applies nothing, and the loser's own view catches up
// moments later via the realtime subscription both pages hold open.

// Returns the updated row on success (so the caller can update its own
// local view immediately, without waiting on the realtime echo of its own
// write), or null if the guard didn't match — i.e. this device lost a race
// with another write in between. Losing isn't an error the caller needs
// to surface loudly: the realtime subscription both pages hold open will
// deliver the winning write moments later regardless.
async function guardedUpdate(
  sessionId: string,
  guardColumn: "votes_cast" | "ban_votes_cast" | "stage",
  expected: number | string,
  patch: Record<string, unknown>,
): Promise<VoteSessionRow | null> {
  const { data, error } = await supabaseClient
    .from("ranked_vote_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq(guardColumn, expected)
    .select("*")
    .maybeSingle();
  return error ? null : (data as VoteSessionRow | null);
}

// A tap commits its vote count immediately (so it's visible to every other
// device watching the live dots right away) but deliberately does *not*
// settle the round even if this happens to be the completing vote — that
// stays deferred to settleBanIfComplete/settleChooseIfComplete below, run
// only once the tapping device's own confirm pop-up is dismissed with
// Continue (see showConfirmationThen in app/teams/vote/page.tsx). That
// keeps the same safety window the original single-device flow always
// had: even the very last vote can still be undone right up until
// Continue is actually pressed, instead of the round auto-revealing the
// instant the count happens to reach total_votes.
//
// `voterId` is only ever set by the shareable-link page (app/vote/[id]) —
// the match creator's own device keeps voting anonymously into the same
// shared counters, exactly as it always has (see ban_voters/voters'
// column comments in the migration).
export function incrementBanVote(
  session: VoteSessionRow,
  optionIndex: number,
  voterId?: string,
): Promise<VoteSessionRow | null> {
  const nextBanVotes = session.ban_votes.map((v, i) => (i === optionIndex ? v + 1 : v));
  const patch: Record<string, unknown> = {
    ban_votes: nextBanVotes,
    ban_votes_cast: session.ban_votes_cast + 1,
  };
  if (voterId) {
    patch.ban_voters = { ...session.ban_voters, [voterId]: (session.ban_voters[voterId] ?? 0) + 1 };
  }
  return guardedUpdate(session.id, "ban_votes_cast", session.ban_votes_cast, patch);
}

export function undoBanVote(
  session: VoteSessionRow,
  optionIndex: number,
  voterId?: string,
): Promise<VoteSessionRow | null> {
  const prevBanVotes = session.ban_votes.map((v, i) =>
    i === optionIndex ? Math.max(0, v - 1) : v,
  );
  const patch: Record<string, unknown> = {
    ban_votes: prevBanVotes,
    ban_votes_cast: Math.max(0, session.ban_votes_cast - 1),
  };
  if (voterId) {
    patch.ban_voters = {
      ...session.ban_voters,
      [voterId]: Math.max(0, (session.ban_voters[voterId] ?? 1) - 1),
    };
  }
  return guardedUpdate(session.id, "ban_votes_cast", session.ban_votes_cast, patch);
}

// Called after dismissing the confirm pop-up with Continue — a no-op
// (resolves the same session right back) unless the tally is actually
// complete, so callers can just always call it there without checking
// first themselves.
export function settleBanIfComplete(session: VoteSessionRow): Promise<VoteSessionRow | null> {
  if (session.ban_votes_cast < session.total_votes) return Promise.resolve(session);
  const bannedIndices = resolveBanElimination(
    session.ban_votes,
    session.active_indices,
    session.splits.length,
  );
  return guardedUpdate(session.id, "stage", session.stage, {
    banned_indices: bannedIndices,
    stage: "ban_results",
  });
}

export function incrementChooseVote(
  session: VoteSessionRow,
  optionIndex: number,
  voterId?: string,
): Promise<VoteSessionRow | null> {
  const nextVotes = session.votes.map((v, i) => (i === optionIndex ? v + 1 : v));
  const patch: Record<string, unknown> = { votes: nextVotes, votes_cast: session.votes_cast + 1 };
  if (voterId) {
    patch.voters = { ...session.voters, [voterId]: (session.voters[voterId] ?? 0) + 1 };
  }
  return guardedUpdate(session.id, "votes_cast", session.votes_cast, patch);
}

export function undoChooseVote(
  session: VoteSessionRow,
  optionIndex: number,
  voterId?: string,
): Promise<VoteSessionRow | null> {
  const prevVotes = session.votes.map((v, i) => (i === optionIndex ? Math.max(0, v - 1) : v));
  const patch: Record<string, unknown> = {
    votes: prevVotes,
    votes_cast: Math.max(0, session.votes_cast - 1),
  };
  if (voterId) {
    patch.voters = {
      ...session.voters,
      [voterId]: Math.max(0, (session.voters[voterId] ?? 1) - 1),
    };
  }
  return guardedUpdate(session.id, "votes_cast", session.votes_cast, patch);
}

// See settleBanIfComplete above — same deferred-until-Continue shape.
export function settleChooseIfComplete(session: VoteSessionRow): Promise<VoteSessionRow | null> {
  if (session.votes_cast < session.total_votes) return Promise.resolve(session);
  const { winnerIndex, tied } = resolveChooseWinner(session.votes, session.active_indices);
  return guardedUpdate(session.id, "stage", session.stage, {
    winner_index: winnerIndex,
    tied_indices: tied,
    stage: "results",
  });
}

// ── Host-only flow transitions ──────────────────────────────────────────
// Not vote taps — these move the whole session from one stage to the
// next, so only the match creator's own page ever calls them (the
// shareable-link page has no controls for any of this, see its own
// comment). Guarded on `stage` instead of a vote count, since that's
// what's actually changing.

export function startBanRound(session: VoteSessionRow): Promise<VoteSessionRow | null> {
  const freshBanVotes = new Array(session.splits.length).fill(0);
  return guardedUpdate(session.id, "stage", session.stage, {
    stage: "ban_ballot",
    wants_ban: true,
    ban_votes: freshBanVotes,
    ban_votes_cast: 0,
    ban_voters: {},
  });
}

export function skipBanRound(session: VoteSessionRow): Promise<VoteSessionRow | null> {
  const freshVotes = new Array(session.splits.length).fill(0);
  return guardedUpdate(session.id, "stage", session.stage, {
    stage: "ballot",
    wants_ban: false,
    votes: freshVotes,
    votes_cast: 0,
    voters: {},
  });
}

export function continueAfterBan(session: VoteSessionRow): Promise<VoteSessionRow | null> {
  const remaining = session.splits
    .map((_, i) => i)
    .filter((i) => !session.banned_indices.includes(i));
  if (remaining.length <= 1) {
    return guardedUpdate(session.id, "stage", session.stage, {
      stage: "results",
      active_indices: remaining,
      choose_round_skipped: true,
      winner_index: remaining[0] ?? null,
    });
  }
  const freshVotes = new Array(session.splits.length).fill(0);
  return guardedUpdate(session.id, "stage", session.stage, {
    stage: "ballot",
    active_indices: remaining,
    votes: freshVotes,
    votes_cast: 0,
    voters: {},
  });
}
