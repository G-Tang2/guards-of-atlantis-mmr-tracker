// app/heroes/[id]/page.tsx
"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { Hero } from "@/lib/heroes";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import Image from "next/image";
import { didWin, formatDate, getHero, renderStars } from "@/lib/match";
import { Swords, ScrollText, BookUser } from "lucide-react";

type Player = {
  id: string;
  name: string;
  mmr: number;
  avatar_url?: string | null;
};

type MatchPlayer = {
  player_id: string;
  team: "atlantis" | "titans" | "none";
  mmr_before: number;
  mmr_after: number;
  hero_id?: string | null;
  players: Player;
};

type Match = {
  id: string;
  match_number?: number;
  winner: "atlantis" | "titans" | "none";
  created_at: string;
  atlantis_avg_mmr: number;
  titans_avg_mmr: number;
  atlantis_mmr_change: number;
  titans_mmr_change: number;
  match_players: MatchPlayer[];
};

// Supabase returns the embedded `players` relation as an array when it
// can't infer a one-to-one cardinality from the foreign key, and as a
// single object when it can — normalize both shapes when loading.
type RawMatch = Omit<Match, "match_players"> & {
  match_players: (Omit<MatchPlayer, "players"> & {
    players: Player | Player[] | null;
  })[];
};

type TeamPanelProps = {
  label: string;
  labelClass: "atl" | "tit";
  players: MatchPlayer[];
  avgMmr: number;
  mmrChange: number;
  highlightHeroId: string;
  onSelectPlayer: (id: string) => void;
};

function TeamPanel({
  label,
  labelClass,
  players,
  avgMmr,
  mmrChange,
  highlightHeroId,
  onSelectPlayer,
}: TeamPanelProps) {
  return (
    <div className="goa-team">
      <div className="flex justify-between">
        <span className={`goa-team-head ${labelClass}`}>{label}</span>
        <span className={`goa-delta ${mmrChange >= 0 ? "pos" : "neg"}`}>
          {mmrChange >= 0 ? "▲" : "▼"}
          {Math.abs(mmrChange)}
        </span>
      </div>
      <div className="goa-avg-mmr">Avg {Math.round(avgMmr)} MMR</div>
      {players.map((p) => {
        const playedHero = getHero(p.hero_id);
        const isHighlighted = p.hero_id === highlightHeroId;
        return (
          <div
            key={p.player_id}
            className="goa-player-entry clickable"
            onClick={() => onSelectPlayer(p.player_id)}
          >
            <div className="goa-player-info">
              <span className="goa-player-name">
                <PlayerAvatar
                  avatarUrl={p.players.avatar_url}
                  name={p.players.name}
                  size={20}
                />
                {p.players.name}
              </span>
              <span className="goa-mmr-change">
                {p.mmr_before} → {p.mmr_after}
              </span>
            </div>
            {playedHero && (
              <span
                className={`goa-display-hero ${isHighlighted ? "highlight" : ""}`}
              >
                <Image
                  src={playedHero.icon}
                  alt={playedHero.name}
                  width={24}
                  height={24}
                  className="size-6"
                />
                {playedHero.name} {renderStars(playedHero.complexity)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HeroDetailPage() {
  const params = useParams();
  const router = useRouter();
  const heroId = params?.id as string;

  const hero: Hero | undefined = getHero(heroId);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!heroId) return;

    const load = async () => {
      // 1. Fetch all match IDs ordered ascending to calculate global match numbers
      const { data: allMatches } = await supabaseClient
        .from("matches")
        .select("id")
        .order("created_at", { ascending: true });

      const matchNumberMap = new Map<string, number>();
      allMatches?.forEach((m, index) => {
        matchNumberMap.set(m.id, index + 1);
      });

      // 2. Get all match_ids where this hero was played
      const { data: mpData, error: mpError } = await supabaseClient
        .from("match_players")
        .select("match_id")
        .eq("hero_id", heroId);

      if (mpError || !mpData || mpData.length === 0) {
        setLoading(false);
        return;
      }

      const matchIds = [...new Set(mpData.map((r) => r.match_id))];

      // 3. Fetch details for those hero matches
      const { data: mData, error: mError } = await supabaseClient
        .from("matches")
        .select(
          `
          id, winner, created_at, atlantis_avg_mmr, titans_avg_mmr,
          atlantis_mmr_change, titans_mmr_change,
          match_players (
            player_id, team, mmr_before, mmr_after, hero_id,
            players ( id, name, mmr, avatar_url )
          )
        `,
        )
        .in("id", matchIds)
        .order("created_at", { ascending: false });

      if (mError || !mData) {
        setLoading(false);
        return;
      }

      const rawMatches = mData as RawMatch[];
      const normalized: Match[] = rawMatches.map((m) => ({
        ...m,
        match_number: matchNumberMap.get(m.id),
        match_players: (m.match_players ?? [])
          .map((mp): MatchPlayer | null => {
            const p = Array.isArray(mp.players) ? mp.players[0] : mp.players;
            if (!p) return null;
            return { ...mp, players: { ...p } };
          })
          .filter((mp): mp is MatchPlayer => mp !== null),
      }));

      setMatches(normalized);
      setLoading(false);
    };

    load();
  }, [heroId]);

  const stats = useMemo(() => {
    let wins = 0,
      losses = 0;
    const playerMap = new Map<
      string,
      { player: Player; wins: number; losses: number }
    >();

    matches.forEach((m) => {
      const heroPlayers = m.match_players.filter((mp) => mp.hero_id === heroId);
      heroPlayers.forEach((mp) => {
        const won = didWin(mp.team, m.winner);
        if (won) wins++;
        else losses++;

        if (!playerMap.has(mp.player_id)) {
          playerMap.set(mp.player_id, {
            player: mp.players,
            wins: 0,
            losses: 0,
          });
        }
        const entry = playerMap.get(mp.player_id)!;
        if (won) entry.wins++;
        else entry.losses++;
      });
    });

    const played = wins + losses;
    const winRate = played === 0 ? 0 : Math.round((wins / played) * 100);
    const players = Array.from(playerMap.values()).sort(
      (a, b) => b.wins + b.losses - (a.wins + a.losses),
    );

    return { wins, losses, played, winRate, players };
  }, [matches, heroId]);

  if (!hero) {
    return (
      <div className="goa-root goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <Swords size={30} />
          </div>
          <p className="goa-loading-text wide">Hero not found</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="goa-root goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <BookUser size={30} />
          </div>
          <p className="goa-loading-text wide">Consulting the chronicles…</p>
        </div>
      </div>
    );
  }

  // .goa-stat-val's default color is already gold-light, so the 45-59
  // "mid" tier needs no modifier class.
  const wrClass =
    stats.played === 0
      ? "text-muted"
      : stats.winRate >= 60
        ? "gain"
        : stats.winRate >= 45
          ? ""
          : "loss";

  return (
    <main className="goa-root">
      {/* Hero header */}
      <header className="goa-header">
        <Image
          src={hero.icon}
          alt={hero.name}
          width={100}
          height={100}
          className="object-contain shrink-0 flex justify-self-center size-25"
        />
        <h1 className="goa-title">{hero.name}</h1>
        <p className="goa-subtitle">{renderStars(hero.complexity ?? 1)}</p>
      </header>

      {/* Stat tiles */}
      <div className="goa-stats-grid">
        {/* Win Rate */}
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Win Rate</div>
          <div className={`goa-stat-val ${wrClass}`}>
            {stats.played === 0 ? "—" : `${stats.winRate}%`}
          </div>
          {stats.played > 0 && (
            <div className="goa-win-bar-wrap">
              <div
                className="goa-win-bar"
                style={
                  { "--bar-width": `${stats.winRate}%` } as CSSProperties
                }
              />
            </div>
          )}
        </div>

        {/* Games played */}
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Games Played</div>
          <div className="goa-stat-val">{stats.played}</div>
          <div className="goa-stat-sub">total matches</div>
        </div>

        {/* Wins */}
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Victories</div>
          <div className="goa-stat-val gain">{stats.wins}</div>
        </div>

        {/* Losses */}
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Defeats</div>
          <div className="goa-stat-val loss">{stats.losses}</div>
        </div>
      </div>

      {/* Players who used this hero */}
      {stats.players.length > 0 && (
        <div className="goa-stats-card tight-top">
          <div className="goa-stats-head">
            <Swords size={14} /> Played by
          </div>
          <div className="goa-hero-players-list">
            {stats.players.map(({ player, wins, losses }) => {
              const pr =
                wins + losses === 0
                  ? 0
                  : Math.round((wins / (wins + losses)) * 100);
              return (
                <div
                  key={player.id}
                  className="goa-hero-player-row"
                  onClick={() => router.push(`/players/${player.id}`)}
                >
                  <PlayerAvatar
                    avatarUrl={player.avatar_url}
                    name={player.name}
                    size={28}
                  />
                  <span className="goa-hero-player-name">{player.name}</span>
                  <span
                    className={`goa-hero-player-pr ${pr >= 50 ? "goa-text-gain" : "goa-text-loss"}`}
                  >
                    {pr}%
                  </span>
                  <span className="goa-hero-player-wl">
                    <span className="goa-text-gain">{wins}W</span>/
                    <span className="goa-text-loss">{losses}L</span>
                  </span>
                  <span className="goa-hero-player-arrow">›</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match history for this hero */}
      <div className="goa-match-history-header">
        <ScrollText size={14} /> Match History
      </div>

      <div className="goa-matches">
        {matches.length === 0 && (
          <div className="goa-empty">
            <div className="goa-empty-icon">
              <Swords size={34} />
            </div>
            <p>No matches recorded</p>
          </div>
        )}

        {matches.map((match) => {
          const atlantis = match.match_players.filter(
            (p) => p.team === "atlantis",
          );
          const titans = match.match_players.filter((p) => p.team === "titans");

          // Who played the hero in this match
          const heroPlayers = match.match_players.filter(
            (mp) => mp.hero_id === heroId,
          );

          return (
            <div key={match.id} className="goa-match-card">
              <div className="goa-match-header">
                <span className="goa-match-date">
                  {match.match_number && (
                    <span className="goa-match-number wide bold">
                      #{match.match_number}
                    </span>
                  )}
                  {formatDate(match.created_at)}
                </span>
                <span className="goa-match-winner">
                  <span className={`goa-winner-badge ${match.winner}`}>
                    {match.winner === "none"
                      ? "DRAW"
                      : `${match.winner.toUpperCase()} VICTORY`}
                  </span>
                </span>
              </div>

              {/* Hero used by banner */}
              {heroPlayers.length > 0 && (
                <div className="goa-hero-used-by-banner">
                  <span className="goa-hero-used-by-label">
                    {hero.name} played by:
                  </span>
                  {heroPlayers.map((mp) => (
                    <span
                      key={mp.player_id}
                      className="goa-hero-used-by-player"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/players/${mp.player_id}`);
                      }}
                    >
                      <PlayerAvatar
                        avatarUrl={mp.players.avatar_url}
                        name={mp.players.name}
                        size={18}
                      />
                      <span
                        className={`goa-hero-used-by-name ${
                          match.winner === "none"
                            ? "draw"
                            : mp.team === match.winner
                              ? "win"
                              : "loss"
                        }`}
                      >
                        {mp.players.name}
                      </span>
                      <span className="goa-hero-used-by-result">
                        (
                        {match.winner == "none"
                          ? "Draw"
                          : mp.team === match.winner
                            ? "Won"
                            : "Lost"}
                        )
                      </span>
                    </span>
                  ))}
                </div>
              )}

              <div className="goa-teams">
                <TeamPanel
                  label="Atlantis"
                  labelClass="atl"
                  players={atlantis}
                  avgMmr={match.atlantis_avg_mmr}
                  mmrChange={match.atlantis_mmr_change}
                  highlightHeroId={heroId}
                  onSelectPlayer={(id) => router.push(`/players/${id}`)}
                />
                <TeamPanel
                  label="Titans"
                  labelClass="tit"
                  players={titans}
                  avgMmr={match.titans_avg_mmr}
                  mmrChange={match.titans_mmr_change}
                  highlightHeroId={heroId}
                  onSelectPlayer={(id) => router.push(`/players/${id}`)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="goa-spacer-lg" />
    </main>
  );
}
