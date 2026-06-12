// app/heroes/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { HEROES, Hero } from "@/lib/heroes";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type Player = {
  id: string;
  name: string;
  mmr: number;
  avatar_url?: string | null;
};

type MatchPlayer = {
  player_id: string;
  team: "atlantis" | "titans";
  mmr_before: number;
  mmr_after: number;
  hero_id?: string | null;
  players: Player;
};

type Match = {
  id: string;
  winner: "atlantis" | "titans";
  created_at: string;
  atlantis_avg_mmr: number;
  titans_avg_mmr: number;
  atlantis_mmr_change: number;
  titans_mmr_change: number;
  match_players: MatchPlayer[];
};

const formatDate = (s: string) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
};

const renderStars = (n: number | string) => "★".repeat(Number(n) || 0);

export default function HeroDetailPage() {
  const params = useParams();
  const router = useRouter();
  const heroId = params?.id as string;

  const hero: Hero | undefined = HEROES.find((h) => h.id === heroId);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!heroId) return;

    const load = async () => {
      // Get all match_ids where this hero was played
      const { data: mpData, error: mpError } = await supabaseClient
        .from("match_players")
        .select("match_id")
        .eq("hero_id", heroId);

      if (mpError || !mpData || mpData.length === 0) {
        setLoading(false);
        return;
      }

      const matchIds = [...new Set(mpData.map((r) => r.match_id))];

      // Fetch those matches with full details
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

      const normalized: Match[] = mData.map((m: any) => ({
        ...m,
        match_players: (m.match_players ?? [])
          .map((mp: any) => {
            const p = Array.isArray(mp.players) ? mp.players[0] : mp.players;
            if (!p) return null;
            return { ...mp, players: { ...p } };
          })
          .filter(Boolean),
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
        const won = mp.team === m.winner;
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
      <div
        className="goa-root"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚔</div>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "0.78rem",
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            Hero not found
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="goa-root"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🦸</div>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "0.78rem",
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            Consulting the chronicles…
          </p>
        </div>
      </div>
    );
  }

  const wrColor =
    stats.played === 0
      ? "var(--text-muted)"
      : stats.winRate >= 60
        ? "var(--gain)"
        : stats.winRate >= 45
          ? "var(--gold-light)"
          : "var(--loss)";

  return (
    <main className="goa-root">
      <button className="goa-back" onClick={() => router.back()}>
        <span className="goa-back-arrow">‹</span> Hero Compendium
      </button>

      {/* Hero header */}
      <header className="goa-header">
        <h1 className="goa-title">{hero.name}</h1>
        <p className="goa-subtitle">{renderStars(hero.complexity ?? 1)}</p>
      </header>

      {/* Stat tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.5rem",
          margin: "0.75rem",
        }}
      >
        {/* Win Rate */}
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Win Rate</div>
          <div className="goa-stat-val" style={{ color: wrColor }}>
            {stats.played === 0 ? "—" : `${stats.winRate}%`}
          </div>
          {stats.played > 0 && (
            <div className="goa-win-bar-wrap">
              <div
                className="goa-win-bar"
                style={{ width: `${stats.winRate}%` }}
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
          <div className="goa-stat-val" style={{ color: "var(--gain)" }}>
            {stats.wins}
          </div>
        </div>

        {/* Losses */}
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Defeats</div>
          <div className="goa-stat-val" style={{ color: "var(--loss)" }}>
            {stats.losses}
          </div>
        </div>
      </div>

      {/* Players who used this hero */}
      {stats.players.length > 0 && (
        <div className="goa-stats-card" style={{ margin: "0 0.75rem 0.75rem" }}>
          <div
            className="goa-stats-head"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <span>⚔</span> Played by
          </div>
          <div style={{ padding: "0.25rem 0" }}>
            {stats.players.map(({ player, wins, losses }) => {
              const pr =
                wins + losses === 0
                  ? 0
                  : Math.round((wins / (wins + losses)) * 100);
              return (
                <div
                  key={player.id}
                  onClick={() => router.push(`/players/${player.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.55rem",
                    padding: "0.45rem 0.85rem",
                    borderBottom: "1px solid rgba(201,151,58,0.07)",
                    cursor: "pointer",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background =
                      "rgba(42,39,32,0.6)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background =
                      "transparent")
                  }
                >
                  <PlayerAvatar
                    avatarUrl={player.avatar_url}
                    name={player.name}
                    size={28}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: "0.95rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {player.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: "0.65rem",
                      color: pr >= 50 ? "var(--gain)" : "var(--loss)",
                    }}
                  >
                    {pr}%
                  </span>
                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: "0.62rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span style={{ color: "var(--gain)" }}>{wins}W</span>/
                    <span style={{ color: "var(--loss)" }}>{losses}L</span>
                  </span>
                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: "0.55rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    ›
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match history for this hero */}
      <div
        style={{
          margin: "0 0.75rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "0.4rem",
          marginBottom: "0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontFamily: "'Cinzel', serif",
          fontSize: "0.7rem",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--gold)",
        }}
      >
        <span>📜</span> Match History
      </div>

      <div className="goa-matches">
        {matches.length === 0 && (
          <div className="goa-empty">
            <div className="goa-empty-icon">⚔</div>
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
                  {formatDate(match.created_at)}
                </span>
                <span className="goa-match-winner">
                  <span className={`goa-winner-badge ${match.winner}`}>
                    {match.winner} VICTORY
                  </span>
                </span>
              </div>

              {/* Hero used by banner */}
              {heroPlayers.length > 0 && (
                <div
                  style={{
                    padding: "0.3rem 0.75rem",
                    background: "rgba(201,151,58,0.07)",
                    borderBottom: "1px solid rgba(201,151,58,0.12)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: "0.58rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                    }}
                  >
                    {hero.name} played by:
                  </span>
                  {heroPlayers.map((mp) => (
                    <span
                      key={mp.player_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/players/${mp.player_id}`);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        cursor: "pointer",
                      }}
                    >
                      <PlayerAvatar
                        avatarUrl={mp.players.avatar_url}
                        name={mp.players.name}
                        size={18}
                      />
                      <span
                        style={{
                          fontFamily: "'Cinzel', serif",
                          fontSize: "0.65rem",
                          color:
                            mp.team === match.winner
                              ? "var(--gain)"
                              : "var(--loss)",
                          fontWeight: 600,
                        }}
                      >
                        {mp.players.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Cinzel', serif",
                          fontSize: "0.55rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        ({mp.team === match.winner ? "Won" : "Lost"})
                      </span>
                    </span>
                  ))}
                </div>
              )}

              <div className="goa-teams">
                {/* Atlantis */}
                <div className="goa-team">
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span className="goa-team-head atl">Atlantis</span>
                    <span
                      className={`goa-delta ${match.atlantis_mmr_change >= 0 ? "pos" : "neg"}`}
                    >
                      {match.atlantis_mmr_change >= 0 ? "▲" : "▼"}
                      {Math.abs(match.atlantis_mmr_change)}
                    </span>
                  </div>
                  <div className="goa-avg-mmr">
                    Avg {Math.round(match.atlantis_avg_mmr)} MMR
                  </div>
                  {atlantis.map((p) => (
                    <div
                      key={p.player_id}
                      className="goa-player-entry"
                      onClick={() => router.push(`/players/${p.player_id}`)}
                      style={{ cursor: "pointer" }}
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
                      {p.hero_id && (
                        <span
                          className="goa-display-hero"
                          style={{
                            color:
                              p.hero_id === heroId
                                ? "var(--gold-light)"
                                : "var(--text-muted)",
                            fontWeight: p.hero_id === heroId ? 700 : 400,
                          }}
                        >
                          {HEROES.find((h) => h.id === p.hero_id)?.name}
                          {p.hero_id === heroId && " ✦"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Titans */}
                <div className="goa-team">
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span className="goa-team-head tit">Titans</span>
                    <span
                      className={`goa-delta ${match.titans_mmr_change >= 0 ? "pos" : "neg"}`}
                    >
                      {match.titans_mmr_change >= 0 ? "▲" : "▼"}
                      {Math.abs(match.titans_mmr_change)}
                    </span>
                  </div>
                  <div className="goa-avg-mmr">
                    Avg {Math.round(match.titans_avg_mmr)} MMR
                  </div>
                  {titans.map((p) => (
                    <div
                      key={p.player_id}
                      className="goa-player-entry"
                      onClick={() => router.push(`/players/${p.player_id}`)}
                      style={{ cursor: "pointer" }}
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
                      {p.hero_id && (
                        <span
                          className="goa-display-hero"
                          style={{
                            color:
                              p.hero_id === heroId
                                ? "var(--gold-light)"
                                : "var(--text-muted)",
                            fontWeight: p.hero_id === heroId ? 700 : 400,
                          }}
                        >
                          {HEROES.find((h) => h.id === p.hero_id)?.name}
                          {p.hero_id === heroId && " ✦"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height: "2rem" }} />
    </main>
  );
}
