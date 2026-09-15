"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PasswordGate } from "@/components/PasswordGate";
import { TEAMS_DRAFT_STORAGE_KEY } from "@/lib/teamsDraft";
import { RANKED_VOTE_STORAGE_KEY } from "@/lib/rankedVote";
import { rankedBalancedSplits, Split } from "@/lib/rankedBalance";
import { buildWonHeroesByPlayer } from "@/lib/heroWinBonus";
import { getOwnedBadgeIds } from "@/lib/badgeRewards";
import { Star, Crown, ScrollText, Swords, Ban, CheckCircle2, X } from "lucide-react";

type Player = { id: string; name: string; mmr: number; avatar_url?: string | null };
type Stage =
  | "setup"
  | "ban_ballot"
  | "ban_tie_reveal"
  | "ban_results"
  | "ballot"
  | "tie_reveal"
  | "results";

type StoredVote = {
  playerIds: string[];
  wantsBan?: boolean;
  banVotes?: number[];
  banVotesCast?: number;
  bannedIndices?: number[];
  votes?: number[];
  votesCast?: number;
};

const FACTIONS = ["atlantis", "titans"] as const;

// How many options get banned before the final choice — fixed at 2 per
// the group's own house rule for this vote (see the setup stage's own
// copy). Only ever offered when there are enough options for this to
// still leave something to vote on afterward (see canBan below).
const BAN_COUNT = 2;

// How long the "your vote has been counted" pop-up stays up after any tap
// (ban or choose round) before the app moves on — can also be dismissed
// early with its own close button (see VoteConfirmPopup).
const VOTE_CONFIRM_MS = 3000;

const avg = (players: Player[]) =>
  players.length === 0
    ? 0
    : Math.round(players.reduce((s, p) => s + p.mmr, 0) / players.length);

// Pure, module-level (mirrors shuffle() in app/teams/page.tsx) so the
// random pick lives outside the component's closures — kept in a plain
// function called from an event handler rather than nested inside one.
function buildTieBreak(tied: number[]) {
  const winner = tied[Math.floor(Math.random() * tied.length)];
  const steps = 14;
  const sequence = Array.from({ length: steps }, (_, i) => tied[i % tied.length]);
  sequence[steps - 1] = winner;
  return { winner, sequence };
}

// Same flashing-reveal idea as buildTieBreak above, generalized to pick
// several eliminees out of one tied pool at once (needed when banning:
// more than one option can tie for a spot among the top BAN_COUNT most
// banned). Doesn't try to force the flash sequence to land exactly on
// the chosen ones the way the single-winner version does — with more
// than one outcome to reveal, that guarantee isn't as meaningful, and
// this stays simpler for it.
function buildEliminationTieBreak(tiedPool: number[], neededFromTied: number) {
  const shuffled = [...tiedPool].sort(() => Math.random() - 0.5);
  const eliminated = shuffled.slice(0, neededFromTied);
  const steps = 14;
  const sequence = Array.from({ length: steps }, (_, i) => tiedPool[i % tiedPool.length]);
  return { eliminated, sequence };
}

// Works out exactly which `countToEliminate` indices (by ban-vote count,
// most-banned first) should be removed. Splits the answer into `locked`
// (unambiguously in — strictly more ban votes than the cutoff) and
// `tiedPool` (tied at the cutoff value, contested for whatever slots
// `locked` didn't already fill) so the caller only needs to run a random
// tie-break when tiedPool has more entries than it actually needs to
// fill — an exact fit (or no tie at all) needs no randomness.
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

// Display order for a list that includes banned options — everything
// still in the running first (in its original order), banned options
// pushed to the bottom (also keeping their own relative order) rather
// than staying wherever they originally landed, so a scan down the list
// reads as "what's left" before "what got cut".
function sortBannedLast<T>(splits: T[], bannedIndices: number[]): number[] {
  const banned = new Set(bannedIndices);
  const indices = splits.map((_, i) => i);
  return [...indices.filter((i) => !banned.has(i)), ...indices.filter((i) => banned.has(i))];
}

function OptionCard({
  index,
  split,
  onClick,
  className,
  headExtra,
  banned,
}: {
  index: number;
  split: Split<Player>;
  onClick?: () => void;
  className?: string;
  headExtra?: ReactNode;
  banned?: boolean;
}) {
  const body = (
    <>
      <div className="ranked-option-head">
        <span className="ranked-option-head-left">
          Option {index + 1}
          {banned && (
            <span className="goa-vote-banned-tag">
              <Ban size={11} /> Banned
            </span>
          )}
        </span>
        {headExtra}
      </div>
      <div className="draft-live-teams">
        {FACTIONS.map((faction) => (
          <div key={faction} className="draft-live-team">
            <div className="flex justify-between align-center">
              <span
                className={`draft-faction-label ${faction === "atlantis" ? "atl" : "tit"}`}
              >
                {faction === "atlantis" ? "Atlantis" : "Titans"}
              </span>
              <span className="draft-live-team-avg">
                AVG MMR: {avg(split[faction])}
              </span>
            </div>
            {split[faction].map((p) => (
              <div key={p.id} className="draft-live-row">
                <PlayerAvatar avatarUrl={p.avatar_url} name={p.name} size={18} />
                <span className="draft-live-name">{p.name}</span>
                <span className="draft-live-mmr sm">{p.mmr} MMR</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );

  if (!onClick) {
    return <div className={className}>{body}</div>;
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  );
}

// Empty dots for players who haven't voted yet, filled for those who
// have — the only signal shown during voting, so nobody's specific pick
// leaks before every player has gone. Red during a ban round (voting for
// what to remove) instead of the usual green (voting for what to keep),
// so the two kinds of ballot are never visually confusable at a glance.
function VoteDots({
  total,
  cast,
  variant = "choose",
}: {
  total: number;
  cast: number;
  variant?: "choose" | "ban";
}) {
  return (
    <div className="goa-vote-dots" aria-label={`${cast} of ${total} voted`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`goa-vote-dot${i < cast ? ` voted${variant === "ban" ? " ban" : ""}` : ""}`}
        />
      ))}
    </div>
  );
}

// Shown for VOTE_CONFIRM_MS after every single tap (ban or choose round)
// — a small pop-up rather than a full-screen takeover, dismissible early
// with its own close button (onClose skips the rest of the wait and
// proceeds immediately, same as letting the timer run out).
function VoteConfirmPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="goa-vote-confirm-popup">
      <button
        type="button"
        className="goa-vote-confirm-close"
        onClick={onClose}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
      <CheckCircle2 size={24} className="goa-vote-confirm-icon" />
      <div className="goa-vote-confirm-text">
        <span className="goa-vote-confirm-title">Vote counted</span>
        <span className="goa-vote-confirm-sub">Pass the device to the next person.</span>
      </div>
    </div>
  );
}

function TeamsVotePageInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [splits, setSplits] = useState<Split<Player>[]>([]);
  const [skippedVoting, setSkippedVoting] = useState(false);
  // Total expected taps, not total voters — a player who already owns the
  // Base badge gets a second vote (see lib/badges.ts), so this can exceed
  // playerIds.length. Applies the same way to both the ban round and the
  // choose round. Voting itself stays fully anonymous: this number is
  // computed once up front purely so the app knows when everyone's done,
  // never used to track who cast which tap.
  const [totalVotes, setTotalVotes] = useState(0);

  const [stage, setStage] = useState<Stage>("ballot");
  // Explicitly tracks the setup stage's own answer (undefined until
  // answered) — persisted verbatim on every save so a refresh mid-choose-
  // round (after skipping the ban round) still resumes into "ballot"
  // instead of being asked the setup question again.
  const [wantsBan, setWantsBan] = useState<boolean | undefined>(undefined);
  // Which option indices (into `splits`) are still being voted on in the
  // *choose* round — every index until a ban round removes some.
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [chooseRoundSkipped, setChooseRoundSkipped] = useState(false);

  const [banVotes, setBanVotes] = useState<number[]>([]);
  const [banVotesCast, setBanVotesCast] = useState(0);
  const [bannedIndices, setBannedIndices] = useState<number[]>([]);
  const [banTiePool, setBanTiePool] = useState<number[]>([]);
  const [banTieActiveIndex, setBanTieActiveIndex] = useState<number | null>(null);
  const [banTieEliminated, setBanTieEliminated] = useState<number[]>([]);

  const [votes, setVotes] = useState<number[]>([]);
  const [votesCast, setVotesCast] = useState(0);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [tieCandidates, setTieCandidates] = useState<number[]>([]);
  const [tieActiveIndex, setTieActiveIndex] = useState<number | null>(null);

  const [voteConfirmVisible, setVoteConfirmVisible] = useState(false);
  // Holds whatever showConfirmationThen's timer would otherwise run once
  // VOTE_CONFIRM_MS elapses, so the popup's own close button can run it
  // immediately instead and cancel the pending timer — closing early
  // should still proceed, just without the rest of the wait.
  const voteConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voteConfirmActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(RANKED_VOTE_STORAGE_KEY);
    if (!raw) {
      router.replace("/teams");
      return;
    }
    try {
      const saved = JSON.parse(raw) as StoredVote;
      if (!saved.playerIds || saved.playerIds.length < 2) {
        router.replace("/teams");
        return;
      }
      Promise.all([
        supabaseClient
          .from("players")
          .select("id, name, mmr, avatar_url")
          .in("id", saved.playerIds),
        // Base badge ownership — every hero any of tonight's players has
        // ever won with, used only to work out how many of them get a
        // second vote (see totalVotes above). Not scoped to didWin here;
        // buildWonHeroesByPlayer already applies that filter itself.
        supabaseClient
          .from("match_players")
          .select("player_id, hero_id, team, match_number, matches!inner(winner)")
          .in("player_id", saved.playerIds)
          .not("hero_id", "is", null),
      ]).then(([{ data, error }, { data: heroHistory }]) => {
          if (error || !data) {
            router.replace("/teams");
            return;
          }
          const byId = new Map<string, Player>(data.map((p) => [p.id, p]));
          const resolved = saved.playerIds
            .map((id) => byId.get(id))
            .filter((p): p is Player => !!p);
          if (resolved.length !== saved.playerIds.length) {
            router.replace("/teams");
            return;
          }

          const wonHeroesByPlayer = buildWonHeroesByPlayer(heroHistory ?? []);
          const baseOwnerCount = saved.playerIds.filter((id) =>
            getOwnedBadgeIds(wonHeroesByPlayer.get(id) ?? new Set()).has("base"),
          ).length;
          const computedTotalVotes = saved.playerIds.length + baseOwnerCount;

          const computedSplits = rankedBalancedSplits(resolved, 4);
          const allIndices = computedSplits.map((_, i) => i);
          setPlayerIds(saved.playerIds);
          setSplits(computedSplits);
          setTotalVotes(computedTotalVotes);

          if (computedSplits.length <= 1) {
            // Nothing to vote on — apply the one possible split directly.
            setSkippedVoting(true);
            setVotes([computedTotalVotes]);
            setActiveIndices(allIndices);
            setWinnerIndex(0);
            setStage("results");
            setLoading(false);
            return;
          }

          // Banning only makes sense with enough options left afterward
          // to still hold a real vote — with exactly 2 or 3 options,
          // removing BAN_COUNT would either remove everything or leave
          // just one survivor with no vote needed, so the *offer* itself
          // is reserved for 3+ options (a 3-option draft can still end
          // up with one automatic survivor after banning, just not
          // because the ban option was hidden).
          const offerBan = computedSplits.length > BAN_COUNT;

          const resumedBanned = saved.bannedIndices ?? [];
          if (resumedBanned.length > 0) {
            // Resuming after a ban round already completed.
            setWantsBan(true);
            const remaining = allIndices.filter((i) => !resumedBanned.includes(i));
            setBannedIndices(resumedBanned);
            setActiveIndices(remaining);
            if (remaining.length <= 1) {
              setChooseRoundSkipped(true);
              setWinnerIndex(remaining[0] ?? null);
              setStage("results");
            } else {
              const resumableVotes = saved.votes && saved.votes.length === computedSplits.length;
              setVotes(resumableVotes ? saved.votes! : new Array(computedSplits.length).fill(0));
              setVotesCast(resumableVotes ? (saved.votesCast ?? 0) : 0);
              setStage("ballot");
            }
          } else if (saved.wantsBan) {
            // Resuming mid-ban-round.
            setWantsBan(true);
            setActiveIndices(allIndices);
            const resumableBanVotes =
              saved.banVotes && saved.banVotes.length === computedSplits.length;
            setBanVotes(resumableBanVotes ? saved.banVotes! : new Array(computedSplits.length).fill(0));
            setBanVotesCast(resumableBanVotes ? (saved.banVotesCast ?? 0) : 0);
            setStage("ban_ballot");
          } else if (saved.wantsBan === false || !offerBan) {
            // Either explicitly declined banning, or banning was never
            // on offer for this many options — straight to the choose
            // ballot, resuming an in-progress tally if there is one.
            setWantsBan(false);
            setActiveIndices(allIndices);
            const resumableVotes = saved.votes && saved.votes.length === computedSplits.length;
            setVotes(resumableVotes ? saved.votes! : new Array(computedSplits.length).fill(0));
            setVotesCast(resumableVotes ? (saved.votesCast ?? 0) : 0);
            setStage("ballot");
          } else {
            // Brand new vote with enough options to ask.
            setActiveIndices(allIndices);
            setStage("setup");
          }
          setLoading(false);
        });
    } catch {
      router.replace("/teams");
    }
  }, [router]);

  const persistBanProgress = (nextBanVotes: number[], nextBanVotesCast: number) => {
    sessionStorage.setItem(
      RANKED_VOTE_STORAGE_KEY,
      JSON.stringify({
        playerIds,
        wantsBan: true,
        banVotes: nextBanVotes,
        banVotesCast: nextBanVotesCast,
      }),
    );
  };

  const persistBanResult = (nextBannedIndices: number[]) => {
    sessionStorage.setItem(
      RANKED_VOTE_STORAGE_KEY,
      JSON.stringify({ playerIds, wantsBan: true, bannedIndices: nextBannedIndices }),
    );
  };

  const persistProgress = (nextVotes: number[], nextVotesCast: number) => {
    sessionStorage.setItem(
      RANKED_VOTE_STORAGE_KEY,
      JSON.stringify({
        playerIds,
        wantsBan,
        bannedIndices,
        votes: nextVotes,
        votesCast: nextVotesCast,
      }),
    );
  };

  // A tap commits immediately, then a brief pop-up (VoteConfirmPopup)
  // appears for VOTE_CONFIRM_MS before anything else happens — including
  // settling the tally on the very last tap, so the group always gets
  // that same "pass the device" beat before a reveal, not just between
  // voters. Its own close button (dismissVoteConfirm below) can cut the
  // wait short and run `after` immediately instead.
  const showConfirmationThen = (after: () => void) => {
    voteConfirmActionRef.current = after;
    setVoteConfirmVisible(true);
    voteConfirmTimerRef.current = setTimeout(() => {
      voteConfirmTimerRef.current = null;
      setVoteConfirmVisible(false);
      after();
    }, VOTE_CONFIRM_MS);
  };

  const dismissVoteConfirm = () => {
    if (voteConfirmTimerRef.current) clearTimeout(voteConfirmTimerRef.current);
    voteConfirmTimerRef.current = null;
    setVoteConfirmVisible(false);
    voteConfirmActionRef.current?.();
    voteConfirmActionRef.current = null;
  };

  const runTieBreak = (tied: number[]) => {
    setTieCandidates(tied);
    setStage("tie_reveal");

    const { winner: finalWinner, sequence } = buildTieBreak(tied);

    let delay = 90;
    let cumulative = 0;
    sequence.forEach((idx) => {
      cumulative += delay;
      delay = Math.round(delay * 1.18);
      setTimeout(() => setTieActiveIndex(idx), cumulative);
    });

    setTimeout(() => {
      setTieActiveIndex(null);
      setWinnerIndex(finalWinner);
    }, cumulative + 300);

    setTimeout(() => setStage("results"), cumulative + 2900);
  };

  const settleTally = (finalVotes: number[]) => {
    const max = Math.max(...activeIndices.map((i) => finalVotes[i]));
    const tied = activeIndices.filter((i) => finalVotes[i] === max);
    if (tied.length === 1) {
      setWinnerIndex(tied[0]);
      setStage("results");
    } else {
      runTieBreak(tied);
    }
  };

  const castVote = (index: number) => {
    const nextVotes = votes.map((v, i) => (i === index ? v + 1 : v));
    const nextVotesCast = votesCast + 1;
    setVotes(nextVotes);
    setVotesCast(nextVotesCast);
    persistProgress(nextVotes, nextVotesCast);
    showConfirmationThen(() => {
      if (nextVotesCast >= totalVotes) settleTally(nextVotes);
    });
  };

  const finishBan = (finalBanned: number[]) => {
    setBannedIndices(finalBanned);
    persistBanResult(finalBanned);
    setStage("ban_results");
  };

  const runBanTieBreak = (tiedPool: number[], neededFromTied: number, locked: number[]) => {
    setBanTiePool(tiedPool);
    setStage("ban_tie_reveal");

    const { eliminated, sequence } = buildEliminationTieBreak(tiedPool, neededFromTied);

    let delay = 90;
    let cumulative = 0;
    sequence.forEach((idx) => {
      cumulative += delay;
      delay = Math.round(delay * 1.18);
      setTimeout(() => setBanTieActiveIndex(idx), cumulative);
    });

    setTimeout(() => {
      setBanTieActiveIndex(null);
      setBanTieEliminated(eliminated);
    }, cumulative + 300);

    setTimeout(() => finishBan([...locked, ...eliminated]), cumulative + 2900);
  };

  const settleBanTally = (finalBanVotes: number[]) => {
    // Never eliminate more options than actually got a ban vote — if
    // everyone converged on banning the same single option and left
    // every other option at 0, that's the group's real intent, not a
    // reason to force a second, arbitrary elimination among untouched
    // options just to hit BAN_COUNT.
    const votedOptionCount = activeIndices.filter((i) => finalBanVotes[i] > 0).length;
    const countToEliminate = Math.min(BAN_COUNT, splits.length - 1, votedOptionCount);
    const { locked, tiedPool, neededFromTied } = computeElimination(
      finalBanVotes,
      activeIndices,
      countToEliminate,
    );
    if (neededFromTied <= 0 || tiedPool.length === neededFromTied) {
      finishBan([...locked, ...tiedPool.slice(0, Math.max(neededFromTied, 0))]);
    } else {
      runBanTieBreak(tiedPool, neededFromTied, locked);
    }
  };

  const castBanVote = (index: number) => {
    const nextBanVotes = banVotes.map((v, i) => (i === index ? v + 1 : v));
    const nextBanVotesCast = banVotesCast + 1;
    setBanVotes(nextBanVotes);
    setBanVotesCast(nextBanVotesCast);
    persistBanProgress(nextBanVotes, nextBanVotesCast);
    showConfirmationThen(() => {
      if (nextBanVotesCast >= totalVotes) settleBanTally(nextBanVotes);
    });
  };

  const startBanRound = () => {
    setWantsBan(true);
    const freshBanVotes = new Array(splits.length).fill(0);
    setBanVotes(freshBanVotes);
    setBanVotesCast(0);
    // Written directly (not via persistBanProgress/persistProgress, which
    // read wantsBan off state) — setWantsBan above won't be visible to
    // those helpers until the next render, so this transition's own
    // write has to include the true value itself.
    sessionStorage.setItem(
      RANKED_VOTE_STORAGE_KEY,
      JSON.stringify({ playerIds, wantsBan: true, banVotes: freshBanVotes, banVotesCast: 0 }),
    );
    setStage("ban_ballot");
  };

  const skipBanRound = () => {
    setWantsBan(false);
    const freshVotes = new Array(splits.length).fill(0);
    setVotes(freshVotes);
    setVotesCast(0);
    // Same reasoning as startBanRound above — written directly rather
    // than via persistProgress, which wouldn't see today's setWantsBan
    // update yet.
    sessionStorage.setItem(
      RANKED_VOTE_STORAGE_KEY,
      JSON.stringify({ playerIds, wantsBan: false, votes: freshVotes, votesCast: 0 }),
    );
    setStage("ballot");
  };

  const continueAfterBan = () => {
    const remaining = splits
      .map((_, i) => i)
      .filter((i) => !bannedIndices.includes(i));
    setActiveIndices(remaining);
    if (remaining.length <= 1) {
      setChooseRoundSkipped(true);
      setWinnerIndex(remaining[0] ?? null);
      setStage("results");
      return;
    }
    const freshVotes = new Array(splits.length).fill(0);
    setVotes(freshVotes);
    setVotesCast(0);
    persistProgress(freshVotes, 0);
    setStage("ballot");
  };

  const finish = () => {
    if (winnerIndex === null) return;
    const winner = splits[winnerIndex];
    const raw = sessionStorage.getItem(TEAMS_DRAFT_STORAGE_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    sessionStorage.setItem(
      TEAMS_DRAFT_STORAGE_KEY,
      JSON.stringify({
        ...prev,
        pool: [],
        atlantis: winner.atlantis.map((p) => p.id),
        titans: winner.titans.map((p) => p.id),
        method: "ranked_balanced",
      }),
    );
    sessionStorage.removeItem(RANKED_VOTE_STORAGE_KEY);
    router.replace("/teams");
  };

  if (loading) {
    return (
      <div className="goa-root goa-vote-page goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <ScrollText size={32} />
          </div>
          <p className="goa-loading-text">Tallying the host…</p>
        </div>
      </div>
    );
  }

  const isLiveStage = stage === "ballot" || stage === "ban_ballot" || stage === "setup";

  return (
    <main
      className={`goa-root goa-vote-page${isLiveStage ? " goa-vote-live" : ""}`}
    >
      <header className="goa-header">
        <div className="goa-crown">
          <Star size={30} />
        </div>
        <h1 className="goa-title">Ranked Balance Vote</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {stage === "setup" && (
        <div className="goa-vote-live-body">
          <div className="goa-card">
            <div className="goa-card-head">
              <Ban size={16} /> Ban Options First?
            </div>
            <div className="draft-body">
              <p className="draft-note">
                Everyone can vote to ban the option they least want first —
                the {BAN_COUNT} most-voted-to-ban options are removed, then
                there's a second vote to choose between what's left. Or skip
                straight to choosing from all {splits.length} options now.
              </p>
              <div className="goa-vote-setup-actions">
                <button
                  type="button"
                  className="goa-btn inline-flex items-center justify-center gap-2"
                  onClick={startBanRound}
                >
                  <Ban size={16} /> Ban options first
                </button>
                <button
                  type="button"
                  className="goa-btn outline inline-flex items-center justify-center gap-2"
                  onClick={skipBanRound}
                >
                  Vote directly
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === "ban_ballot" && (
        <div className="goa-vote-live-body">
          <div className="goa-vote-ballot-head">
            <span className="goa-vote-ballot-title">Vote to Ban</span>
            <VoteDots total={totalVotes} cast={banVotesCast} variant="ban" />
          </div>
          <p className="draft-note">
            Tap the option you'd most like to remove, then pass the device
            on. If you have two votes from the Base badge, use them on two
            different options.
          </p>
          <div className="goa-vote-options">
            {splits.map((split, i) => (
              <OptionCard
                key={i}
                index={i}
                split={split}
                className="ranked-option vote-option-card ban"
                onClick={() => castBanVote(i)}
              />
            ))}
          </div>
        </div>
      )}

      {stage === "ban_tie_reveal" && (
        <div className="vote-tie-scene">
          <p className="draft-coin-label">
            Multiple options tied for banning — choosing randomly…
          </p>
          <div className="vote-tie-options">
            {banTiePool.map((i) => (
              <OptionCard
                key={i}
                index={i}
                split={splits[i]}
                className={`ranked-option vote-tie-option${
                  banTieActiveIndex === i ? " active" : ""
                }${
                  banTieEliminated.includes(i)
                    ? " loser"
                    : banTieEliminated.length > 0
                      ? " winner"
                      : ""
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {stage === "ban_results" && (
        <div className="goa-card">
          <div className="goa-card-head">
            <Ban size={16} /> Options Banned
          </div>
          <div className="draft-body">
            <p className="draft-note">
              These {bannedIndices.length} option(s) got the most votes to
              ban and are out of the running.
            </p>
            <div className="goa-vote-options">
              {sortBannedLast(splits, bannedIndices).map((i) => (
                <OptionCard
                  key={i}
                  index={i}
                  split={splits[i]}
                  className={`ranked-option${bannedIndices.includes(i) ? " banned" : ""}`}
                  banned={bannedIndices.includes(i)}
                  headExtra={
                    <span className="vote-results-count">
                      {banVotes[i]} of {totalVotes} ban votes
                    </span>
                  }
                />
              ))}
            </div>
            <div className="goa-btn-wrap" style={{ margin: 0 }}>
              <button
                className="goa-btn inline-flex items-center justify-center gap-2"
                onClick={continueAfterBan}
              >
                <Swords size={18} />
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "ballot" && (
        <div className="goa-vote-live-body">
          <div className="goa-vote-ballot-head">
            <span className="goa-vote-ballot-title">Cast Your Vote</span>
            <VoteDots total={totalVotes} cast={votesCast} />
          </div>
          <p className="draft-note">
            Tap an option to cast your vote, then pass the device on. If you
            have two votes from the Base badge, use them on two different
            options.
          </p>
          <div className="goa-vote-options">
            {activeIndices.map((i) => (
              <OptionCard
                key={i}
                index={i}
                split={splits[i]}
                className="ranked-option vote-option-card"
                onClick={() => castVote(i)}
              />
            ))}
          </div>
        </div>
      )}

      {stage === "tie_reveal" && (
        <div className="vote-tie-scene">
          <p className="draft-coin-label">
            Multiple options tied — choosing randomly…
          </p>
          <div className="vote-tie-options">
            {tieCandidates.map((i) => (
              <OptionCard
                key={i}
                index={i}
                split={splits[i]}
                className={`ranked-option vote-tie-option${
                  tieActiveIndex === i ? " active" : ""
                }${
                  winnerIndex === i ? " winner" : winnerIndex !== null ? " loser" : ""
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {stage === "results" && winnerIndex !== null && (
        <div className="goa-card">
          <div className="goa-card-head">
            <Crown size={16} /> Winning Split
          </div>
          <div className="draft-body">
            {skippedVoting ? (
              <p className="draft-note">
                Only one balanced split is possible for this group —
                applying it automatically.
              </p>
            ) : chooseRoundSkipped ? (
              <p className="draft-note">
                Only one option remained after banning — applying it
                automatically.
              </p>
            ) : null}
            <div className="goa-vote-options">
              {sortBannedLast(splits, bannedIndices).map((i) => (
                <OptionCard
                  key={i}
                  index={i}
                  split={splits[i]}
                  className={`ranked-option${i === winnerIndex ? " winner" : ""}${
                    bannedIndices.includes(i) ? " banned" : ""
                  }`}
                  banned={bannedIndices.includes(i)}
                  headExtra={
                    !skippedVoting && !bannedIndices.includes(i) && !chooseRoundSkipped ? (
                      <span className="vote-results-count">
                        {votes[i]} of {totalVotes} votes
                      </span>
                    ) : undefined
                  }
                />
              ))}
            </div>
            <div className="goa-btn-wrap" style={{ margin: 0 }}>
              <button
                className="goa-btn inline-flex items-center justify-center gap-2"
                onClick={finish}
              >
                <Swords size={18} />
                Continue to Divide the Host
              </button>
            </div>
          </div>
        </div>
      )}

      {voteConfirmVisible && <VoteConfirmPopup onClose={dismissVoteConfirm} />}
    </main>
  );
}

export default function TeamsVotePage() {
  return (
    <PasswordGate>
      <TeamsVotePageInner />
    </PasswordGate>
  );
}
