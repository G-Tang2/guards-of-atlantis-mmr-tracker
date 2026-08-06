"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/lib/badges";
import { BADGE_COMPLETE_MMR_BONUS } from "@/lib/heroWinBonus";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export type EarnedBadgeInfo = {
  playerId: string;
  playerName: string;
  playerAvatar?: string | null;
  badge: Badge;
};

export function BadgeEarnedOverlay({
  badges,
  onDone,
}: {
  badges: EarnedBadgeInfo[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  if (badges.length === 0) return null;

  const current = badges[index];
  const isLast = index === badges.length - 1;

  const advance = () => {
    if (isLast) onDone();
    else setIndex((i) => i + 1);
  };

  return (
    <div className="goa-badge-earned-backdrop" onClick={advance}>
      <div className="goa-badge-earned-card" key={current.badge.id}>
        <p className="goa-badge-earned-kicker">Badge Earned</p>
        <div className="goa-badge-earned-icon-wrap">
          <span className="goa-badge-earned-ring" />
          <span className="goa-badge-earned-ring delay" />
          <Image
            src={current.badge.icon}
            alt={current.badge.name}
            width={96}
            height={96}
            className="goa-badge-earned-icon"
          />
        </div>
        <h2 className="goa-badge-earned-name">{current.badge.name}</h2>
        <div className="goa-badge-earned-player">
          <PlayerAvatar
            avatarUrl={current.playerAvatar}
            name={current.playerName}
            size={28}
          />
          <span>{current.playerName}</span>
        </div>
        <p className="goa-badge-earned-bonus">
          +{BADGE_COMPLETE_MMR_BONUS} MMR
        </p>
        <button
          className="goa-badge-earned-btn"
          onClick={(e) => {
            e.stopPropagation();
            advance();
          }}
        >
          {isLast ? "Continue" : "Next"}
        </button>
        {badges.length > 1 && (
          <p className="goa-badge-earned-count">
            {index + 1} / {badges.length}
          </p>
        )}
      </div>
    </div>
  );
}
