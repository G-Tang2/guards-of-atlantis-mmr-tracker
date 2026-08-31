"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PasswordGate } from "@/components/PasswordGate";
import { TEAMS_DRAFT_STORAGE_KEY } from "@/lib/teamsDraft";
import { RANKED_VOTE_STORAGE_KEY } from "@/lib/rankedVote";
import { rankedBalancedSplits, Split } from "@/lib/rankedBalance";
import { Star, Crown, ScrollText } from "lucide-react";

type Player = { id: string; name: string; avatar_url?: string | null };
type Stage = "ballot" | "tie_reveal" | "results";

type StoredVote = {
  playerIds: string[];
  votes?: number[];
  votesCast?: number;
};

const FACTIONS = ["atlantis", "titans"] as const;

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

function OptionCard({
  index,
  split,
  onClick,
  className,
  headExtra,
}: {
  index: number;
  split: Split<Player>;
  onClick?: () => void;
  className?: string;
  headExtra?: ReactNode;
}) {
  const body = (
    <>
      <div className="ranked-option-head">
        <span>Option {index + 1}</span>
        {headExtra}
      </div>
      <div className="draft-live-teams">
        {FACTIONS.map((faction) => (
          <div key={faction} className="draft-live-team">
            <span
              className={`draft-faction-label ${faction === "atlantis" ? "atl" : "tit"}`}
            >
              {faction === "atlantis" ? "Atlantis" : "Titans"}
            </span>
            {split[faction].map((p) => (
              <div key={p.id} className="draft-live-row">
                <PlayerAvatar avatarUrl={p.avatar_url} name={p.name} size={18} />
                <span className="draft-live-name">{p.name}</span>
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

// Empty dots for players who haven't voted yet, filled/green for those who
// have — the only signal shown during voting, so nobody's specific pick
// leaks before every player has gone.
function VoteDots({ total, cast }: { total: number; cast: number }) {
  return (
    <div className="goa-vote-dots" aria-label={`${cast} of ${total} voted`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`goa-vote-dot${i < cast ? " voted" : ""}`} />
      ))}
    </div>
  );
}

function TeamsVotePageInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [splits, setSplits] = useState<Split<Player>[]>([]);
  const [skippedVoting, setSkippedVoting] = useState(false);

  const [stage, setStage] = useState<Stage>("ballot");
  const [votes, setVotes] = useState<number[]>([]);
  const [votesCast, setVotesCast] = useState(0);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [tieCandidates, setTieCandidates] = useState<number[]>([]);
  const [tieActiveIndex, setTieActiveIndex] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(3);

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
      supabaseClient
        .from("players")
        .select("id, name, avatar_url")
        .in("id", saved.playerIds)
        .then(({ data, error }) => {
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

          const computedSplits = rankedBalancedSplits(resolved, 3);
          setPlayerIds(saved.playerIds);
          setSplits(computedSplits);

          if (computedSplits.length <= 1) {
            // Nothing to vote on — apply the one possible split directly.
            setSkippedVoting(true);
            setVotes([saved.playerIds.length]);
            setWinnerIndex(0);
            setStage("results");
          } else {
            // Resume an in-progress tally (e.g. after an accidental
            // refresh) instead of restarting voting from zero.
            const resumable =
              saved.votes && saved.votes.length === computedSplits.length;
            setVotes(resumable ? saved.votes! : new Array(computedSplits.length).fill(0));
            setVotesCast(resumable ? (saved.votesCast ?? 0) : 0);
            setStage("ballot");
          }
          setLoading(false);
        });
    } catch {
      router.replace("/teams");
    }
  }, [router]);

  const persistProgress = (nextVotes: number[], nextVotesCast: number) => {
    sessionStorage.setItem(
      RANKED_VOTE_STORAGE_KEY,
      JSON.stringify({ playerIds, votes: nextVotes, votesCast: nextVotesCast }),
    );
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
    const max = Math.max(...finalVotes);
    const tied = finalVotes.reduce<number[]>(
      (acc, v, i) => (v === max ? [...acc, i] : acc),
      [],
    );
    if (tied.length === 1) {
      setWinnerIndex(tied[0]);
      setStage("results");
    } else {
      runTieBreak(tied);
    }
  };

  // A tap commits immediately — no separate confirm step and no
  // "vote recorded, pass the device" interstitial between voters.
  const castVote = (index: number) => {
    const nextVotes = votes.map((v, i) => (i === index ? v + 1 : v));
    const nextVotesCast = votesCast + 1;
    setVotes(nextVotes);
    setVotesCast(nextVotesCast);
    persistProgress(nextVotes, nextVotesCast);

    if (nextVotesCast >= playerIds.length) {
      settleTally(nextVotes);
    }
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

  // Auto-return once a winner has settled — the primary path is automatic;
  // "Continue Now" (below) just skips the wait for an impatient controller.
  useEffect(() => {
    if (stage !== "results" || winnerIndex === null) return;
    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);
    const t3 = setTimeout(() => finish(), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, winnerIndex]);

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

  const isLiveStage = stage === "ballot";

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

      {stage === "ballot" && (
        <div className="goa-vote-live-body">
          <div className="goa-vote-ballot-head">
            <span className="goa-vote-ballot-title">Cast Your Vote</span>
            <VoteDots total={playerIds.length} cast={votesCast} />
          </div>
          <p className="draft-note">
            Tap an option to cast your vote, then pass the device on.
          </p>
          <div className="goa-vote-options">
            {splits.map((split, i) => (
              <OptionCard
                key={i}
                index={i}
                split={split}
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
            ) : null}
            <div className="goa-vote-options">
              {splits.map((split, i) => (
                <OptionCard
                  key={i}
                  index={i}
                  split={split}
                  className={`ranked-option${i === winnerIndex ? " winner" : ""}`}
                  headExtra={
                    !skippedVoting ? (
                      <span className="vote-results-count">
                        {votes[i]} of {playerIds.length} votes
                      </span>
                    ) : undefined
                  }
                />
              ))}
            </div>
            <p className="draft-note">
              Returning to Divide the Host in {countdown}…{" "}
              <button className="vote-continue-now" onClick={finish}>
                Continue Now
              </button>
            </p>
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
