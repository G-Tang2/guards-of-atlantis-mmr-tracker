export type Player = {
  id: string;
  name: string;
  mmr: number;
};

const K = 40;

// Expected probability (mmr formula)
const expectedWin = (a: number, b: number) => {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
};

// Team average mmr
const teamAvg = (team: Player[]) =>
  team.reduce((sum, p) => sum + p.mmr, 0) / team.length;

export const calculateMMR = (
  atlantis: Player[],
  titans: Player[],
  winner: "atlantis" | "titans",
) => {
  const atlantisAvg = teamAvg(atlantis);
  const titansAvg = teamAvg(titans);

  const expectedA = expectedWin(atlantisAvg, titansAvg);
  const expectedB = 1 - expectedA;

  const scoreA = winner === "atlantis" ? 1 : 0;
  const scoreB = 1 - scoreA;

  // Team-level mmr change (same for everyone)
  const atlantisDelta = K * (scoreA - expectedA);
  const titansDelta = K * (scoreB - expectedB);

  const apply = (team: Player[], delta: number) => {
    const roundedDelta = Math.round(delta);

    return team.map((p) => ({
      ...p,
      mmrChange: roundedDelta,
      newmmr: p.mmr + roundedDelta,
    }));
  };

  const atlantisResult = apply(atlantis, atlantisDelta);
  const titansResult = apply(titans, titansDelta);

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
