// The Ranked Balance splitter — shared between /teams (which only needs to
// know a split is possible, to gate the button) and /teams/vote (which
// computes the actual candidate splits players vote on).

export type SkillPlayer = { id: string; name: string };
export type MmrPlayer = SkillPlayer & { mmr: number };
export type Split<T extends SkillPlayer = SkillPlayer> = {
  atlantis: T[];
  titans: T[];
};

// Hand-assigned skill scores for a small pool of known players (out of a
// possible 10), rather than anything derived from recorded match MMR.
// Anyone not listed here ranks last, at 0.
const SKILL_RANK_POINTS: Record<string, number> = {
  xi: 10,
  keith: 10,
  adrian: 10,
  garvin: 10,
  harry: 10,
  eddy: 9,
  han: 8,
  bao: 8,
  gordon: 7.5,
  tu: 7,
  peter: 7,
  amy: 6,
  vincent: 5,
  sam: 5,
  jenny: 5,
  dave: 4,
  jason: 3,
  stella: 2,
};

const skillPointsOf = (p: { name: string }) =>
  SKILL_RANK_POINTS[p.name.toLowerCase()] ?? 0;

// Same floor the leaderboard itself uses (MINIMUM_MATCHES_FOR_DISPLAY in
// app/leaderboard/page.tsx) to hide a new player's still-noisy MMR —
// reused here so the regression below isn't skewed by rookies whose MMR
// hasn't settled yet.
const MIN_FIT_SAMPLE_MATCHES = 5;

export type SkillMmrSample = { name: string; mmr: number; matchesPlayed: number };
export type SkillMmrFit = { slope: number; intercept: number };

// Least-squares fit of MMR against hand-assigned skill points — mmr ≈
// slope * skillPoints + intercept — over every sample with both a known
// skill rank (see SKILL_RANK_POINTS; an unranked player is silently
// excluded here, not treated as a real "skill 0" data point) and at
// least MIN_FIT_SAMPLE_MATCHES recorded matches. Computed live by the
// caller from the current full player list (see rankedBalancedSplits'
// own comment on why), rather than a hardcoded constant, so it tracks
// the league's actual skill-to-MMR relationship as it evolves instead of
// drifting stale. Falls back to a flat 0-slope read of the sample's own
// average MMR when fewer than 2 distinct skill tiers are present to fit
// a real line through (or the sample is empty, reading 0).
export function fitExpectedMmrBySkill(sample: SkillMmrSample[]): SkillMmrFit {
  const points = sample
    .filter((p) => skillPointsOf(p) > 0 && p.matchesPlayed >= MIN_FIT_SAMPLE_MATCHES)
    .map((p) => ({ x: skillPointsOf(p), y: p.mmr }));

  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// How much one skill point is "worth" in MMR for the composite weight
// below — every this-many MMR a player sits above/below what their own
// skill tier is expected to sit at (fit.slope * skill + fit.intercept)
// nudges their composite weight by about one skill point. Tuned to be a
// real but secondary signal alongside hand-assigned skill points (which
// span roughly 0-10): a tight group (a ~150-250 MMR residual, typical of
// a real session) nudges by around a point each, while a genuinely
// lopsided one can swing several points — enough to catch a stale or
// missing skill rank without overriding a deliberate one.
const MMR_POINTS_PER_SKILL_POINT = 100;

// Skill points nudged by how far above/below their OWN skill tier's
// league-wide expected MMR a player sits — not the pool's own average,
// which would double-penalize a low-skill player for MMR their skill
// rank already predicts (a low-skill player sitting below a mixed pool's
// average is expected, not a correction-worthy surprise), and would
// inflate or deflate everyone's nudge just because of who else happens
// to be in tonight's pool. Hand-assigned skill points stay the primary
// signal (an intentional, actively maintained judgment call — see
// SKILL_RANK_POINTS), with this residual as a secondary correction: it
// catches a split that looks fine on stale or missing skill numbers but
// is actually lopsided by recent form, and it gives an unranked player
// (skillPointsOf defaults to 0) a sensible position from their MMR alone
// instead of flatly ranking them worst regardless of how they've
// actually played.
function compositeWeightOf(fit: SkillMmrFit): (p: MmrPlayer) => number {
  return (p) => {
    const skill = skillPointsOf(p);
    const expectedMmr = fit.slope * skill + fit.intercept;
    return skill + (p.mmr - expectedMmr) / MMR_POINTS_PER_SKILL_POINT;
  };
}

// A split whose two sides differ by this many composite weight points or
// more isn't offered at all — better to hand back fewer options (down to
// none) than one so lopsided on paper it isn't a real "ranked balanced"
// choice. Exported so callers can explain *why* to a group that gets none
// at all.
export const MAX_SKILL_POINT_DIFF = 4;

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

// Orders an already-chosen set of splits so a split introducing pairings
// not yet seen is listed before one that repeats pairs an earlier option
// in the list already used — separate from (and after) bestDiverseCombination
// above, which only picks the *set* of options; this decides the *order*
// they're shown in, so a genuinely different pairing reads as "Option 1/2"
// rather than being buried behind a repeat just because both happen to
// share the same point difference. Greedy: at each step, picks whichever
// remaining split shares the fewest pairs already used by options placed
// earlier, ties broken by lower point difference — so with no repeats
// generated yet (the very first pick) this is equivalent to today's plain
// most-balanced-first ordering.
function orderByNovelty<C extends { mask: number; diff: number }>(
  selected: C[],
  n: number,
): C[] {
  const remaining = selected.map((c) => ({ c, pairs: pairsTogether(c.mask, n) }));
  const usedPairs = new Set<string>();
  const ordered: C[] = [];

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestRepeats = Infinity;
    remaining.forEach((entry, idx) => {
      const repeats = entry.pairs.reduce((s, p) => s + (usedPairs.has(p) ? 1 : 0), 0);
      const better =
        repeats < bestRepeats ||
        (repeats === bestRepeats && entry.c.diff < remaining[bestIdx].c.diff);
      if (better) {
        bestRepeats = repeats;
        bestIdx = idx;
      }
    });
    const [picked] = remaining.splice(bestIdx, 1);
    picked.pairs.forEach((p) => usedPairs.add(p));
    ordered.push(picked.c);
  }

  return ordered;
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

// Up to `count` most-balanced Atlantis/Titans splits by total weight
// (lowest difference first) — fewer than `count`, or none at all, when
// fewer than `count` splits (or none) actually keep both sides within
// `maxDiff` of each other; callers need to handle an empty result as "no
// split is possible for this group" rather than assuming at least one
// option always comes back (pass `Infinity` for `maxDiff` when there's no
// such threshold at all, e.g. a plain MMR balance — every pool of 2+
// always has at least one valid split, so this never comes back empty).
// Among whatever qualifies, this also tries to keep any single pair of
// players from sharing a side across more than MIN_PAIR_TOGETHER_CAP of
// the returned options (relaxed upward only if that's not achievable — see
// its own comment). This hands back several options (rather than just the
// single best split) since which specific players end up together can vary
// a lot between splits that are otherwise equally balanced on paper —
// worth letting players vote on rather than always taking the first ones
// found, and worth making those choices actually different from each
// other.
//
// Enumerates all 2^n subsets (fine for the small rosters this splitter
// handles) and folds each partition's Atlantis/Titans-swapped mirror into a
// single candidate by fixing pool[0] to always land on the "titans" side —
// since a mask and its bitwise complement always have the same point
// difference, this loses no candidates while halving the work.
// `applyDiversityCap` is a real quality trade-off, not a free diversity
// bonus: bestDiverseCombination stops at the FIRST cap level (starting
// from MIN_PAIR_TOGETHER_CAP) that yields ANY valid combination at all,
// not the first one that yields a GOOD one — so if a tight cap happens to
// be satisfiable only by combinations of otherwise-mediocre candidates
// (common once weights are mostly-distinct continuous values like MMR,
// rather than the small, heavily-clustered integer scale skill points
// use, where a cheap cap is almost always satisfiable by near-optimal
// candidates anyway), the result can come back far worse than the actual
// best `count` splits — including dropping the single best one entirely.
// Verified against skill points in practice; MMR is the caller that
// should leave this off (see mmrBalancedSplits).
function balancedSplitsByWeight<T extends SkillPlayer>(
  pool: T[],
  weightOf: (p: T) => number,
  count: number,
  maxDiff: number,
  applyDiversityCap: boolean = true,
): Split<T>[] {
  const n = pool.length;
  const weights = pool.map(weightOf);
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
    const diff = Math.abs(weightA - (total - weightA));
    if (diff >= maxDiff) continue;
    candidates.push({ mask, diff });
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
  if (applyDiversityCap) {
    for (let cap = MIN_PAIR_TOGETHER_CAP; cap <= count; cap++) {
      const diverseIndices = bestDiverseCombination(candidates, count, n, cap);
      if (diverseIndices) {
        selectedIndices = diverseIndices;
        break;
      }
    }
  }
  const selected = orderByNovelty(
    selectedIndices.map((i) => candidates[i]),
    n,
  );

  return selected.map(({ mask }) => {
    const atlantis: T[] = [];
    const titans: T[] = [];
    for (let i = 0; i < n; i++) {
      (mask & (1 << i) ? atlantis : titans).push(pool[i]);
    }
    return { atlantis, titans };
  });
}

// Composite-weighted splits (hand-assigned skill points nudged by
// skill-tier-relative MMR — see compositeWeightOf) — options this
// lopsided on paper aren't offered at all (see MAX_SKILL_POINT_DIFF).
// `fit` is live league-wide data, not a constant baked into this file —
// see fitExpectedMmrBySkill's own comment — so the caller builds it from
// its own current full player list (every registered player, not just
// tonight's pool) and passes it in.
export const rankedBalancedSplits = <T extends MmrPlayer>(
  pool: T[],
  count: number,
  fit: SkillMmrFit,
): Split<T>[] => balancedSplitsByWeight(pool, compositeWeightOf(fit), count, MAX_SKILL_POINT_DIFF);

// MMR-weighted splits — the "Balanced" button's own voted variant. No
// diff threshold: a plain MMR balance always has a real best option, even
// if every possible split is lopsided, so there's nothing to gate on. No
// diversity cap either (see balancedSplitsByWeight's own comment on why):
// with MMR's mostly-distinct values, the cap search tends to settle for
// combinations far worse than the real best `count` splits, which directly
// contradicts what "Balanced" promises — these are meant to be *the*
// most balanced options, full stop.
export const mmrBalancedSplits = <T extends MmrPlayer>(
  pool: T[],
  count: number,
): Split<T>[] => balancedSplitsByWeight(pool, (p) => p.mmr, count, Infinity, false);
