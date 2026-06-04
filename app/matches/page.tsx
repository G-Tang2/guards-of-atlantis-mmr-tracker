"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

type Player = {
  id: string;
  name: string;
  mmr: number;
};

type Team = "atlantis" | "titans";

type MatchPlayer = {
  player_id: string;
  team: Team;
  players: Player;
  mmr_before: number;
  mmr_after: number;
};

type Match = {
  id: string;
  winner: Team;
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

export default function MatchHistoryPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlayerId, setFilterPlayerId] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const { data: matchesData, error: matchesError } = await supabaseClient
        .from("matches")
        .select(
          `
          id,
          winner,
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
            players (
              id,
              name,
              mmr
            )
          )
        `,
        )
        .order("created_at", { ascending: false });

      const { data: playersData, error: playersError } = await supabaseClient
        .from("players")
        .select("id, name, mmr");

      if (matchesError || playersError) {
        console.error({ matchesError, playersError });
        setLoading(false);
        return;
      }

      const normalizedMatches: Match[] = (matchesData ?? []).map((match) => {
        const normalizedMatchPlayers: MatchPlayer[] = (
          match.match_players ?? []
        )
          .map((mp) => {
            const player = Array.isArray(mp.players)
              ? mp.players[0]
              : mp.players;
            if (!player) return null;
            return {
              player_id: mp.player_id,
              team: mp.team as Team,
              mmr_before: mp.mmr_before,
              mmr_after: mp.mmr_after,
              players: { id: player.id, name: player.name, mmr: player.mmr },
            };
          })
          .filter((mp): mp is MatchPlayer => mp !== null);

        return {
          id: match.id,
          winner: match.winner as Team,
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
          <option value="">⚔ All combatants</option>
          {players.map((p) => (
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
            <span>✦</span>
            {playerStats.name} — Chronicle
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
                      <div key={p.player_id} className="goa-player-entry">
                        <span className="goa-player-name">
                          {p.players.name}
                        </span>
                        <span className="goa-mmr-change">
                          {p.mmr_before} → {p.mmr_after}
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
                      <div key={p.player_id} className="goa-player-entry">
                        <span className="goa-player-name">
                          {p.players.name}
                        </span>
                        <span className="goa-mmr-change">
                          {p.mmr_before} → {p.mmr_after}
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
