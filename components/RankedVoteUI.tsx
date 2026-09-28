// Shared between the match creator's own page (app/teams/vote/page.tsx)
// and the public shareable-link page (app/vote/[id]/page.tsx) — the same
// option cards, vote dots, and "vote counted" pop-up render identically on
// both, so they live here once instead of twice.

import { ReactNode } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { previewWinGain } from "@/lib/mmr";
import { Split } from "@/lib/rankedBalance";
import { VoteSessionPlayer } from "@/lib/rankedVoteSession";
import { Ban, CheckCircle2, Undo2 } from "lucide-react";

const FACTIONS = ["atlantis", "titans"] as const;

export const avg = (players: VoteSessionPlayer[]) =>
  players.length === 0
    ? 0
    : Math.round(players.reduce((s, p) => s + p.mmr, 0) / players.length);

export function OptionCard({
  index,
  split,
  onClick,
  className,
  headExtra,
  banned,
  disabled,
}: {
  index: number;
  split: Split<VoteSessionPlayer>;
  onClick?: () => void;
  className?: string;
  headExtra?: ReactNode;
  banned?: boolean;
  disabled?: boolean;
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
        {(() => {
          const gain = previewWinGain(avg(split.atlantis), avg(split.titans));
          return FACTIONS.map((faction) => (
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
              <div className="draft-live-team-gain">+{gain[faction]} MMR for the win</div>
              {split[faction].map((p) => (
                <div key={p.id} className="draft-live-row">
                  <PlayerAvatar avatarUrl={p.avatar_url} name={p.name} size={18} />
                  <span className="draft-live-name">{p.name}</span>
                  <span className="draft-live-mmr sm">{p.mmr} MMR</span>
                </div>
              ))}
            </div>
          ));
        })()}
      </div>
    </>
  );

  if (!onClick) {
    return <div className={className}>{body}</div>;
  }
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {body}
    </button>
  );
}

// Empty dots for players who haven't voted yet, filled for those who
// have — the only signal shown during voting, so nobody's specific pick
// leaks before every player has gone. Red during a ban round (voting for
// what to remove) instead of the usual green (voting for what to keep),
// so the two kinds of ballot are never visually confusable at a glance.
export function VoteDots({
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

// Shown after every single tap (ban or choose round) — a small pop-up
// rather than a full-screen takeover. Stays up until the group explicitly
// taps Continue (proceeding, including settling the tally on the very
// last vote) or Undo (cancelling the tap that raised this popup instead).
export function VoteConfirmPopup({
  onContinue,
  onUndo,
  subtitle,
}: {
  onContinue: () => void;
  onUndo: () => void;
  subtitle?: string;
}) {
  return (
    <div className="goa-vote-confirm-popup">
      <CheckCircle2 size={24} className="goa-vote-confirm-icon" />
      <div className="goa-vote-confirm-text">
        <span className="goa-vote-confirm-title">Vote counted</span>
        <span className="goa-vote-confirm-sub">
          {subtitle ?? "Pass the device to the next person."}
        </span>
      </div>
      <div className="goa-vote-confirm-actions">
        <button type="button" className="goa-vote-confirm-undo" onClick={onUndo}>
          <Undo2 size={14} /> Undo
        </button>
        <button type="button" className="goa-vote-confirm-continue" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
