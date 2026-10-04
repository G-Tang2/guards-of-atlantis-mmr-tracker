"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { PasswordGate } from "@/components/PasswordGate";
import { OptionCard, VoteDots, VoteConfirmPopup } from "@/components/RankedVoteUI";
import { TEAMS_DRAFT_STORAGE_KEY } from "@/lib/teamsDraft";
import { RANKED_VOTE_STORAGE_KEY } from "@/lib/rankedVote";
import {
  RANKED_BALANCE_RESULT_STORAGE_KEY,
  RankedBalanceResult,
} from "@/lib/rankedBalanceResult";
import { LAST_BATTLE_STEP_STORAGE_KEY } from "@/lib/battleSession";
import { rankedBalancedSplits, MAX_SKILL_POINT_DIFF } from "@/lib/rankedBalance";
import {
  VoteSessionRow,
  VoteSessionPlayer,
  BAN_COUNT,
  computeVoteAllowance,
  totalVotesFromAllowance,
  sortBannedLast,
  votedFully,
  incrementBanVote,
  undoBanVote,
  settleBanIfComplete,
  incrementChooseVote,
  undoChooseVote,
  settleChooseIfComplete,
  startBanRound as startBanRoundDb,
  skipBanRound as skipBanRoundDb,
  continueAfterBan as continueAfterBanDb,
  forceChooseWinner,
} from "@/lib/rankedVoteSession";
import { buildWonHeroesByPlayer } from "@/lib/heroWinBonus";
import { getOwnedBadgeIds } from "@/lib/badgeRewards";
import { Star, Crown, ScrollText, Swords, Ban, Share2, CheckCircle2 } from "lucide-react";

type Player = VoteSessionPlayer;

type StoredVoteRef = { playerIds: string[]; sessionId?: string };

// Pure, module-level (mirrors shuffle() in app/teams/page.tsx) so the
// random pick lives outside the component's closures. Purely a *cosmetic*
// reveal on whichever device happens to be showing it — the actual winner
// among `tied` was already decided, identically, for every device (see
// resolveChooseWinner in lib/rankedVoteSession.ts) the instant the
// completing vote settled; this just plays back that decision dramatically
// on this one screen instead of an instant, dry read of session.winner_index.
function buildTieBreak(tied: number[], winner: number) {
  const steps = 14;
  const sequence = Array.from({ length: steps }, (_, i) => tied[i % tied.length]);
  sequence[steps - 1] = winner;
  return sequence;
}

function TeamsVotePageInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<VoteSessionRow | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // The choose-round tie-break reveal is purely a cosmetic flourish this
  // device plays back once, right after *observing* a live transition into
  // "results" with more than one tied option — never on first load already
  // sitting in "results" (nothing to reveal, just show it), and never
  // twice for the same result. See buildTieBreak's own comment.
  const [revealPhase, setRevealPhase] = useState<"idle" | "revealing" | "done">("done");
  const [tieActiveIndex, setTieActiveIndex] = useState<number | null>(null);
  const prevStageRef = useRef<string | null>(null);

  const [voteConfirmVisible, setVoteConfirmVisible] = useState(false);
  // What Continue/Undo on the currently-shown popup should each do — set
  // together by showConfirmationThen for whichever tap is being confirmed,
  // and both cleared once either one runs.
  const voteConfirmActionRef = useRef<(() => void) | null>(null);
  const voteConfirmUndoRef = useRef<(() => void) | null>(null);

  // Set while the "hold to pick this option directly" confirmation is up
  // (see OptionCard's onHoldComplete) — an option index, not a boolean,
  // since the dialog needs to say which option it's about to lock in.
  const [forceWinnerIndex, setForceWinnerIndex] = useState<number | null>(null);

  // React (in dev, under StrictMode) runs a fresh-mount effect twice —
  // harmless for an effect that only reads, but this one can *create* a
  // brand new session row (a real POST) when there's nothing to resume
  // yet. Without this guard, both invocations race to create their own
  // session with their own independently-randomized splits, and whichever
  // one's callback resolves last wins localStorage's sessionId — while
  // anything already done against the *other* one (e.g. a tap that landed
  // before the race resolved) is silently orphaned on a row nobody's
  // looking at anymore. The ref (unlike a state flag) is stable across
  // both invocations, since StrictMode replays effects on the same
  // mounted instance rather than remounting it.
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const raw = localStorage.getItem(RANKED_VOTE_STORAGE_KEY);
    if (!raw) {
      router.replace("/teams");
      return;
    }
    let saved: StoredVoteRef;
    try {
      saved = JSON.parse(raw) as StoredVoteRef;
    } catch {
      router.replace("/teams");
      return;
    }
    if (!saved.playerIds || saved.playerIds.length < 2) {
      router.replace("/teams");
      return;
    }

    if (saved.sessionId) {
      // Resume an existing session — never recompute splits here, since
      // rankedBalancedSplits has real randomness in its own tie-breaking
      // and every device (this refresh included) needs to see the exact
      // same options a remote voter might already be looking at.
      supabaseClient
        .from("ranked_vote_sessions")
        .select("*")
        .eq("id", saved.sessionId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error || !data) {
            router.replace("/teams");
            return;
          }
          const row = data as VoteSessionRow;
          prevStageRef.current = row.stage;
          setRevealPhase("done");
          setSession(row);
          setLoading(false);
        });
      return;
    }

    // Brand new vote — compute everything once and create the session row
    // that this device and every remote voter from here on will share.
    Promise.all([
      supabaseClient
        .from("players")
        .select("id, name, mmr, avatar_url")
        .in("id", saved.playerIds),
      // Base badge ownership — every hero any of tonight's players has
      // ever won with, used only to work out who gets a second vote (see
      // lib/rankedVoteSession.ts's computeVoteAllowance). Not scoped to
      // didWin here; buildWonHeroesByPlayer already applies that filter.
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
      const baseOwnerIds = new Set(
        saved.playerIds.filter((id) =>
          getOwnedBadgeIds(wonHeroesByPlayer.get(id) ?? new Set()).has("base"),
        ),
      );
      const voteAllowance = computeVoteAllowance(saved.playerIds, baseOwnerIds);
      const computedTotalVotes = totalVotesFromAllowance(voteAllowance);

      const computedSplits = rankedBalancedSplits(resolved, 4);
      const allIndices = computedSplits.map((_, i) => i);

      const initial: Partial<VoteSessionRow> = {
        player_ids: saved.playerIds,
        vote_allowance: voteAllowance,
        splits: computedSplits,
        total_votes: computedTotalVotes,
        active_indices: allIndices,
      };

      if (computedSplits.length === 0) {
        // No split keeps both sides within the skill-point threshold —
        // there's nothing to vote on at all, not even a single option.
        initial.stage = "impossible";
      } else if (computedSplits.length <= 1) {
        // Nothing to vote on — apply the one possible split directly.
        initial.stage = "results";
        initial.skipped_voting = true;
        initial.votes = [computedTotalVotes];
        initial.winner_index = 0;
      } else {
        // Banning only makes sense with enough options left afterward to
        // still hold a real vote — with exactly 2 or 3 options, removing
        // BAN_COUNT would either remove everything or leave just one
        // survivor with no vote needed, so the *offer* itself is reserved
        // for 3+ options.
        const offerBan = computedSplits.length > BAN_COUNT;
        if (offerBan) {
          initial.stage = "setup";
        } else {
          initial.stage = "ballot";
          initial.wants_ban = false;
          initial.votes = new Array(computedSplits.length).fill(0);
        }
      }

      supabaseClient
        .from("ranked_vote_sessions")
        .insert(initial)
        .select("*")
        .single()
        .then(({ data: created, error: insertError }) => {
          if (insertError || !created) {
            router.replace("/teams");
            return;
          }
          const row = created as VoteSessionRow;
          localStorage.setItem(
            RANKED_VOTE_STORAGE_KEY,
            JSON.stringify({ playerIds: saved.playerIds, sessionId: row.id }),
          );
          localStorage.setItem(LAST_BATTLE_STEP_STORAGE_KEY, "/teams/vote");
          prevStageRef.current = row.stage;
          setRevealPhase("done");
          setSession(row);
          setLoading(false);
        });
    });
  }, [router]);

  // Live sync — any other device (a remote voter via /vote/[id], or this
  // same session reopened elsewhere) writing to this row shows up here
  // within moments, no polling.
  useEffect(() => {
    if (!session?.id) return;
    const channel = supabaseClient
      .channel(`ranked-vote-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ranked_vote_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          // Merged rather than replaced outright — belt-and-suspenders
          // against a payload missing a column Postgres decided was
          // unchanged (see migration 0012's own REPLICA IDENTITY FULL
          // comment for why that shouldn't happen here, but a merge costs
          // nothing and means it can never blank out part of the session
          // even if some future column ends up exempt from that).
          setSession((prev) => (prev ? { ...prev, ...(payload.new as VoteSessionRow) } : (payload.new as VoteSessionRow)));
        },
      )
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  // Plays the tie-break flourish exactly once, only for a transition this
  // device actually witnessed live (see revealPhase's own comment).
  useEffect(() => {
    if (!session) return;
    const cameFromElsewhere = prevStageRef.current !== session.stage;
    prevStageRef.current = session.stage;
    if (!cameFromElsewhere) return;
    if (session.stage !== "results" || session.tied_indices.length <= 1) return;

    setRevealPhase("revealing");
    const sequence = buildTieBreak(session.tied_indices, session.winner_index ?? session.tied_indices[0]);
    let delay = 90;
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    sequence.forEach((idx) => {
      cumulative += delay;
      delay = Math.round(delay * 1.18);
      timers.push(setTimeout(() => setTieActiveIndex(idx), cumulative));
    });
    timers.push(
      setTimeout(() => {
        setTieActiveIndex(null);
        setRevealPhase("done");
      }, cumulative + 300),
    );
    return () => timers.forEach(clearTimeout);
  }, [session]);

  // A tap commits immediately (see incrementChooseVote/incrementBanVote's
  // own comment), then this pop-up covers the options until the group
  // explicitly answers it — nothing else happens in the meantime,
  // including settling the tally on the very last tap, so that always
  // waits on the same explicit "pass the device" beat as every other vote.
  // `after` runs on Continue; `undo` (a full revert of the tap that raised
  // this popup) runs instead if the group taps Undo.
  const showConfirmationThen = (after: () => void, undo: () => void) => {
    voteConfirmActionRef.current = after;
    voteConfirmUndoRef.current = undo;
    setVoteConfirmVisible(true);
  };

  const continueVoteConfirm = () => {
    setVoteConfirmVisible(false);
    voteConfirmActionRef.current?.();
    voteConfirmActionRef.current = null;
    voteConfirmUndoRef.current = null;
  };

  const undoVoteConfirm = () => {
    setVoteConfirmVisible(false);
    voteConfirmUndoRef.current?.();
    voteConfirmActionRef.current = null;
    voteConfirmUndoRef.current = null;
  };

  const castVote = async (index: number) => {
    if (!session) return;
    const before = session;
    const updated = await incrementChooseVote(before, index);
    if (updated) setSession(updated);
    showConfirmationThen(
      async () => {
        const settled = await settleChooseIfComplete(updated ?? before);
        if (settled) setSession(settled);
      },
      async () => {
        if (!updated) return;
        const reverted = await undoChooseVote(updated, index);
        if (reverted) setSession(reverted);
      },
    );
  };

  const castBanVoteTap = async (index: number) => {
    if (!session) return;
    const before = session;
    const updated = await incrementBanVote(before, index);
    if (updated) setSession(updated);
    showConfirmationThen(
      async () => {
        const settled = await settleBanIfComplete(updated ?? before);
        if (settled) setSession(settled);
      },
      async () => {
        if (!updated) return;
        const reverted = await undoBanVote(updated, index);
        if (reverted) setSession(reverted);
      },
    );
  };

  const confirmForceWinner = async () => {
    if (!session || forceWinnerIndex === null) return;
    const index = forceWinnerIndex;
    setForceWinnerIndex(null);
    const updated = await forceChooseWinner(session, index);
    if (updated) setSession(updated);
  };

  const startBanRound = async () => {
    if (!session) return;
    const updated = await startBanRoundDb(session);
    if (updated) setSession(updated);
  };

  const skipBanRound = async () => {
    if (!session) return;
    const updated = await skipBanRoundDb(session);
    if (updated) setSession(updated);
  };

  const continueAfterBan = async () => {
    if (!session) return;
    const updated = await continueAfterBanDb(session);
    if (updated) setSession(updated);
  };

  const finish = () => {
    if (!session || session.winner_index === null) return;
    const winner = session.splits[session.winner_index];
    const raw = localStorage.getItem(TEAMS_DRAFT_STORAGE_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      TEAMS_DRAFT_STORAGE_KEY,
      JSON.stringify({
        ...prev,
        pool: [],
        atlantis: winner.atlantis.map((p) => p.id),
        titans: winner.titans.map((p) => p.id),
        method: "ranked_balanced",
      }),
    );

    // The vote session row is about to be left behind — stash its full
    // breakdown separately so /matches/new can save it onto the match row
    // for the detail page to show later.
    const result: RankedBalanceResult = {
      totalVotes: session.total_votes,
      wantsBan: session.wants_ban === true,
      skippedVoting: session.skipped_voting,
      chooseRoundSkipped: session.choose_round_skipped,
      winnerIndex: session.winner_index,
      options: session.splits.map((split, i) => ({
        atlantis: split.atlantis.map((p) => ({ id: p.id, name: p.name, mmr: p.mmr, avatar_url: p.avatar_url ?? null })),
        titans: split.titans.map((p) => ({ id: p.id, name: p.name, mmr: p.mmr, avatar_url: p.avatar_url ?? null })),
        votes: session.votes[i] ?? 0,
        banVotes: session.wants_ban ? (session.ban_votes[i] ?? 0) : undefined,
        banned: session.banned_indices.includes(i),
      })),
    };
    localStorage.setItem(RANKED_BALANCE_RESULT_STORAGE_KEY, JSON.stringify(result));

    localStorage.removeItem(RANKED_VOTE_STORAGE_KEY);
    router.replace("/teams");
  };

  const backToTeams = () => {
    localStorage.removeItem(RANKED_VOTE_STORAGE_KEY);
    router.replace("/teams");
  };

  const copyShareLink = async () => {
    if (!session) return;
    const url = `${window.location.origin}/vote/${session.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard API unavailable/denied on this device — nothing else to
      // fall back to here; the group can still read the URL off another
      // device that can copy, or the host can type it out manually.
    }
  };

  if (loading || !session) {
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

  const stage = session.stage;
  const isLiveStage = stage === "ballot" || stage === "ban_ballot" || stage === "setup";
  const showingTieReveal = stage === "results" && revealPhase === "revealing";

  // Every option includes every player, just assigned to a different side
  // — session.splits[0] alone already has the full roster.
  const roster = [...session.splits[0].atlantis, ...session.splits[0].titans];
  // Only ever reflects players who voted through the shareable link (see
  // ban_voters/voters' own column comments) — a tap on this device itself
  // stays fully anonymous, exactly as it always has.
  const votedNames = (votersMap: Record<string, number>): string[] =>
    roster.filter((p) => votedFully(votersMap, session.vote_allowance, p.id)).map((p) => p.name);

  // settleChooseIfComplete (the only other way winner_index ever gets set)
  // never runs until votes_cast reaches total_votes — so seeing a winner
  // with the tally still short of that can only mean the match creator
  // locked it in directly with a press-and-hold instead of letting the
  // vote finish (see forceChooseWinner in lib/rankedVoteSession.ts).
  const wasForced =
    stage === "results" &&
    !session.skipped_voting &&
    !session.choose_round_skipped &&
    session.votes_cast < session.total_votes;

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

      {stage !== "impossible" && (
        <div className="goa-vote-share">
          <button type="button" className="goa-vote-share-btn" onClick={copyShareLink}>
            <Share2 size={14} />
            {shareCopied ? "Link Copied!" : "Share Vote Link"}
          </button>
        </div>
      )}

      {stage === "impossible" && (
        <div className="goa-card">
          <div className="goa-card-head">
            <Ban size={16} /> Ranked Balance Not Possible
          </div>
          <div className="draft-body">
            <p className="draft-note">
              No split of this group keeps both sides within{" "}
              {MAX_SKILL_POINT_DIFF} skill points of each other — try
              Balanced or Custom teams instead.
            </p>
            <div className="goa-btn-wrap" style={{ margin: 0 }}>
              <button
                type="button"
                className="goa-btn inline-flex items-center justify-center gap-2"
                onClick={backToTeams}
              >
                <Swords size={18} />
                Back to Teams
              </button>
            </div>
          </div>
        </div>
      )}

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
                straight to choosing from all {session.splits.length} options
                now.
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
            <span className="goa-vote-ballot-title ban">
              <Ban size={14} /> Vote to Ban
            </span>
            <VoteDots total={session.total_votes} cast={session.ban_votes_cast} variant="ban" />
          </div>
          {votedNames(session.ban_voters).length > 0 && (
            <p className="goa-vote-voted-note">
              <CheckCircle2 size={12} /> Voted via link: {votedNames(session.ban_voters).join(", ")}
            </p>
          )}
          <p className="draft-note">
            Tap the option you'd most like to remove, then pass the device
            on. If you have two votes from the Base badge, use them on two
            different options.
          </p>
          <div className="goa-vote-options">
            {session.splits.map((split, i) => (
              <OptionCard
                key={i}
                index={i}
                split={split}
                className="ranked-option vote-option-card ban"
                onClick={() => castBanVoteTap(i)}
                disabled={voteConfirmVisible}
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
              These {session.banned_indices.length} option(s) got the most
              votes to ban and are out of the running.
            </p>
            <div className="goa-vote-options">
              {sortBannedLast(session.splits, session.banned_indices).map((i) => (
                <OptionCard
                  key={i}
                  index={i}
                  split={session.splits[i]}
                  className={`ranked-option${
                    session.banned_indices.includes(i) ? " banned" : ""
                  }`}
                  banned={session.banned_indices.includes(i)}
                  headExtra={
                    <span className="vote-results-count">
                      {session.ban_votes[i]} of {session.total_votes} ban votes
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
            <span className="goa-vote-ballot-title">
              <Crown size={14} /> Cast Your Vote
            </span>
            <VoteDots total={session.total_votes} cast={session.votes_cast} />
          </div>
          {votedNames(session.voters).length > 0 && (
            <p className="goa-vote-voted-note">
              <CheckCircle2 size={12} /> Voted via link: {votedNames(session.voters).join(", ")}
            </p>
          )}
          <p className="draft-note">
            Tap an option to cast your vote, then pass the device on. If you
            have two votes from the Base badge, use them on two different
            options.
          </p>
          <p className="draft-note subtle">
            Match creator: press and hold an option for 2 seconds to pick it
            directly and skip the rest of the vote.
          </p>
          <div className="goa-vote-options">
            {session.active_indices.map((i) => (
              <OptionCard
                key={i}
                index={i}
                split={session.splits[i]}
                className="ranked-option vote-option-card"
                onClick={() => castVote(i)}
                disabled={voteConfirmVisible}
                onHoldComplete={() => setForceWinnerIndex(i)}
              />
            ))}
          </div>
        </div>
      )}

      {showingTieReveal && (
        <div className="vote-tie-scene">
          <p className="draft-coin-label">
            Multiple options tied — choosing randomly…
          </p>
          <div className="vote-tie-options">
            {session.tied_indices.map((i) => (
              <OptionCard
                key={i}
                index={i}
                split={session.splits[i]}
                className={`ranked-option vote-tie-option${
                  tieActiveIndex === i ? " active" : ""
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {stage === "results" && !showingTieReveal && session.winner_index !== null && (
        <div className="goa-card">
          <div className="goa-card-head">
            <Crown size={16} /> Winning Split
          </div>
          <div className="draft-body">
            {session.skipped_voting ? (
              <p className="draft-note">
                Only one balanced split is possible for this group —
                applying it automatically.
              </p>
            ) : session.choose_round_skipped ? (
              <p className="draft-note">
                Only one option remained after banning — applying it
                automatically.
              </p>
            ) : wasForced ? (
              <p className="draft-note">
                The match creator picked this option directly.
              </p>
            ) : null}
            <div className="goa-vote-options">
              {sortBannedLast(session.splits, session.banned_indices).map((i) => (
                <OptionCard
                  key={i}
                  index={i}
                  split={session.splits[i]}
                  className={`ranked-option${
                    i === session.winner_index ? " winner" : ""
                  }${session.banned_indices.includes(i) ? " banned" : ""}`}
                  banned={session.banned_indices.includes(i)}
                  headExtra={
                    !session.skipped_voting &&
                    !session.banned_indices.includes(i) &&
                    !session.choose_round_skipped &&
                    !wasForced ? (
                      <span className="vote-results-count">
                        {session.votes[i]} of {session.total_votes} votes
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

      {voteConfirmVisible && (
        <VoteConfirmPopup onContinue={continueVoteConfirm} onUndo={undoVoteConfirm} />
      )}

      {forceWinnerIndex !== null && (
        <div
          className="draft-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setForceWinnerIndex(null);
          }}
        >
          <div className="draft-sheet">
            <div className="draft-head">
              <span className="draft-head-title inline-flex items-center gap-1.5">
                <Crown size={16} />
                Pick Option {forceWinnerIndex + 1}?
              </span>
              <button className="draft-close" onClick={() => setForceWinnerIndex(null)}>
                ✕
              </button>
            </div>
            <div className="draft-body">
              <p className="draft-note" style={{ textAlign: "left" }}>
                This locks in Option {forceWinnerIndex + 1} as the winner
                right now and skips the rest of the vote. The current tally
                is discarded.
              </p>
              <div className="goa-btn-wrap" style={{ margin: 0 }}>
                <button
                  className="goa-btn inline-flex items-center justify-center gap-2"
                  onClick={confirmForceWinner}
                >
                  <Crown size={18} />
                  Pick Option {forceWinnerIndex + 1}
                </button>
              </div>
              <div className="goa-btn-wrap" style={{ margin: 0 }}>
                <button
                  className="goa-btn outline inline-flex items-center justify-center gap-2"
                  onClick={() => setForceWinnerIndex(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
