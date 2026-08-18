"use client";

import Image from "next/image";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { getHero, renderStars, MatchPlayer } from "@/lib/match";
import { Coins } from "lucide-react";

type TeamPanelProps = {
  label: string;
  labelClass: "atl" | "tit";
  players: MatchPlayer[];
  avgMmr: number;
  onSelectPlayer: (id: string) => void;
};

export function TeamPanel({
  label,
  labelClass,
  players,
  avgMmr,
  onSelectPlayer,
}: TeamPanelProps) {
  return (
    <div className="goa-team">
      <span className={`goa-team-head ${labelClass}`}>{label}</span>
      <div className="goa-avg-mmr">Avg {Math.round(avgMmr)} MMR</div>
      {players.map((p) => {
        const hero = getHero(p.hero_id);
        const delta = p.mmr_after - p.mmr_before;
        return (
          <div
            key={p.player_id}
            className="goa-player-entry clickable"
            onClick={(e) => {
              e.stopPropagation();
              onSelectPlayer(p.player_id);
            }}
          >
            <div className="goa-player-info">
              <span className="goa-player-name">
                <PlayerAvatar
                  avatarUrl={p.players.avatar_url}
                  name={p.players.name}
                  size={32}
                />
                {p.players.name}
              </span>
              <span className="goa-mmr-change">
                {p.mmr_before} → {p.mmr_after}
                <span
                  className={`goa-player-delta ${delta >= 0 ? "pos" : "neg"}`}
                >
                  {delta >= 0 ? "▲" : "▼"}
                  {Math.abs(delta)}
                </span>
              </span>
            </div>
            <span className="goa-display-hero">
              {hero && (
                <Image
                  src={hero.icon}
                  alt={hero.name}
                  width={24}
                  height={24}
                  className="goa-display-hero-icon"
                />
              )}
              {hero?.name} {renderStars(Number(hero?.complexity ?? 0))}
              {p.is_bounty && (
                <span className="goa-bounty-badge">
                  <Coins size={10} />
                  +5
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
