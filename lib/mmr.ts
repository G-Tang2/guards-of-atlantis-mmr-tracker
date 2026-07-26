export type Player = {
  id: string;
  name: string;
  mmr: number;
};

export type PlayerResult = Player & {
  mmrChange: number;
  newMmr: number;
};

export type MatchResult = {
  atlantis: PlayerResult[];
  titans: PlayerResult[];
  meta: {
    atlantisAvg: number;
    titansAvg: number;
    expectedA: number;
    atlantisDelta: number;
    titansDelta: number;
  };
};

const DEFAULT_K = 40;
const WIN_BONUS = 10;
const DRAW_DELTA = 10; // flat adjustment applied on a "none" result

// Expected win probability from Elo-style mmr formula
const expectedWin = (a: number, b: number): number =>
  1 / (1 + Math.pow(10, (b - a) / 400));

// Team average mmr
const teamAvg = (team: Player[]): number => {
  if (team.length === 0) {
    throw new Error("Cannot compute average mmr of an empty team");
  }
  return team.reduce((sum, p) => sum + p.mmr, 0) / team.length;
};

const calculateDelta = (
  hasWon: boolean,
  expectedScore: number,
  baseK: number = DEFAULT_K,
  winBonus: number = WIN_BONUS
): number => {
  const actualScore = hasWon ? 1 : 0;
  const effectiveK = hasWon ? baseK + winBonus : baseK;
  return effectiveK * (actualScore - expectedScore);
};

const applyDelta = (team: Player[], delta: number): PlayerResult[] => {
  const roundedDelta = Math.round(delta);
  return team.map((p) => ({
    ...p,
    mmrChange: roundedDelta,
    newMmr: p.mmr + roundedDelta,
  }));
};

export const calculateMMR = (
  atlantis: Player[],
  titans: Player[],
  winner: "atlantis" | "titans" | "none"
): MatchResult => {
  const atlantisAvg = teamAvg(atlantis);
  const titansAvg = teamAvg(titans);

  const expectedA = expectedWin(atlantisAvg, titansAvg);
  const expectedB = 1 - expectedA;

  let atlantisDelta: number;
  let titansDelta: number;

  if (winner === "none") {
    atlantisDelta = DRAW_DELTA
    titansDelta = DRAW_DELTA
  } else {
    const isAtlantisWinner = winner === "atlantis";
    atlantisDelta = calculateDelta(isAtlantisWinner, expectedA);
    titansDelta = calculateDelta(!isAtlantisWinner, expectedB);
  }

  const atlantisResult = applyDelta(atlantis, atlantisDelta);
  const titansResult = applyDelta(titans, titansDelta);

  return {
    atlantis: atlantisResult,
    titans: titansResult,
    meta: {
      atlantisAvg,
      titansAvg,
      expectedA,
      atlantisDelta: Math.round(atlantisDelta),
      titansDelta: Math.round(titansDelta),
    },
  };
};