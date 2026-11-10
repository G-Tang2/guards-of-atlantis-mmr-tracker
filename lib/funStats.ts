// Pure computation for the /leaderboard/stats "fun stats" page — takes the
// same matches+match_players shape the leaderboard/player pages already
// fetch (see app/leaderboard/page.tsx, app/players/[id]/page.tsx) and
// derives a set of record-book top-3 lists from it. No Supabase calls
// here, so this is unit-testable the same way lib/matchRecording.ts is.

export type FunStatsMatchPlayer = {
  player_id: string;
  team: "atlantis" | "titans";
  hero_id: string | null;
  mmr_before: number;
  mmr_after: number;
  is_bounty?: boolean | null;
};

export type FunStatsMatch = {
  match_number: number;
  winner: "atlantis" | "titans" | "none";
  match_players: FunStatsMatchPlayer[];
  // Only computeMmrMilestones below actually needs this — optional so
  // every other caller/fixture is unaffected.
  created_at?: string;
};

// A pair needs at least this many games together (on the same team) to be
// eligible for the best/worst duo stats below — otherwise a single lucky
// or unlucky game would dominate a "win rate" that doesn't mean anything
// yet. Matches the leaderboard's own MINIMUM_MATCHES_FOR_DISPLAY in spirit.
export const MIN_DUO_GAMES = 5;

// How many ranks deep each stat goes — a full tier (everyone tied at that
// rank's value) is always shown in full, so the result can run longer than
// this when there's a tie right at the cutoff.
export const TOP_N = 3;

export type StreakEntry = {
  playerId: string;
  length: number;
  startMatchNumber: number;
  endMatchNumber: number;
};

export type HeroCountEntry = { playerId: string; heroId: string; count: number };
export type VersatilityEntry = { playerId: string; count: number };
export type VersatileWinEntry = { playerId: string; count: number };
export type BountyEntry = { playerId: string; count: number };
export type IronManEntry = { playerId: string; count: number };
export type ReignEntry = { playerId: string; count: number };
export type PodiumEntry = { playerId: string; count: number };

export type DuoEntry = {
  playerIds: [string, string];
  wins: number;
  losses: number;
  draws: number;
  games: number;
  winRate: number;
};

// A head-to-head rivalry — playerIds is a canonical (sorted) pair, with
// winsFirst/winsSecond counting wins for playerIds[0]/playerIds[1]
// respectively whenever they ended up on opposing teams.
export type NemesisEntry = {
  playerIds: [string, string];
  winsFirst: number;
  winsSecond: number;
  draws: number;
  games: number;
};

export type FunStats = {
  reign: ReignEntry[];
  podium: PodiumEntry[];
  longestWinStreak: StreakEntry[];
  longestLossStreak: StreakEntry[];
  hotStreak: StreakEntry[];
  mostGamesOneHero: HeroCountEntry[];
  mostHeroesPlayed: VersatilityEntry[];
  mostVersatileWins: VersatileWinEntry[];
  bestDuo: DuoEntry[];
  worstDuo: DuoEntry[];
  nemesis: NemesisEntry[];
  ironMan: IronManEntry[];
  bountyHunter: BountyEntry[];
};

// Sorts items by value and keeps every item within the top `n` distinct
// value tiers — e.g. with n=3 and values [9,9,7,5,5,2], every item at
// value 9, 7, or 5 is kept (the 5s make the cutoff even though that's a
// 4th+5th item), so a tie right at the boundary is never silently cut off.
function topN<T>(
  items: T[],
  getValue: (item: T) => number,
  n: number,
  mode: "max" | "min" = "max",
): T[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) =>
    mode === "max" ? getValue(b) - getValue(a) : getValue(a) - getValue(b),
  );
  const distinctValues: number[] = [];
  for (const item of sorted) {
    const v = getValue(item);
    if (distinctValues[distinctValues.length - 1] !== v) distinctValues.push(v);
    if (distinctValues.length > n) break;
  }
  const cutoff = distinctValues[Math.min(n, distinctValues.length) - 1];
  return sorted.filter((item) => (mode === "max" ? getValue(item) >= cutoff : getValue(item) <= cutoff));
}

const duoKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function computeFunStats(
  matches: FunStatsMatch[],
  minDuoGames: number = MIN_DUO_GAMES,
): FunStats {
  const sortedMatches = [...matches].sort((a, b) => a.match_number - b.match_number);

  const perPlayerResults = new Map<string, { matchNumber: number; result: "win" | "loss" | "draw" }[]>();
  const heroCounts = new Map<string, Map<string, number>>();
  const wonHeroIds = new Map<string, Set<string>>();
  const bountyCounts = new Map<string, number>();
  const duoStats = new Map<string, DuoEntry>();
  const nemesisStats = new Map<string, NemesisEntry>();
  const currentMmr = new Map<string, number>();
  const reignCounts = new Map<string, number>();
  const podiumCounts = new Map<string, number>();

  sortedMatches.forEach((match) => {
    const byTeam: Record<"atlantis" | "titans", string[]> = { atlantis: [], titans: [] };
    match.match_players.forEach((mp) => {
      byTeam[mp.team]?.push(mp.player_id);
    });

    match.match_players.forEach((mp) => {
      const result: "win" | "loss" | "draw" =
        match.winner === "none" ? "draw" : mp.team === match.winner ? "win" : "loss";

      const list = perPlayerResults.get(mp.player_id) ?? [];
      list.push({ matchNumber: match.match_number, result });
      perPlayerResults.set(mp.player_id, list);

      if (mp.hero_id) {
        const counts = heroCounts.get(mp.player_id) ?? new Map<string, number>();
        counts.set(mp.hero_id, (counts.get(mp.hero_id) ?? 0) + 1);
        heroCounts.set(mp.player_id, counts);

        if (result === "win") {
          const won = wonHeroIds.get(mp.player_id) ?? new Set<string>();
          won.add(mp.hero_id);
          wonHeroIds.set(mp.player_id, won);
        }
      }

      if (mp.is_bounty) {
        bountyCounts.set(mp.player_id, (bountyCounts.get(mp.player_id) ?? 0) + 1);
      }

      currentMmr.set(mp.player_id, mp.mmr_after);
    });

    // Reign / Podium — after this match, whoever has the highest MMR (or
    // sits in the top 3) among everyone who has played at least once so
    // far "holds the throne" (or "a podium spot") for this match, whether
    // they personally played in it or not (e.g. two other players' match
    // still counts toward the reigning #1's tally, same as if the
    // leaderboard's #1/top-3 slots just didn't move). Ties broken by
    // player id — arbitrary, but deterministic.
    const standings = Array.from(currentMmr.entries()).sort((a, b) =>
      b[1] !== a[1] ? b[1] - a[1] : a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
    );
    if (standings.length > 0) {
      reignCounts.set(standings[0][0], (reignCounts.get(standings[0][0]) ?? 0) + 1);
      standings.slice(0, 3).forEach(([playerId]) => {
        podiumCounts.set(playerId, (podiumCounts.get(playerId) ?? 0) + 1);
      });
    }

    (["atlantis", "titans"] as const).forEach((team) => {
      const roster = byTeam[team];
      for (let i = 0; i < roster.length; i++) {
        for (let j = i + 1; j < roster.length; j++) {
          const a = roster[i];
          const b = roster[j];
          const key = duoKey(a, b);
          const entry = duoStats.get(key) ?? {
            playerIds: (a < b ? [a, b] : [b, a]) as [string, string],
            wins: 0,
            losses: 0,
            draws: 0,
            games: 0,
            winRate: 0,
          };
          entry.games++;
          if (match.winner === "none") entry.draws++;
          else if (match.winner === team) entry.wins++;
          else entry.losses++;
          duoStats.set(key, entry);
        }
      }
    });

    // Nemesis — every opposing-team pair's head-to-head record.
    byTeam.atlantis.forEach((a) => {
      byTeam.titans.forEach((b) => {
        const key = duoKey(a, b);
        const [first, second] = a < b ? [a, b] : [b, a];
        const entry = nemesisStats.get(key) ?? {
          playerIds: [first, second] as [string, string],
          winsFirst: 0,
          winsSecond: 0,
          draws: 0,
          games: 0,
        };
        entry.games++;
        if (match.winner === "none") {
          entry.draws++;
        } else {
          // a is on atlantis and b is on titans in this nested loop, so
          // whichever of them sits on the winning team takes the point.
          const winnerId = match.winner === "atlantis" ? a : b;
          if (winnerId === first) entry.winsFirst++;
          else entry.winsSecond++;
        }
        nemesisStats.set(key, entry);
      });
    });
  });

  // Longest win/loss streaks — walk each player's own match history in
  // order, resetting both counters on anything that isn't a continuation
  // (a draw resets both; a win resets the loss counter and vice versa).
  const winStreaks: StreakEntry[] = [];
  const lossStreaks: StreakEntry[] = [];
  perPlayerResults.forEach((results, playerId) => {
    let curWin = 0;
    let curLoss = 0;
    let winStart = 0;
    let lossStart = 0;
    let bestWin = { length: 0, start: 0, end: 0 };
    let bestLoss = { length: 0, start: 0, end: 0 };

    results.forEach(({ matchNumber, result }) => {
      if (result === "win") {
        if (curWin === 0) winStart = matchNumber;
        curWin++;
        curLoss = 0;
        if (curWin > bestWin.length) bestWin = { length: curWin, start: winStart, end: matchNumber };
      } else if (result === "loss") {
        if (curLoss === 0) lossStart = matchNumber;
        curLoss++;
        curWin = 0;
        if (curLoss > bestLoss.length) bestLoss = { length: curLoss, start: lossStart, end: matchNumber };
      } else {
        curWin = 0;
        curLoss = 0;
      }
    });

    if (bestWin.length > 0) {
      winStreaks.push({ playerId, length: bestWin.length, startMatchNumber: bestWin.start, endMatchNumber: bestWin.end });
    }
    if (bestLoss.length > 0) {
      lossStreaks.push({ playerId, length: bestLoss.length, startMatchNumber: bestLoss.start, endMatchNumber: bestLoss.end });
    }
  });

  // Hot Streak — each player's currently active win streak: consecutive
  // wins trailing off the end of their own match history, regardless of
  // when their last battle actually was.
  const hotStreaks: StreakEntry[] = [];
  perPlayerResults.forEach((results, playerId) => {
    let streak = 0;
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].result !== "win") break;
      streak++;
    }
    if (streak > 0) {
      hotStreaks.push({
        playerId,
        length: streak,
        startMatchNumber: results[results.length - streak].matchNumber,
        endMatchNumber: results[results.length - 1].matchNumber,
      });
    }
  });

  // Iron Man — total battles played, full stop.
  const ironManEntries: IronManEntry[] = Array.from(perPlayerResults.entries()).map(
    ([playerId, results]) => ({ playerId, count: results.length }),
  );

  const heroCountEntries: HeroCountEntry[] = [];
  const versatilityEntries: VersatilityEntry[] = [];
  heroCounts.forEach((counts, playerId) => {
    let bestHero = "";
    let bestCount = 0;
    counts.forEach((count, heroId) => {
      if (count > bestCount) {
        bestCount = count;
        bestHero = heroId;
      }
    });
    if (bestCount > 0) heroCountEntries.push({ playerId, heroId: bestHero, count: bestCount });
    versatilityEntries.push({ playerId, count: counts.size });
  });

  const versatileWinEntries: VersatileWinEntry[] = Array.from(wonHeroIds.entries()).map(
    ([playerId, heroIds]) => ({ playerId, count: heroIds.size }),
  );

  const bountyEntries: BountyEntry[] = [];
  bountyCounts.forEach((count, playerId) => bountyEntries.push({ playerId, count }));

  const duoEntries = Array.from(duoStats.values())
    .filter((d) => d.games >= minDuoGames)
    .map((d) => ({ ...d, winRate: d.games === 0 ? 0 : (d.wins / d.games) * 100 }));

  const reignEntries: ReignEntry[] = Array.from(reignCounts.entries()).map(([playerId, count]) => ({ playerId, count }));
  const podiumEntries: PodiumEntry[] = Array.from(podiumCounts.entries()).map(([playerId, count]) => ({ playerId, count }));

  return {
    reign: topN(reignEntries, (e) => e.count, TOP_N),
    podium: topN(podiumEntries, (e) => e.count, TOP_N),
    longestWinStreak: topN(winStreaks, (e) => e.length, TOP_N),
    longestLossStreak: topN(lossStreaks, (e) => e.length, TOP_N),
    hotStreak: topN(hotStreaks, (e) => e.length, TOP_N),
    mostGamesOneHero: topN(heroCountEntries, (e) => e.count, TOP_N),
    mostHeroesPlayed: topN(versatilityEntries, (e) => e.count, TOP_N),
    mostVersatileWins: topN(versatileWinEntries, (e) => e.count, TOP_N),
    bestDuo: topN(duoEntries, (e) => e.winRate, TOP_N),
    worstDuo: topN(duoEntries, (e) => e.winRate, TOP_N, "min"),
    nemesis: topN(Array.from(nemesisStats.values()), (e) => e.games, TOP_N),
    ironMan: topN(ironManEntries, (e) => e.count, TOP_N),
    bountyHunter: topN(bountyEntries, (e) => e.count, TOP_N),
  };
}

export const MMR_MILESTONE_START = 1100;
export const MMR_MILESTONE_STEP = 100;

export type MmrMilestoneEntry = {
  threshold: number;
  playerId: string | null; // null if nobody has reached it yet
  matchNumber: number | null;
  date: string | null; // that match's created_at, verbatim
};

// Walks every match_player row looking for the match in which a player's
// mmr crossed each 100-wide milestone (1100, 1200, …) for the first time —
// no starting mmr has ever been at or above 1100 (700 by default, 1000
// before that), so mmr_after is the only way a milestone gets crossed.
// Ties on the same match_number (two players crossing it in the same
// battle) break on player id, arbitrarily but deterministically.
//
// Returns a contiguous run starting at 1100: every milestone someone has
// actually reached, in order, plus exactly one trailing entry (playerId
// null) for the next, not-yet-reached milestone — the caller renders that
// one as a "?" slot and stops there.
export function computeMmrMilestones(matches: FunStatsMatch[]): MmrMilestoneEntry[] {
  const firstToReach = new Map<number, { playerId: string; matchNumber: number; date: string | null }>();

  matches.forEach((match) => {
    match.match_players.forEach((mp) => {
      for (
        let threshold = Math.floor(mp.mmr_before / MMR_MILESTONE_STEP + 1) * MMR_MILESTONE_STEP;
        threshold <= mp.mmr_after;
        threshold += MMR_MILESTONE_STEP
      ) {
        if (threshold < MMR_MILESTONE_START) continue;
        const existing = firstToReach.get(threshold);
        if (
          !existing ||
          match.match_number < existing.matchNumber ||
          (match.match_number === existing.matchNumber && mp.player_id < existing.playerId)
        ) {
          firstToReach.set(threshold, {
            playerId: mp.player_id,
            matchNumber: match.match_number,
            date: match.created_at ?? null,
          });
        }
      }
    });
  });

  const entries: MmrMilestoneEntry[] = [];
  for (let threshold = MMR_MILESTONE_START; ; threshold += MMR_MILESTONE_STEP) {
    const reached = firstToReach.get(threshold);
    entries.push({
      threshold,
      playerId: reached?.playerId ?? null,
      matchNumber: reached?.matchNumber ?? null,
      date: reached?.date ?? null,
    });
    if (!reached) break;
  }
  return entries;
}
