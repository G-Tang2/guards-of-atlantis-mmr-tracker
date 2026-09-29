// app/vote/[id]/page.tsx
//
// The shareable-link side of a Ranked Balance vote — deliberately outside
// PasswordGate (this link is meant to be handed to people who may not have
// the app's shared password at all) and with none of the match creator's
// own host-only controls (choosing whether to ban first, continuing past
// ban results, finishing the vote — see app/teams/vote/page.tsx). This
// page only ever does one thing: let whoever it's shared with pick their
// name once, then cast their own vote(s) into the very same live session,
// synced back to the creator's page in real time.
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { OptionCard, VoteDots, VoteConfirmPopup } from "@/components/RankedVoteUI";
import {
  VoteSessionRow,
  sortBannedLast,
  votedFully,
  votersWhoPicked,
  incrementBanVote,
  undoBanVote,
  settleBanIfComplete,
  incrementChooseVote,
  undoChooseVote,
  settleChooseIfComplete,
} from "@/lib/rankedVoteSession";
import { Star, Crown, ScrollText, Ban, CheckCircle2, Users } from "lucide-react";

const identityKey = (sessionId: string) => `goa-vote-identity-${sessionId}`;

export default function RemoteVotePage() {
  const params = useParams();
  const sessionId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<VoteSessionRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [voterId, setVoterId] = useState<string | null>(null);

  const [voteConfirmVisible, setVoteConfirmVisible] = useState(false);
  const voteConfirmActionRef = useRef<(() => void) | null>(null);
  const voteConfirmUndoRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setVoterId(localStorage.getItem(identityKey(sessionId)));
    supabaseClient
      .from("ranked_vote_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setSession(data as VoteSessionRow);
        setLoading(false);
      });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabaseClient
      .channel(`ranked-vote-remote-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ranked_vote_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          // See app/teams/vote/page.tsx's identical handler for why this
          // merges instead of replacing outright.
          setSession((prev) => (prev ? { ...prev, ...(payload.new as VoteSessionRow) } : (payload.new as VoteSessionRow)));
        },
      )
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [sessionId]);

  const selectIdentity = (playerId: string) => {
    localStorage.setItem(identityKey(sessionId), playerId);
    setVoterId(playerId);
  };

  const switchIdentity = () => {
    localStorage.removeItem(identityKey(sessionId));
    setVoterId(null);
  };

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

  const castBan = async (index: number) => {
    if (!session || !voterId) return;
    const before = session;
    const updated = await incrementBanVote(before, index, voterId);
    if (updated) setSession(updated);
    showConfirmationThen(
      async () => {
        const settled = await settleBanIfComplete(updated ?? before);
        if (settled) setSession(settled);
      },
      async () => {
        if (!updated) return;
        const reverted = await undoBanVote(updated, index, voterId);
        if (reverted) setSession(reverted);
      },
    );
  };

  // Retracting one of the voter's own already-cast picks — no confirm
  // pop-up (that's reserved for the "vote counted" moment of casting a
  // fresh vote), and never settles the round itself: a retraction only
  // ever moves votes_cast *down*, so it can't be the tap that completes a
  // tally. Once it goes through, this voter drops back below their
  // allowance and the ballot's own active-voting view reappears, letting
  // them tap a different option the normal way — that's the whole "change
  // your selection" flow, just two ordinary taps instead of one.
  const retractBan = async (index: number) => {
    if (!session || !voterId) return;
    const updated = await undoBanVote(session, index, voterId);
    if (updated) setSession(updated);
  };

  const retractChoice = async (index: number) => {
    if (!session || !voterId) return;
    const updated = await undoChooseVote(session, index, voterId);
    if (updated) setSession(updated);
  };

  const castChoose = async (index: number) => {
    if (!session || !voterId) return;
    const before = session;
    const updated = await incrementChooseVote(before, index, voterId);
    if (updated) setSession(updated);
    showConfirmationThen(
      async () => {
        const settled = await settleChooseIfComplete(updated ?? before);
        if (settled) setSession(settled);
      },
      async () => {
        if (!updated) return;
        const reverted = await undoChooseVote(updated, index, voterId);
        if (reverted) setSession(reverted);
      },
    );
  };

  if (loading) {
    return (
      <div className="goa-root goa-vote-page goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <ScrollText size={32} />
          </div>
          <p className="goa-loading-text">Finding the vote…</p>
        </div>
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <main className="goa-root goa-vote-page">
        <header className="goa-header">
          <div className="goa-crown">
            <Star size={30} />
          </div>
          <h1 className="goa-title">Ranked Balance Vote</h1>
        </header>
        <div className="goa-card">
          <div className="draft-body">
            <p className="draft-note">
              This vote link isn't valid — it may have expired, or the link
              might be mistyped.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Every option includes every player, just assigned to a different
  // side — session.splits[0] alone already has the full roster.
  const roster = [...session.splits[0].atlantis, ...session.splits[0].titans];
  const voter = voterId ? roster.find((p) => p.id === voterId) : undefined;
  const allowance = voterId ? (session.vote_allowance[voterId] ?? 1) : 1;
  const banUsed = voterId ? (session.ban_voters[voterId] ?? 0) : 0;
  const choiceUsed = voterId ? (session.voters[voterId] ?? 0) : 0;
  const myBanPicks = voterId ? (session.ban_picks[voterId] ?? []) : [];
  const myChoicePicks = voterId ? (session.choice_picks[voterId] ?? []) : [];

  // Other voters who picked an option — the current voter's own pick is
  // already called out separately ("Your vote — tap to remove"), so it'd
  // be redundant to also list their own name here.
  const otherVotersWhoPicked = (picks: Record<string, number[]>, index: number): string[] =>
    votersWhoPicked(picks, index, roster.filter((p) => p.id !== voterId));

  // Whoever's picking their name gets to see who's already gone — the
  // current round's own voters map, or nobody-done for a stage where no
  // round is actively open (setup/ban_results/results/impossible).
  const votedInCurrentRound = (playerId: string): boolean => {
    if (session.stage === "ban_ballot") return votedFully(session.ban_voters, session.vote_allowance, playerId);
    if (session.stage === "ballot") return votedFully(session.voters, session.vote_allowance, playerId);
    return false;
  };

  // .goa-vote-live caps the page to one fixed-height scroll container —
  // right for the ballot stages (the sticky vote-dots header needs that),
  // but wrong for "results", which shows every option (host or remote)
  // and needs to grow/scroll with the page like a normal card, not be
  // squeezed into a single viewport-height box. See app/teams/vote/page.tsx's
  // own isLiveStage for the same distinction.
  const isLiveStage =
    session.stage === "setup" || session.stage === "ban_ballot" || session.stage === "ballot";

  return (
    <main className={`goa-root goa-vote-page${isLiveStage ? " goa-vote-live" : ""}`}>
      <header className="goa-header">
        <div className="goa-crown">
          <Star size={30} />
        </div>
        <h1 className="goa-title">Ranked Balance Vote</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {!voter && session.stage !== "impossible" && (
        <div className="goa-card">
          <div className="goa-card-head">
            <Users size={16} /> Who Are You?
          </div>
          <div className="draft-body">
            <p className="draft-note">Pick your name to cast your vote.</p>
            <div className="goa-vote-identity-list">
              {roster.map((p) => {
                const done = votedInCurrentRound(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`goa-vote-identity-btn${done ? " voted" : ""}`}
                    onClick={() => selectIdentity(p.id)}
                  >
                    <PlayerAvatar avatarUrl={p.avatar_url} name={p.name} size={24} />
                    <span className="goa-vote-identity-name">{p.name}</span>
                    {done && <CheckCircle2 size={16} className="goa-vote-identity-check" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {voter && (
        <div className="goa-vote-identity-banner">
          Voting as <strong>{voter.name}</strong>
          <button type="button" className="goa-vote-identity-switch" onClick={switchIdentity}>
            Not you?
          </button>
        </div>
      )}

      {session.stage === "impossible" && (
        <div className="goa-card">
          <div className="goa-card-head">
            <Ban size={16} /> Ranked Balance Not Possible
          </div>
          <div className="draft-body">
            <p className="draft-note">
              No split of this group keeps both sides close enough in
              skill — the host will need to choose teams a different way.
            </p>
          </div>
        </div>
      )}

      {voter && session.stage === "setup" && (
        <div className="goa-card">
          <div className="draft-body">
            <p className="draft-note">
              Waiting for the host to start the vote…
            </p>
          </div>
        </div>
      )}

      {voter && session.stage === "ban_ballot" && (
        <div className="goa-vote-live-body">
          <div className="goa-vote-ballot-head">
            <span className="goa-vote-ballot-title ban">
              <Ban size={14} /> Vote to Ban
            </span>
            <VoteDots total={session.total_votes} cast={session.ban_votes_cast} variant="ban" />
          </div>
          {banUsed >= allowance ? (
            <>
              <p className="draft-note">
                You've cast your ban vote{allowance > 1 ? "s" : ""} — waiting
                for everyone else. Tap your own pick below to change it.
              </p>
              <div className="goa-vote-options">
                {session.splits.map((split, i) => {
                  const isMine = myBanPicks.includes(i);
                  const pickedBy = otherVotersWhoPicked(session.ban_picks, i);
                  return (
                    <OptionCard
                      key={i}
                      index={i}
                      split={split}
                      className={`ranked-option vote-option-card ban${isMine ? " your-pick" : ""}`}
                      onClick={() => retractBan(i)}
                      disabled={voteConfirmVisible || !isMine}
                      headExtra={
                        <span className="vote-results-count">
                          {session.ban_votes[i] ?? 0} of {session.total_votes} ban votes
                        </span>
                      }
                      footer={
                        <>
                          {isMine && (
                            <p className="goa-vote-your-pick">
                              <CheckCircle2 size={12} /> Your ban vote — tap to remove
                            </p>
                          )}
                          {pickedBy.length > 0 && (
                            <p className="goa-vote-option-voters">
                              <CheckCircle2 size={12} /> Voted by: {pickedBy.join(", ")}
                            </p>
                          )}
                        </>
                      }
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="draft-note">
                Tap the option you'd most like to remove.
                {allowance > 1 &&
                  ` You have ${allowance} votes — use them on two different options.`}
              </p>
              <div className="goa-vote-options">
                {session.splits.map((split, i) => (
                  <OptionCard
                    key={i}
                    index={i}
                    split={split}
                    className="ranked-option vote-option-card ban"
                    onClick={() => castBan(i)}
                    disabled={voteConfirmVisible}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {voter && session.stage === "ban_results" && (
        <div className="goa-card">
          <div className="goa-card-head">
            <Ban size={16} /> Options Banned
          </div>
          <div className="draft-body">
            <p className="draft-note">
              These {session.banned_indices.length} option(s) got the most
              votes to ban. Waiting for the host to continue…
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
          </div>
        </div>
      )}

      {voter && session.stage === "ballot" && (
        <div className="goa-vote-live-body">
          <div className="goa-vote-ballot-head">
            <span className="goa-vote-ballot-title">
              <Crown size={14} /> Cast Your Vote
            </span>
            <VoteDots total={session.total_votes} cast={session.votes_cast} />
          </div>
          {choiceUsed >= allowance ? (
            <>
              <p className="draft-note">
                You've cast your vote{allowance > 1 ? "s" : ""} — waiting for
                everyone else. Tap your own pick below to change it.
              </p>
              <div className="goa-vote-options">
                {session.active_indices.map((i) => {
                  const isMine = myChoicePicks.includes(i);
                  const pickedBy = otherVotersWhoPicked(session.choice_picks, i);
                  return (
                    <OptionCard
                      key={i}
                      index={i}
                      split={session.splits[i]}
                      className={`ranked-option vote-option-card${isMine ? " your-pick" : ""}`}
                      onClick={() => retractChoice(i)}
                      disabled={voteConfirmVisible || !isMine}
                      headExtra={
                        <span className="vote-results-count">
                          {session.votes[i] ?? 0} of {session.total_votes} votes
                        </span>
                      }
                      footer={
                        <>
                          {isMine && (
                            <p className="goa-vote-your-pick">
                              <CheckCircle2 size={12} /> Your vote — tap to remove
                            </p>
                          )}
                          {pickedBy.length > 0 && (
                            <p className="goa-vote-option-voters">
                              <CheckCircle2 size={12} /> Voted by: {pickedBy.join(", ")}
                            </p>
                          )}
                        </>
                      }
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="draft-note">
                Tap the option you'd like to vote for.
                {allowance > 1 &&
                  ` You have ${allowance} votes — use them on two different options.`}
              </p>
              <div className="goa-vote-options">
                {session.active_indices.map((i) => (
                  <OptionCard
                    key={i}
                    index={i}
                    split={session.splits[i]}
                    className="ranked-option vote-option-card"
                    onClick={() => castChoose(i)}
                    disabled={voteConfirmVisible}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {session.stage === "results" && session.winner_index !== null && (
        <div className="goa-card">
          <div className="goa-card-head">
            <Crown size={16} /> Winning Split
          </div>
          <div className="draft-body">
            <p className="draft-note">
              <CheckCircle2 size={14} className="inline-block align-text-bottom" />{" "}
              Thanks for voting! Here's the result.
            </p>
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
                    !session.choose_round_skipped ? (
                      <span className="vote-results-count">
                        {session.votes[i]} of {session.total_votes} votes
                      </span>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {voteConfirmVisible && (
        <VoteConfirmPopup
          onContinue={continueVoteConfirm}
          onUndo={undoVoteConfirm}
          subtitle="You can close this tab now, or wait here to see the result."
        />
      )}
    </main>
  );
}
