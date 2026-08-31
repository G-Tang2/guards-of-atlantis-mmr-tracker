// The Ranked Balance splitter — shared between /teams (which only needs to
// know a split is possible, to gate the button) and /teams/vote (which
// computes the actual candidate splits players vote on).

export type SkillPlayer = { id: string; name: string };
export type Split<T extends SkillPlayer = SkillPlayer> = {
  atlantis: T[];
  titans: T[];
};

// Hand-assigned skill scores for a small pool of known players (out of a
// possible 10), rather than anything derived from recorded match MMR.
// Anyone not listed here ranks last, at 0.
const SKILL_RANK_POINTS: Record<string, number> = {
  xi: 10,
  keith: 9,
  adrian: 9,
  garvin: 8.5,
  harry: 8.5,
  eddy: 7.5,
  han: 6.5,
  tu: 6.5,
  bao: 6.5,
  amy: 6,
  sam: 4,
  dave: 4,
  jenny: 3,
  stella: 2,
};

const skillPointsOf = (p: SkillPlayer) =>
  SKILL_RANK_POINTS[p.name.toLowerCase()] ?? 0;

// The `count` most-balanced Atlantis/Titans splits by total skill points
// (lowest point difference first). Unlike a plain MMR-balanced split (which
// just wants the single best split), this hands back several near-optimal
// options since which specific players end up together can vary a lot
// between splits that are otherwise equally balanced on paper — worth
// letting players vote on rather than always taking the first one found.
//
// Enumerates all 2^n subsets (fine for the small rosters this splitter
// handles) and folds each partition's Atlantis/Titans-swapped mirror into a
// single candidate by fixing pool[0] to always land on the "titans" side —
// since a mask and its bitwise complement always have the same point
// difference, this loses no candidates while halving the work.
export const rankedBalancedSplits = <T extends SkillPlayer>(
  pool: T[],
  count: number,
): Split<T>[] => {
  const n = pool.length;
  const weights = pool.map(skillPointsOf);
  const total = weights.reduce((s, w) => s + w, 0);
  const candidates: { mask: number; diff: number }[] = [];

  for (let mask = 0; mask < 1 << n; mask++) {
    if (mask & 1) continue;
    let sizeA = 0;
    let weightA = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sizeA++;
        weightA += weights[i];
      }
    }
    if (Math.abs(sizeA - (n - sizeA)) > 1) continue;
    candidates.push({ mask, diff: Math.abs(weightA - (total - weightA)) });
  }

  candidates.sort((a, b) => a.diff - b.diff);

  return candidates.slice(0, count).map(({ mask }) => {
    const atlantis: T[] = [];
    const titans: T[] = [];
    for (let i = 0; i < n; i++) {
      (mask & (1 << i) ? atlantis : titans).push(pool[i]);
    }
    return { atlantis, titans };
  });
};
