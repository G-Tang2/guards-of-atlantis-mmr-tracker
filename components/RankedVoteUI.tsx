// Shared between the match creator's own page (app/teams/vote/page.tsx)
// and the public shareable-link page (app/vote/[id]/page.tsx) — the same
// option cards, vote dots, and "vote counted" pop-up render identically on
// both, so they live here once instead of twice.

import { ReactNode, useRef } from "react";
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
  onHoldComplete,
  holdMs = 2000,
}: {
  index: number;
  split: Split<VoteSessionPlayer>;
  onClick?: () => void;
  className?: string;
  headExtra?: ReactNode;
  banned?: boolean;
  disabled?: boolean;
  // Host-only press-and-hold override (see app/teams/vote/page.tsx) — omit
  // it and this card behaves exactly as a plain tap-to-vote button always
  // has, so the shareable-link page (which never passes it) is unaffected.
  onHoldComplete?: () => void;
  holdMs?: number;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const holdFrameRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  // Set true the instant a hold completes, so the click event the browser
  // still fires on release (same press, same element) doesn't *also* land
  // as a normal vote tap while a confirmation for the held option is
  // already coming up. Cleared again shortly after — not on next click —
  // since a real mouse click can end up targeting a now-open confirmation
  // dialog instead of this button at all, leaving nothing to clear it.
  const holdFiredRef = useRef(false);

  const setHoldProgress = (value: number) => {
    buttonRef.current?.style.setProperty("--hold-progress", String(value));
  };

  const cancelHold = () => {
    if (holdFrameRef.current !== null) cancelAnimationFrame(holdFrameRef.current);
    holdFrameRef.current = null;
    holdStartRef.current = null;
    setHoldProgress(0);
  };

  const tickHold = () => {
    if (holdStartRef.current === null) return;
    const progress = Math.min(1, (Date.now() - holdStartRef.current) / holdMs);
    setHoldProgress(progress * 100);
    if (progress >= 1) {
      holdFiredRef.current = true;
      cancelHold();
      onHoldComplete?.();
      setTimeout(() => {
        holdFiredRef.current = false;
      }, 500);
      return;
    }
    holdFrameRef.current = requestAnimationFrame(tickHold);
  };

  const startHold = () => {
    if (!onHoldComplete || disabled) return;
    holdStartRef.current = Date.now();
    holdFrameRef.current = requestAnimationFrame(tickHold);
  };

  const handleClick = () => {
    if (holdFiredRef.current) {
      holdFiredRef.current = false;
      return;
    }
    onClick?.();
  };

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
    <button
      ref={buttonRef}
      type="button"
      className={`${className}${onHoldComplete ? " holdable" : ""}`}
      onClick={handleClick}
      disabled={disabled}
      onPointerDown={onHoldComplete ? startHold : undefined}
      onPointerUp={onHoldComplete ? cancelHold : undefined}
      onPointerLeave={onHoldComplete ? cancelHold : undefined}
      onPointerCancel={onHoldComplete ? cancelHold : undefined}
    >
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
