"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

type Player = {
  id: string;
  name: string;
  elo: number;
};

type Match = {
  id: string;
  winner: "atlantis" | "titans";
  played_at: string;
  atlantis_avg_mmr: number;
  titans_avg_mmr: number;
  atlantis_mmr_change: number;
  titans_mmr_change: number;
  match_players: {
    player_id: string;
    team: "atlantis" | "titans";
    players: Player;

    elo_before: number;
    elo_after: number;
  }[];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
};

// ---------------------------
// HELPERS
// ---------------------------
const avg = (arr: number[]) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const teamAvgElo = (team: Match["match_players"]) =>
  avg(team.map((p) => p.players.elo));

const teamChange = (team: Match["match_players"]) =>
  team.reduce((sum, p) => sum + (p.elo_after - p.elo_before), 0);

// ---------------------------
// PAGE
// ---------------------------
export default function MatchHistoryPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterPlayerId, setFilterPlayerId] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const { data: matchesData } = await supabaseClient
        .from("matches")
        .select(
          `
          id,
          winner,
          played_at,
          atlantis_avg_mmr,
          titans_avg_mmr,
          expected_atlantis_win,
          match_players (
            player_id,
            team,
            elo_before,
            elo_after,
            players (
              id,
              name,
              elo
            )
          )
        `,
        )
        .order("played_at", { ascending: false });

      const { data: playersData } = await supabaseClient
        .from("players")
        .select("id, name, elo");

      setMatches(matchesData ?? []);
      setPlayers(playersData ?? []);
      setLoading(false);
    };

    loadData();
  }, []);

  // ---------------------------
  // FILTER MATCHES
  // ---------------------------
  const filteredMatches = useMemo(() => {
    if (!filterPlayerId) return matches;

    return matches.filter((match) =>
      match.match_players.some((mp) => mp.player_id === filterPlayerId),
    );
  }, [matches, filterPlayerId]);

  // ---------------------------
  // PLAYER STATS
  // ---------------------------
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
      elo: player?.elo ?? 1000,
      name: player?.name ?? "Unknown",
    };
  }, [filteredMatches, filterPlayerId, players]);

  if (loading) {
    return (
      <main className="p-6">
        <p>Loading match history...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl w-80">
      <h1 className="mb-6 text-center text-3xl font-bold">Match History</h1>

      {/* FILTER */}
      <div className="mb-6">
        <select
          className="w-full rounded border p-2"
          value={filterPlayerId}
          onChange={(e) => setFilterPlayerId(e.target.value)}
        >
          <option value="">All players</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* STATS PANEL */}
      {playerStats && (
        <div className="mb-6 rounded border p-4">
          <h2 className="mb-2 text-lg font-semibold">
            {playerStats.name} Stats
          </h2>

          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="font-medium">Elo:</span> {playerStats.elo}
            </div>

            <div>Wins: {playerStats.wins}</div>
            <div>Losses: {playerStats.losses}</div>

            <div>
              Win Rate:{" "}
              <span className="font-bold">
                {playerStats.winRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MATCH LIST */}
      <div className="space-y-6">
        {filteredMatches.length === 0 && (
          <p className="text-center text-muted-foreground">No matches found</p>
        )}

        {filteredMatches.map((match) => {
          const atlantis = match.match_players.filter(
            (p) => p.team === "atlantis",
          );

          const titans = match.match_players.filter((p) => p.team === "titans");

          const atlantisAvg = match.atlantis_avg_mmr;
          const titansAvg = match.titans_avg_mmr;

          const atlantisChange = match.atlantis_mmr_change;
          const titansChange = match.titans_mmr_change;

          return (
            <div key={match.id} className="rounded border p-4 shadow-sm">
              {/* HEADER */}
              <div className="mb-3 flex justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatDate(match.played_at)}
                </span>

                <span className="font-semibold">
                  Winner:{" "}
                  <span
                    className={
                      match.winner === "atlantis"
                        ? "text-blue-600"
                        : "text-red-600"
                    }
                  >
                    {match.winner}
                  </span>
                </span>
              </div>

              {/* TEAMS */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* ATLANTIS */}
                <div className="rounded border p-3">
                  <h3 className="font-semibold text-blue-600 mb-2">Atlantis</h3>

                  <div className="text-xs text-muted-foreground mb-2">
                    Avg Elo: {atlantisAvg.toFixed(0)} <br />
                    <span
                      className={
                        atlantisChange >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {atlantisChange}
                    </span>
                  </div>

                  <ul className="text-sm space-y-1">
                    {atlantis.map((p) => (
                      <li key={p.player_id}>
                        <div className="flex justify-between">
                          <span>{p.players.name}</span>

                          <span className="text-xs text-muted-foreground">
                            {p.elo_before} → {p.elo_after} (
                            <span
                              className={
                                p.elo_after - p.elo_before >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {p.elo_after - p.elo_before}
                            </span>
                            )
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* TITANS */}
                <div className="rounded border p-3">
                  <h3 className="font-semibold text-red-600 mb-2">Titans</h3>

                  <div className="text-xs text-muted-foreground mb-2">
                    Avg Elo: {titansAvg.toFixed(0)} <br />
                    <span
                      className={
                        titansChange >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {titansChange}
                    </span>
                  </div>

                  <ul className="text-sm space-y-1">
                    {titans.map((p) => (
                      <li key={p.player_id}>
                        <div className="flex justify-between">
                          <span>{p.players.name}</span>

                          <span className="text-xs text-muted-foreground">
                            {p.elo_before} → {p.elo_after} (
                            <span
                              className={
                                p.elo_after - p.elo_before >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {p.elo_after - p.elo_before}
                            </span>
                            )
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
