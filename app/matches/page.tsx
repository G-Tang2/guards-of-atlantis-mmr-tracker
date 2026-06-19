"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { HEROES } from "@/lib/heroes";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useRouter } from "next/navigation";

type Player = {
  id: string;
  name: string;
  mmr: number;
  avatar_url?: string | null;
};

enum WinCondition {
  LAST_PUSH = "LAST_PUSH",
  THRONE = "THRONE",
  LIFE_COUNTER = "LIFE_COUNTER",
}

const winConditionLabel: Record<string, string> = {
  LAST_PUSH: "LAST PUSH",
  THRONE: "THRONE",
  LIFE_COUNTER: "LIFE COUNTER",
};

type Team = "atlantis" | "titans";

type MatchPlayer = {
  player_id: string;
  team: Team;
  players: Player;
  mmr_before: number;
  mmr_after: number;
  hero_id?: string;
};

type Match = {
  id: string;
  winner: Team;
  win_condition: WinCondition | null;
  created_at: string;
  atlantis_avg_mmr: number;
  titans_avg_mmr: number;
  atlantis_mmr_change: number;
  titans_mmr_change: number;
  match_players: MatchPlayer[];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const sortByName = (a: Player, b: Player) =>
  a.name.localeCompare(b.name);

export default function MatchHistoryPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlayerId, setFilterPlayerId] = useState("");

  const renderStars = (n: number) => "★".repeat(n);

  const formatWinCondition = (wc?: WinCondition | null) => {
    if (!wc) return "";
    return `BY ${winConditionLabel[wc]}`;
  };

  useEffect(() => {
    const loadData = async () => {
      const { data: matchesData, error: matchesError } = await supabaseClient
        .from("matches")
        .select(
          `
          id,
          winner,
          win_condition,
          created_at,
          atlantis_avg_mmr,
          titans_avg_mmr,
          atlantis_mmr_change,
          titans_mmr_change,
          match_players (
            player_id,
            team,
            mmr_before,
            mmr_after,
            hero_id,
            players (
              id,
              name,
              mmr,
              avatar_url
            )
          )
        `,
        )
        .order("created_at", { ascending: false });

      const { data: playersData, error: playersError } = await supabaseClient
        .from("players")
        .select("id, name, mmr, avatar_url");

      if (matchesError || playersError) {
        console.error({ matchesError, playersError });
        setLoading(false);
        return;
      }

      const normalizedMatches: Match[] = (matchesData ?? []).map((match) => {
        const normalizedMatchPlayers: MatchPlayer[] = (
          match.match_players ?? []
        )
          .map((mp): MatchPlayer | null => {
            const player = Array.isArray(mp.players)
              ? mp.players[0]
              : mp.players;
            if (!player) return null;
            return {
              player_id: mp.player_id,
              team: mp.team as Team,
              mmr_before: mp.mmr_before,
              mmr_after: mp.mmr_after,
              hero_id: mp.hero_id,
              players: {
                id: player.id,
                name: player.name,
                mmr: player.mmr,
                avatar_url: player.avatar_url,
              },
            };
          })
          .filter((mp): mp is MatchPlayer => mp !== null);

        return {
          id: match.id,
          winner: match.winner as Team,
          win_condition: match.win_condition as WinCondition,
          created_at: match.created_at,
          atlantis_avg_mmr: match.atlantis_avg_mmr,
          titans_avg_mmr: match.titans_avg_mmr,
          atlantis_mmr_change: match.atlantis_mmr_change,
          titans_mmr_change: match.titans_mmr_change,
          match_players: normalizedMatchPlayers,
        };
      });
      setMatches(normalizedMatches);
      setPlayers(playersData ?? []);
      setLoading(false);
    };

    loadData();
  }, []);

  const router = useRouter();
  const goToProfile = (id: string) => router.push(`/players/${id}`);

  const filteredMatches = useMemo(() => {
    if (!filterPlayerId) return matches;
    return matches.filter((match) =>
      match.match_players.some((mp) => mp.player_id === filterPlayerId),
    );
  }, [matches, filterPlayerId]);

  const playerStats = useMemo(() => {
    if (!filterPlayerId) return null;
    let wins = 0;
    let losses = 0;
    filteredMatches.forEach((match) => {
      const playerTeam = match.match_players.find(
        (mp) => mp.player_id === filterPlayerId,
      )?.team;
      if (!playerTeam) return;
      if (playerTeam === match.winner) wins++;
      else losses++;
    });
    const total = wins + losses;
    const winRate = total === 0 ? 0 : (wins / total) * 100;
    const player = players.find((p) => p.id === filterPlayerId);
    return {
      wins,
      losses,
      winRate,
      mmr: player?.mmr ?? 1000,
      name: player?.name ?? "Unknown",
    };
  }, [filteredMatches, filterPlayerId, players]);

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
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📜</div>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            Consulting the archives…
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="goa-root">
      <button className="goa-back" onClick={() => router.back()}>
        <span className="goa-back-arrow">‹</span> Home
      </button>
      <header className="goa-header">
        <div className="goa-crown">📜</div>
        <h1 className="goa-title">Battle Archives</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Filter */}
      <div className="goa-filter-wrap">
        <select
          className="goa-select"
          value={filterPlayerId}
          onChange={(e) => setFilterPlayerId(e.target.value)}
        >
          <option value="">⚔ All Players</option>
          {[...players].sort(sortByName).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Player stats */}
      {playerStats && (
        <div className="goa-stats-card">
          <div className="goa-stats-head">
            <PlayerAvatar
              avatarUrl={
                players.find((p) => p.id === filterPlayerId)?.avatar_url
              }
              name={playerStats.name}
              size={32}
            />
            {playerStats.name}
          </div>
          <div className="goa-stats-grid">
            <div className="goa-stat">
              <div className="goa-stat-label">Rating</div>
              <div className="goa-stat-value">{playerStats.mmr}</div>
              <div className="goa-stat-sub">current MMR</div>
            </div>
            <div className="goa-stat">
              <div className="goa-stat-label">Win Rate</div>
              <div className="goa-stat-value">
                {playerStats.winRate.toFixed(1)}%
              </div>
              <div className="goa-stat-sub">
                {playerStats.wins + playerStats.losses} battles
              </div>
            </div>
            <div className="goa-stat">
              <div className="goa-stat-label">Victories</div>
              <div className="goa-stat-value" style={{ color: "var(--gain)" }}>
                {playerStats.wins}
              </div>
            </div>
            <div className="goa-stat">
              <div className="goa-stat-label">Defeats</div>
              <div className="goa-stat-value" style={{ color: "var(--loss)" }}>
                {playerStats.losses}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match list */}
      <div className="goa-matches">
        {filteredMatches.length === 0 && (
          <div className="goa-empty">
            <div className="goa-empty-icon">⚔</div>
            <p>No battles recorded</p>
          </div>
        )}

        {filteredMatches.map((match) => {
          const atlantis = match.match_players.filter(
            (p) => p.team === "atlantis",
          );
          const titans = match.match_players.filter((p) => p.team === "titans");

          let matchBorderClass = "";
          if (filterPlayerId) {
            const playerEntry = match.match_players.find(
              (mp) => mp.player_id === filterPlayerId,
            );
            if (playerEntry) {
              matchBorderClass =
                playerEntry.team === match.winner ? "match-win" : "match-loss";
            }
          }

          return (
            <div
              key={match.id}
              className={`goa-match-card ${matchBorderClass}`}
            >
              <div className="goa-match-header">
                <span className="goa-match-date">
                  {formatDate(match.created_at)}
                </span>
                <span className="goa-match-winner">
                  <span className={`goa-winner-badge ${match.winner}`}>
                    {match.winner} VICTORY{" "}
                    {formatWinCondition(match.win_condition)}
                  </span>
                </span>
              </div>

              <div className="goa-teams">
                {/* Atlantis */}
                <div className="goa-team">
                  <div className="flex justify-between">
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
                  {atlantis.map((p) => {
                    return (
                      <div
                        key={p.player_id}
                        className="goa-player-entry"
                        onClick={() => goToProfile(p.player_id)}
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
                          </span>
                        </div>
                        <span className="goa-display-hero">
                          {HEROES.find((h) => h.id === p.hero_id)?.name}{" "}
                          {renderStars(
                            parseInt(
                              HEROES.find((h) => h.id === p.hero_id)
                                ?.complexity || "",
                            ),
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Titans */}
                <div className="goa-team">
                  <div className="flex justify-between">
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
                  {titans.map((p) => {
                    return (
                      <div
                        key={p.player_id}
                        className="goa-player-entry"
                        onClick={() => goToProfile(p.player_id)}
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
                          </span>
                        </div>
                        <span className="goa-display-hero">
                          {HEROES.find((h) => h.id === p.hero_id)?.name}{" "}
                          {renderStars(
                            parseInt(
                              HEROES.find((h) => h.id === p.hero_id)
                                ?.complexity || "",
                            ),
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
