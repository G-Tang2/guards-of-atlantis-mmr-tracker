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
  played_at: string;
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
        .select(`
          id,
          winner,
          played_at,
          atlantis_avg_mmr,
          titans_avg_mmr,
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
        `)
        .order("played_at", { ascending: false });

      const { data: playersData, error: playersError } = await supabaseClient
        .from("players")
        .select("id, name, mmr");

      if (matchesError || playersError) {
        console.error({ matchesError, playersError });
        setLoading(false);
        return;
      }

      const normalizedMatches: Match[] = (matchesData ?? []).map((match) => {
        const normalizedMatchPlayers: MatchPlayer[] = (match.match_players ?? [])
          .map((mp) => {
            const player = Array.isArray(mp.players) ? mp.players[0] : mp.players;

            if (!player) return null;

            return {
              player_id: mp.player_id,
              team: mp.team as Team,
              mmr_before: mp.mmr_before,
              mmr_after: mp.mmr_after,
              players: {
                id: player.id,
                name: player.name,
                mmr: player.mmr,
              },
            };
          })
          .filter((mp): mp is MatchPlayer => mp !== null);

        const atlantis_mmr_change = normalizedMatchPlayers
          .filter((p) => p.team === "atlantis")
          .reduce((sum, p) => sum + (p.mmr_after - p.mmr_before), 0);

        const titans_mmr_change = normalizedMatchPlayers
          .filter((p) => p.team === "titans")
          .reduce((sum, p) => sum + (p.mmr_after - p.mmr_before), 0);

        return {
          id: match.id,
          winner: match.winner as Team,
          played_at: match.played_at,
          atlantis_avg_mmr: match.atlantis_avg_mmr,
          titans_avg_mmr: match.titans_avg_mmr,
          atlantis_mmr_change,
          titans_mmr_change,
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
      <main className="p-6">
        <p>Loading match history...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-80 max-w-5xl">
      <h1 className="mb-6 text-center text-3xl font-bold">Match History</h1>

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

      {playerStats && (
        <div className="mb-6 rounded border p-4">
          <h2 className="mb-2 text-lg font-semibold">{playerStats.name} Stats</h2>

          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="font-medium">MMR:</span> {playerStats.mmr}
            </div>
            <div>Wins: {playerStats.wins}</div>
            <div>Losses: {playerStats.losses}</div>
            <div>
              Win Rate:{" "}
              <span className="font-bold">{playerStats.winRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {filteredMatches.length === 0 && (
          <p className="text-center text-muted-foreground">No matches found</p>
        )}

        {filteredMatches.map((match) => {
          const atlantis = match.match_players.filter((p) => p.team === "atlantis");
          const titans = match.match_players.filter((p) => p.team === "titans");

          return (
            <div key={match.id} className="rounded border p-4 shadow-sm">
              <div className="mb-3 flex justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatDate(match.played_at)}
                </span>

                <span className="font-semibold">
                  Winner:{" "}
                  <span
                    className={
                      match.winner === "atlantis" ? "text-blue-600" : "text-red-600"
                    }
                  >
                    {match.winner}
                  </span>
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded border p-3">
                  <h3 className="mb-2 font-semibold text-blue-600">Atlantis</h3>

                  <div className="mb-2 text-xs text-muted-foreground">
                    Avg MMR: {match.atlantis_avg_mmr.toFixed(0)} <br />
                  </div>

                  <ul className="space-y-1 text-sm">
                    {atlantis.map((p) => (
                      <li key={p.player_id}>
                        <div className="flex justify-between">
                          <span>{p.players.name}</span>

                          <span className="text-xs text-muted-foreground">
                            {p.mmr_before} → {p.mmr_after} (
                            <span
                              className={
                                p.mmr_after - p.mmr_before >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {p.mmr_after - p.mmr_before}
                            </span>
                            )
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded border p-3">
                  <h3 className="mb-2 font-semibold text-red-600">Titans</h3>

                  <div className="mb-2 text-xs text-muted-foreground">
                    Avg MMR: {match.titans_avg_mmr.toFixed(0)} <br />
                  </div>

                  <ul className="space-y-1 text-sm">
                    {titans.map((p) => (
                      <li key={p.player_id}>
                        <div className="flex justify-between">
                          <span>{p.players.name}</span>

                          <span className="text-xs text-muted-foreground">
                            {p.mmr_before} → {p.mmr_after} (
                            <span
                              className={
                                p.mmr_after - p.mmr_before >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {p.mmr_after - p.mmr_before}
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