import { describe, expect, it } from "vitest";
import { computeFunStats, FunStatsMatch } from "@/lib/funStats";

// Four players, four matches, hand-picked so streaks/heroes/duos all land
// on deliberate, hand-verifiable ties and winners:
//
//   M1 atlantis[p1,p2] beat titans[p3,p4]
//   M2 atlantis[p1,p3] beat titans[p2,p4]
//   M3 atlantis[p1,p4] lost to titans[p2,p3]
//   M4 atlantis[p2,p3] drew titans[p1,p4]
//
// p1: win, win, loss, draw   -> longest win streak 2 (M1-M2)
// p2: win, loss, win, draw   -> longest win streak 1
// p3: loss, win, win, draw   -> longest win streak 2 (M2-M3)
// p4: loss, loss, loss, draw -> longest loss streak 3 (M1-M3), unique
const matches: FunStatsMatch[] = [
  {
    match_number: 1,
    winner: "atlantis",
    match_players: [
      { player_id: "p1", team: "atlantis", hero_id: "arien", mmr_before: 1000, mmr_after: 1030, is_bounty: true },
      { player_id: "p2", team: "atlantis", hero_id: "brogan", mmr_before: 1000, mmr_after: 1025 },
      { player_id: "p3", team: "titans", hero_id: "dodger", mmr_before: 1000, mmr_after: 975 },
      { player_id: "p4", team: "titans", hero_id: "wasp", mmr_before: 1000, mmr_after: 970 },
    ],
  },
  {
    match_number: 2,
    winner: "atlantis",
    match_players: [
      { player_id: "p1", team: "atlantis", hero_id: "arien", mmr_before: 1030, mmr_after: 1055, is_bounty: true },
      { player_id: "p3", team: "atlantis", hero_id: "dodger", mmr_before: 975, mmr_after: 1000 },
      { player_id: "p2", team: "titans", hero_id: "brogan", mmr_before: 1025, mmr_after: 1000 },
      { player_id: "p4", team: "titans", hero_id: "wasp", mmr_before: 970, mmr_after: 945 },
    ],
  },
  {
    match_number: 3,
    winner: "titans",
    match_players: [
      { player_id: "p1", team: "atlantis", hero_id: "sabina", mmr_before: 1055, mmr_after: 1020 },
      { player_id: "p4", team: "atlantis", hero_id: "wasp", mmr_before: 945, mmr_after: 910 },
      { player_id: "p2", team: "titans", hero_id: "xargatha", mmr_before: 1000, mmr_after: 1035 },
      { player_id: "p3", team: "titans", hero_id: "dodger", mmr_before: 1000, mmr_after: 1035, is_bounty: true },
    ],
  },
  {
    match_number: 4,
    winner: "none",
    match_players: [
      { player_id: "p2", team: "atlantis", hero_id: "brogan", mmr_before: 1035, mmr_after: 1035 },
      { player_id: "p3", team: "atlantis", hero_id: "dodger", mmr_before: 1035, mmr_after: 1035 },
      { player_id: "p1", team: "titans", hero_id: "arien", mmr_before: 1020, mmr_after: 1020 },
      { player_id: "p4", team: "titans", hero_id: "wasp", mmr_before: 910, mmr_after: 910 },
    ],
  },
];

describe("computeFunStats", () => {
  it("finds the longest win streak, tied between p1 and p3 at length 2", () => {
    // p4 never won at all, so only p1/p2/p3 have a win streak entry; with
    // just 2 distinct values (2 and 1) among them, TOP_N=3 keeps all 3.
    const { longestWinStreak } = computeFunStats(matches);
    expect(longestWinStreak).toHaveLength(3);
    const topTier = longestWinStreak.filter((e) => e.length === 2);
    expect(topTier.map((e) => e.playerId).sort()).toEqual(["p1", "p3"]);
    const p1Entry = topTier.find((e) => e.playerId === "p1")!;
    expect(p1Entry.startMatchNumber).toBe(1);
    expect(p1Entry.endMatchNumber).toBe(2);
  });

  it("finds the longest losing streak, unique to p4 at length 3", () => {
    // Only 2 distinct values exist (3 and 1), so TOP_N=3 keeps everyone —
    // p4's 3-game streak is still clearly first/unique at that value.
    const { longestLossStreak } = computeFunStats(matches);
    expect(longestLossStreak).toHaveLength(4);
    expect(longestLossStreak[0]).toEqual({
      playerId: "p4",
      length: 3,
      startMatchNumber: 1,
      endMatchNumber: 3,
    });
    expect(longestLossStreak.filter((e) => e.length === 3)).toHaveLength(1);
  });

  it("finds the most games on one hero, tied between p3 (dodger x4) and p4 (wasp x4)", () => {
    // Only 2 distinct values exist (4 and 3), so TOP_N=3 keeps all 4
    // players — the top tier is still exactly p3/p4.
    const { mostGamesOneHero } = computeFunStats(matches);
    expect(mostGamesOneHero).toHaveLength(4);
    const topTier = mostGamesOneHero.filter((e) => e.count === 4);
    const byPlayer = new Map(topTier.map((e) => [e.playerId, e.heroId]));
    expect(byPlayer.get("p3")).toBe("dodger");
    expect(byPlayer.get("p4")).toBe("wasp");
  });

  it("finds the most heroes played, with p1 and p2 tied in 1st at 2 distinct heroes", () => {
    // Only 2 distinct values exist at all here (2 and 1), so with TOP_N=3
    // every player makes the cut — the top tier is still exactly p1/p2.
    const { mostHeroesPlayed } = computeFunStats(matches);
    expect(mostHeroesPlayed).toHaveLength(4);
    const topTier = mostHeroesPlayed.filter((e) => e.count === 2).map((e) => e.playerId).sort();
    expect(topTier).toEqual(["p1", "p2"]);
  });

  it("finds the best and worst duo once the games-together threshold is lowered to 2", () => {
    const { bestDuo, worstDuo } = computeFunStats(matches, 2);
    // p2+p3: win (M3), draw (M4) -> 1/2 = 50%
    // p1+p4: loss (M3), draw (M4) -> 0/2 = 0%
    // Only 2 qualifying pairs exist, so both make the top-3 cut either way.
    expect(bestDuo).toHaveLength(2);
    expect(bestDuo[0].winRate).toBe(50);
    expect(bestDuo[0].playerIds.sort()).toEqual(["p2", "p3"]);

    expect(worstDuo).toHaveLength(2);
    expect(worstDuo[0].winRate).toBe(0);
    expect(worstDuo[0].playerIds.sort()).toEqual(["p1", "p4"]);
  });

  it("excludes duos below the games-together threshold by default", () => {
    // Every pair above played together exactly once at the default
    // MIN_DUO_GAMES (5) except p1+p4 and p2+p3, which only reach 2.
    const { bestDuo, worstDuo } = computeFunStats(matches);
    expect(bestDuo).toHaveLength(0);
    expect(worstDuo).toHaveLength(0);
  });

  it("finds the bounty hunter as p1, with 2 bounty bonuses earned", () => {
    const { bountyHunter } = computeFunStats(matches);
    expect(bountyHunter).toEqual(
      expect.arrayContaining([{ playerId: "p1", count: 2 }]),
    );
    expect(bountyHunter[0]).toEqual({ playerId: "p1", count: 2 });
  });

  it("finds no hot streaks, since every player's most recent battle (M4) was a draw", () => {
    const { hotStreak } = computeFunStats(matches);
    expect(hotStreak).toEqual([]);
  });

  it("returns empty arrays for no matches", () => {
    const stats = computeFunStats([]);
    expect(stats.longestWinStreak).toEqual([]);
    expect(stats.longestLossStreak).toEqual([]);
    expect(stats.hotStreak).toEqual([]);
    expect(stats.mostGamesOneHero).toEqual([]);
    expect(stats.mostHeroesPlayed).toEqual([]);
    expect(stats.bestDuo).toEqual([]);
    expect(stats.worstDuo).toEqual([]);
    expect(stats.nemesis).toEqual([]);
    expect(stats.ironMan).toEqual([]);
    expect(stats.bountyHunter).toEqual([]);
  });
});

describe("computeFunStats hot streak, iron man, and nemesis", () => {
  // p1 vs p2 face off directly five times in a row, with p3 dropping in
  // just once (as a second titan alongside p2) for match 3:
  //
  //   M1 p1 beat p2            p1: win
  //   M2 p1 beat p2            p1: win
  //   M3 p1 lost to p2+p3      p1: loss, p2: win, p3: win
  //   M4 p1 beat p2            p1: win
  //   M5 p1 beat p2            p1: win
  //
  // p1: win,win,loss,win,win -> longest streak 2 (M1-M2, first occurrence
  // kept over the M4-M5 tie), but *current* hot streak is 2 as well, just
  // trailing at M4-M5 instead.
  // p2: loss,loss,win,loss,loss -> last result is a loss, so no hot streak.
  // p3: a single win (M3) -> it's their only battle, so hot streak = 1 and
  // games played (Iron Man) = 1.
  const rivalryMatches: FunStatsMatch[] = [
    {
      match_number: 1,
      winner: "atlantis",
      match_players: [
        { player_id: "p1", team: "atlantis", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
        { player_id: "p2", team: "titans", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
      ],
    },
    {
      match_number: 2,
      winner: "atlantis",
      match_players: [
        { player_id: "p1", team: "atlantis", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
        { player_id: "p2", team: "titans", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
      ],
    },
    {
      match_number: 3,
      winner: "titans",
      match_players: [
        { player_id: "p1", team: "atlantis", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
        { player_id: "p2", team: "titans", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
        { player_id: "p3", team: "titans", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
      ],
    },
    {
      match_number: 4,
      winner: "atlantis",
      match_players: [
        { player_id: "p1", team: "atlantis", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
        { player_id: "p2", team: "titans", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
      ],
    },
    {
      match_number: 5,
      winner: "atlantis",
      match_players: [
        { player_id: "p1", team: "atlantis", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
        { player_id: "p2", team: "titans", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
      ],
    },
  ];

  it("finds p1's hot streak trailing at M4-M5, distinct from the all-time streak at M1-M2", () => {
    const { longestWinStreak, hotStreak } = computeFunStats(rivalryMatches);
    // p2 and p3 each have a lone length-1 win streak too, which (along with
    // p1's length-2 one) still fits within TOP_N=3's 2 distinct value tiers.
    expect(longestWinStreak[0]).toEqual({ playerId: "p1", length: 2, startMatchNumber: 1, endMatchNumber: 2 });
    // p2's last battle (M5) was a loss, so they're excluded entirely; p3's
    // only battle (M3) was a win, so they trail in at length 1.
    expect(hotStreak[0]).toEqual({ playerId: "p1", length: 2, startMatchNumber: 4, endMatchNumber: 5 });
    expect(hotStreak.find((e) => e.playerId === "p2")).toBeUndefined();
    expect(hotStreak.find((e) => e.playerId === "p3")).toEqual({
      playerId: "p3", length: 1, startMatchNumber: 3, endMatchNumber: 3,
    });
  });

  it("finds p1 and p2 tied for Iron Man at 5 battles each", () => {
    const { ironMan } = computeFunStats(rivalryMatches);
    expect(ironMan).toHaveLength(3);
    const topTier = ironMan.filter((e) => e.count === 5).map((e) => e.playerId).sort();
    expect(topTier).toEqual(["p1", "p2"]);
    expect(ironMan.find((e) => e.playerId === "p3")).toEqual({ playerId: "p3", count: 1 });
  });

  it("finds p1 vs p2 as the top nemesis pairing, 4 wins to 1 across 5 meetings", () => {
    const { nemesis } = computeFunStats(rivalryMatches);
    const topPair = nemesis.find((e) => e.games === 5)!;
    expect(topPair.playerIds).toEqual(["p1", "p2"]);
    expect(topPair.winsFirst).toBe(4);
    expect(topPair.winsSecond).toBe(1);
    expect(topPair.draws).toBe(0);
  });
});

describe("computeFunStats top-3 cutoff", () => {
  // 5 players, each appearing only as a lone bounty-earner in their own
  // string of matches, with deliberately distinct counts: p1=4, p2=p3=3,
  // p4=2, p5=1 — four distinct value tiers. Top 3 should keep the 4/3/3/2
  // tier and drop p5's lone-value tier entirely.
  const bountyMatches: FunStatsMatch[] = [];
  let matchNumber = 1;
  const addBountyMatches = (playerId: string, count: number) => {
    for (let i = 0; i < count; i++) {
      bountyMatches.push({
        match_number: matchNumber++,
        winner: "none",
        match_players: [
          { player_id: playerId, team: "atlantis", hero_id: null, mmr_before: 1000, mmr_after: 1000, is_bounty: true },
        ],
      });
    }
  };
  addBountyMatches("p1", 4);
  addBountyMatches("p2", 3);
  addBountyMatches("p3", 3);
  addBountyMatches("p4", 2);
  addBountyMatches("p5", 1);

  it("keeps every player within the top 3 value tiers and drops the rest", () => {
    const { bountyHunter } = computeFunStats(bountyMatches);
    const byPlayer = new Map(bountyHunter.map((e) => [e.playerId, e.count]));
    expect(byPlayer.get("p1")).toBe(4);
    expect(byPlayer.get("p2")).toBe(3);
    expect(byPlayer.get("p3")).toBe(3);
    expect(byPlayer.get("p4")).toBe(2);
    expect(byPlayer.has("p5")).toBe(false);
    expect(bountyHunter).toHaveLength(4);
  });
});

describe("computeFunStats reign (battles played by the league while holding #1 MMR)", () => {
  // 3 players. MMR tracked via mmr_after only — hero/team/winner fields are
  // irrelevant to this stat, so left at harmless placeholder values.
  //
  //   M1 p1=1050, p2=950           -> only p1/p2 have played; p1 leads (1050)
  //   M2 p2=980,  p3=820           -> p1 still leads (1050 > 980 > 820),
  //                                   despite not playing this match at all
  //   M3 p2=1100, p1=1000          -> p2 overtakes (1100 > 1000)
  //   M4 p3=830,  p1=990           -> p2 still leads (1100, unchanged),
  //                                   despite not playing this match either
  //
  // p1 leads after M1 and M2 (2 matches); p2 leads after M3 and M4 (2
  // matches) — a tie, and p2's M4 credit is the whole point: p2 didn't
  // play M4 (p1 vs p3) but still "held the throne" for it.
  const matches: FunStatsMatch[] = [
    {
      match_number: 1,
      winner: "atlantis",
      match_players: [
        { player_id: "p1", team: "atlantis", hero_id: null, mmr_before: 1000, mmr_after: 1050 },
        { player_id: "p2", team: "titans", hero_id: null, mmr_before: 1000, mmr_after: 950 },
      ],
    },
    {
      match_number: 2,
      winner: "atlantis",
      match_players: [
        { player_id: "p2", team: "atlantis", hero_id: null, mmr_before: 950, mmr_after: 980 },
        { player_id: "p3", team: "titans", hero_id: null, mmr_before: 1000, mmr_after: 820 },
      ],
    },
    {
      match_number: 3,
      winner: "atlantis",
      match_players: [
        { player_id: "p2", team: "atlantis", hero_id: null, mmr_before: 980, mmr_after: 1100 },
        { player_id: "p1", team: "titans", hero_id: null, mmr_before: 1050, mmr_after: 1000 },
      ],
    },
    {
      match_number: 4,
      winner: "titans",
      match_players: [
        { player_id: "p1", team: "atlantis", hero_id: null, mmr_before: 1000, mmr_after: 990 },
        { player_id: "p3", team: "titans", hero_id: null, mmr_before: 820, mmr_after: 830 },
      ],
    },
  ];

  it("credits p1 for M1-M2 and p2 for M3-M4, including the match each led without playing", () => {
    const { reign } = computeFunStats(matches);
    const byPlayer = new Map(reign.map((e) => [e.playerId, e.count]));
    expect(byPlayer.get("p1")).toBe(2);
    expect(byPlayer.get("p2")).toBe(2);
    expect(byPlayer.has("p3")).toBe(false);
    // Every match is attributed to exactly one reigning player.
    expect(reign.reduce((sum, e) => sum + e.count, 0)).toBe(matches.length);
  });
});

describe("computeFunStats podium (battles played by the league while in the top 3 MMR)", () => {
  // 4 players — only 3 can ever be "in the top 3" at once, so this
  // dataset specifically exercises a player being excluded despite having
  // just played the very match in question (p4 in M2), and a player
  // dropping out of the top 3 on a match they didn't play at all (p3 in
  // M3, p2 in M4).
  //
  //   M1 p1=1200, p2=1100                      -> known: p1,p2 (both "top 3" since <3 exist)
  //   M2 p3=1000, p4=900                       -> known: p1,p2,p3,p4 -> top3=[p1,p2,p3], p4 OUT despite playing
  //   M3 p4=1250, p1=1150 (p4 beats p1)         -> top3=[p4,p1,p2], p3 OUT despite not playing
  //   M4 p2=950,  p3=1050 (p2 loses to p3)      -> top3=[p4,p1,p3], p2 OUT despite not playing
  //
  // Podium tallies: p1 in all 4 (4), p2 in M1-M3 (3), p3 in M2 and M4 (2),
  // p4 in M3-M4 (2). Reign (#1 only, for cross-checking): p1 leads M1-M2
  // (2), p4 leads M3-M4 (2, including M4 which p4 didn't play).
  const podiumMatches: FunStatsMatch[] = [
    {
      match_number: 1,
      winner: "atlantis",
      match_players: [
        { player_id: "p1", team: "atlantis", hero_id: null, mmr_before: 1000, mmr_after: 1200 },
        { player_id: "p2", team: "titans", hero_id: null, mmr_before: 1000, mmr_after: 1100 },
      ],
    },
    {
      match_number: 2,
      winner: "atlantis",
      match_players: [
        { player_id: "p3", team: "atlantis", hero_id: null, mmr_before: 1000, mmr_after: 1000 },
        { player_id: "p4", team: "titans", hero_id: null, mmr_before: 1000, mmr_after: 900 },
      ],
    },
    {
      match_number: 3,
      winner: "titans",
      match_players: [
        { player_id: "p1", team: "atlantis", hero_id: null, mmr_before: 1200, mmr_after: 1150 },
        { player_id: "p4", team: "titans", hero_id: null, mmr_before: 900, mmr_after: 1250 },
      ],
    },
    {
      match_number: 4,
      winner: "titans",
      match_players: [
        { player_id: "p2", team: "atlantis", hero_id: null, mmr_before: 1100, mmr_after: 950 },
        { player_id: "p3", team: "titans", hero_id: null, mmr_before: 1000, mmr_after: 1050 },
      ],
    },
  ];

  it("credits every match to whoever sat in the top 3 at that point, whether they played it or not", () => {
    const { podium, reign } = computeFunStats(podiumMatches);

    const podiumByPlayer = new Map(podium.map((e) => [e.playerId, e.count]));
    expect(podiumByPlayer.get("p1")).toBe(4);
    expect(podiumByPlayer.get("p2")).toBe(3);
    expect(podiumByPlayer.get("p3")).toBe(2);
    expect(podiumByPlayer.get("p4")).toBe(2);
    expect(podium).toHaveLength(4);

    const reignByPlayer = new Map(reign.map((e) => [e.playerId, e.count]));
    expect(reignByPlayer.get("p1")).toBe(2);
    expect(reignByPlayer.get("p4")).toBe(2);
    expect(reign).toHaveLength(2);
  });
});
