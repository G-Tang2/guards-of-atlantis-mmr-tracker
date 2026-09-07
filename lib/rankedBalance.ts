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
  vincent: 2
};

const skillPointsOf = (p: SkillPlayer) =>
  SKILL_RANK_POINTS[p.name.toLowerCase()] ?? 0;

// A pair of players who keep landing on the same side across most of the
// offered options isn't really giving anyone a meaningful choice — this
// is the STARTING cap on how many of the returned options any single pair
// can share a side on, so the vote actually offers different-looking
// teams rather than near-identical relabelings of the same grouping. Not
// always achievable, though: e.g. splitting exactly 10 players 5-and-5
// four different ways while keeping every pair together at most twice is
// provably impossible (verified by exhaustive search over all 126
// possible 5-5 splits — every single one of the C(126,4) ways to pick 4
// of them has some pair sharing a side 3+ times), independent of skill
// values, purely from the combinatorics of partitioning 10 things into
// two 5s four separate times. rankedBalancedSplits below handles this by
// relaxing the cap upward step by step until a combination exists, so a
// provably-impossible cap of 2 still gets the best actually-achievable
// diversity instead of silently giving up on diversity entirely.
const MIN_PAIR_TOGETHER_CAP = 2;

// Bounds the combination search below to the top this many candidates by
// balance quality, so runtime stays small regardless of how large the
// full candidate pool is — searching among the best ~50 is enough to find
// a genuinely diverse, near-optimal set of `count` options in practice;
// candidates ranked far worse than these wouldn't be worth offering
// anyway even if they helped diversity.
const MAX_CANDIDATES_SEARCHED = 50;

// All unordered index pairs {i, j} that land on the same side of this
// mask — both Atlantis or both Titans count as "together" for the
// pair-diversity cap above; which specific side doesn't matter.
function pairsTogether(mask: number, n: number): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (((mask >> i) & 1) === ((mask >> j) & 1)) pairs.push(`${i}-${j}`);
    }
  }
  return pairs;
}

// Finds the `count`-sized combination (from `candidates`, already sorted
// best-diff-first) with the lowest total diff that keeps every pair under
// the together-cap — a plain one-at-a-time greedy walk doesn't work here:
// the best-balanced candidates tend to be small variations of each other
// (swap one or two similarly-valued players between sides), so committing
// to the single best pick first can lock in pairings that make every
// other near-optimal candidate immediately cap-violating, long before
// `count` picks are made. Backtracking search considers combinations
// instead of a single left-to-right pass, so it can find a set that
// jointly satisfies the cap even when the very best individual candidates
// can't all coexist. Returns null if no combination of size `count`
// respects the cap at all (the caller falls back to ignoring the cap).
function bestDiverseCombination(
  candidates: { mask: number; diff: number }[],
  count: number,
  n: number,
  maxPairTogether: number,
): number[] | null {
  const pool = candidates
    .slice(0, MAX_CANDIDATES_SEARCHED)
    .map((c) => ({ ...c, pairs: pairsTogether(c.mask, n) }));

  // A plain `let` reassigned only from inside the recursive closure below
  // confuses TS's narrowing at the final `return` (it infers the
  // never-reassigned-looking type instead of the real one) — wrapping it
  // in an object sidesteps that, since property reads aren't narrowed the
  // same way bare closed-over variables are.
  const result: { best: { indices: number[]; totalDiff: number } | null } = { best: null };
  const pairUseCount = new Map<string, number>();
  const chosen: number[] = [];

  const search = (start: number) => {
    if (chosen.length === count) {
      const totalDiff = chosen.reduce((s, idx) => s + pool[idx].diff, 0);
      if (result.best === null || totalDiff < result.best.totalDiff) {
        result.best = { indices: [...chosen], totalDiff };
      }
      return;
    }
    // Not enough candidates left to fill the remaining slots — prune.
    if (pool.length - start < count - chosen.length) return;

    for (let i = start; i < pool.length; i++) {
      const candidate = pool[i];
      const wouldExceedCap = candidate.pairs.some(
        (pair) => (pairUseCount.get(pair) ?? 0) >= maxPairTogether,
      );
      if (wouldExceedCap) continue;

      chosen.push(i);
      for (const pair of candidate.pairs) {
        pairUseCount.set(pair, (pairUseCount.get(pair) ?? 0) + 1);
      }

      search(i + 1);

      for (const pair of candidate.pairs) {
        const next = (pairUseCount.get(pair) ?? 0) - 1;
        if (next <= 0) pairUseCount.delete(pair);
        else pairUseCount.set(pair, next);
      }
      chosen.pop();
    }
  };
  search(0);

  // `pool` is `candidates.slice(0, K)` plus a `pairs` field — truncating
  // doesn't reorder, so an index into `pool` is already the same index
  // into `candidates` and needs no translation.
  return result.best ? result.best.indices : null;
}

// The `count` most-balanced Atlantis/Titans splits by total skill points
// (lowest point difference first), while also trying to keep any single
// pair of players from sharing a side across more than MIN_PAIR_TOGETHER_CAP
// of the returned options (relaxed upward only if that's not achievable —
// see its own comment). Unlike a plain MMR-balanced split (which just
// wants the single best split), this hands back several options since
// which specific players end up together can vary a lot between splits
// that are otherwise equally balanced on paper — worth letting players
// vote on rather than always taking the first ones found, and worth
// making those choices actually different from each other.
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

  // Start at the ideal cap and relax it upward one step at a time until a
  // combination actually exists — some pool/team-size combinations make
  // the ideal cap provably unsatisfiable (see MIN_PAIR_TOGETHER_CAP's
  // comment), and a cap of `count` is always trivially satisfiable (no
  // pair can share a side more than `count` times when there are only
  // `count` total options), so this is guaranteed to terminate with a
  // real combination rather than needing a separate uncapped fallback.
  let selectedIndices: number[] = candidates.slice(0, count).map((_, i) => i);
  for (let cap = MIN_PAIR_TOGETHER_CAP; cap <= count; cap++) {
    const diverseIndices = bestDiverseCombination(candidates, count, n, cap);
    if (diverseIndices) {
      selectedIndices = diverseIndices;
      break;
    }
  }
  const selected = selectedIndices
    .map((i) => candidates[i])
    .sort((a, b) => a.diff - b.diff);

  return selected.map(({ mask }) => {
    const atlantis: T[] = [];
    const titans: T[] = [];
    for (let i = 0; i < n; i++) {
      (mask & (1 << i) ? atlantis : titans).push(pool[i]);
    }
    return { atlantis, titans };
  });
};
