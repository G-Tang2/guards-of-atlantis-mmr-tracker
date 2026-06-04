"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

type Player = {
  id: string;
  name: string;
  mmr: number;
};

type Match = {
  id: string;
  winner: "atlantis" | "titans";
  match_players: {
    player_id: string;
    team: "atlantis" | "titans";
  }[];
};

type PlayerStats = {
  id: string;
  name: string;
  mmr: number;
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
};

type SortKey = "rank" | "name" | "mmr" | "winRate" | "wl" | "matches";

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>("mmr");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: playersData } = await supabaseClient
        .from("players")
        .select("id, name, mmr");

      const { data: matchesData } = await supabaseClient.from("matches").select(
        `
          id,
          winner,
          match_players (
            player_id,
            team
          )
        `,
      );

      setPlayers(playersData ?? []);
      setMatches(matchesData ?? []);
      setLoading(false);
    };

    load();
  }, []);

  // ---------------------------
  // PLAYER STATS
  // ---------------------------
  const leaderboard: PlayerStats[] = useMemo(() => {
    return players.map((player) => {
      let wins = 0;
      let losses = 0;
      let matchesPlayed = 0;

      matches.forEach((match) => {
        const entry = match.match_players.find(
          (mp) => mp.player_id === player.id,
        );

        if (!entry) return;

        matchesPlayed++;

        if (entry.team === match.winner) wins++;
        else losses++;
      });

      return {
        id: player.id,
        name: player.name,
        mmr: player.mmr,
        wins,
        losses,
        matches: matchesPlayed,
        winRate: matchesPlayed === 0 ? 0 : (wins / matchesPlayed) * 100,
      };
    });
  }, [players, matches]);

  // ---------------------------
  // STABLE RANK (BASED ON mmr ONLY)
  // ---------------------------
  const rankedBymmr = useMemo(() => {
    return [...leaderboard].sort((a, b) => b.mmr - a.mmr);
  }, [leaderboard]);

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();

    rankedBymmr.forEach((p, index) => {
      map.set(p.id, index + 1);
    });

    return map;
  }, [rankedBymmr]);

  // ---------------------------
  // SORTING
  // ---------------------------
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = useMemo(() => {
    const list = [...leaderboard];

    list.sort((a, b) => {
      if (sortKey === "name") {
        return sortAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      let valA = 0;
      let valB = 0;

      switch (sortKey) {
        case "mmr":
          valA = a.mmr;
          valB = b.mmr;
          break;

        case "winRate":
          valA = a.winRate;
          valB = b.winRate;
          break;

        case "wl":
          valA = a.wins - a.losses;
          valB = b.wins - b.losses;
          break;

        case "matches":
          valA = a.matches;
          valB = b.matches;
          break;

        case "rank":
          valA = rankMap.get(a.id) ?? 0;
          valB = rankMap.get(b.id) ?? 0;
          break;
      }

      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [leaderboard, sortKey, sortAsc, rankMap]);

  // ---------------------------
  // UI
  // ---------------------------
  if (loading) {
    return (
      <main className="p-6">
        <p>Loading leaderboard...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-center text-3xl font-bold">MMR Leaderboard</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              {/* Rank (STABLE) */}
              <th
                className="p-2 text-left cursor-pointer"
                onClick={() => handleSort("rank")}
              >
                Rank {sortKey === "rank" ? (sortAsc ? "▲" : "▼") : ""}
              </th>

              <th
                className="p-2 text-left cursor-pointer"
                onClick={() => handleSort("name")}
              >
                Player {sortKey === "name" ? (sortAsc ? "▲" : "▼") : ""}
              </th>

              <th
                className="p-2 text-left cursor-pointer"
                onClick={() => handleSort("mmr")}
              >
                MMR {sortKey === "mmr" ? (sortAsc ? "▲" : "▼") : ""}
              </th>

              <th
                className="p-2 text-left cursor-pointer"
                onClick={() => handleSort("winRate")}
              >
                Win % {sortKey === "winRate" ? (sortAsc ? "▲" : "▼") : ""}
              </th>

              <th
                className="p-2 text-left cursor-pointer"
                onClick={() => handleSort("wl")}
              >
                W / L {sortKey === "wl" ? (sortAsc ? "▲" : "▼") : ""}
              </th>

              <th
                className="p-2 text-left cursor-pointer"
                onClick={() => handleSort("matches")}
              >
                Matches {sortKey === "matches" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((p) => {
              const rank = rankMap.get(p.id) ?? 0;

              return (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-semibold">
                    {rank === 1 && (
                      <span className="relative inline-flex items-center font-bold text-yellow-400">
                        <span className="absolute inset-0 rounded bg-yellow-300 opacity-20 blur-lg animate-pulse" />
                        <span className="relative drop-shadow-md">🥇 #1</span>
                      </span>
                    )}

                    {rank === 2 && (
                      <span className="relative inline-flex items-center font-bold text-gray-400">
                        <span className="absolute inset-0 rounded bg-gray-300 opacity-20 blur-lg animate-pulse" />
                        <span className="relative drop-shadow-md">🥈 #2</span>
                      </span>
                    )}

                    {rank === 3 && (
                      <span className="relative inline-flex items-center font-bold text-orange-400">
                        <span className="absolute inset-0 rounded bg-orange-300 opacity-20 blur-lg animate-pulse" />
                        <span className="relative drop-shadow-md">🥉 #3</span>
                      </span>
                    )}

                    {rank > 3 && `#${rank}`}
                  </td>

                  <td className="p-2 font-medium">{p.name}</td>

                  <td className="p-2">{p.mmr}</td>

                  <td className="p-2">{p.winRate.toFixed(1)}%</td>

                  <td className="p-2">
                    {p.wins} / {p.losses}
                  </td>

                  <td className="p-2">{p.matches}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
