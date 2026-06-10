"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type Player = {
  id: string;
  name: string;
  mmr: number;
  avatar_url?: string | null;
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
  avatar_url?: string | null;
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
};

type SortKey = "rank" | "name" | "mmr" | "winRate" | "wl" | "matches";

export default function LeaderboardPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("mmr");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: playersData } = await supabaseClient
        .from("players")
        .select("id, name, mmr, avatar_url");
      const { data: matchesData } = await supabaseClient.from("matches")
        .select(`
        id,
        winner,
        match_players (
          player_id,
          team
        )
      `);
      setPlayers(playersData ?? []);
      setMatches(matchesData ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const leaderboard: PlayerStats[] = useMemo(() => {
    return players.map((player) => {
      let wins = 0,
        losses = 0,
        matchesPlayed = 0;
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
        avatar_url: player.avatar_url ?? null,
        wins,
        losses,
        matches: matchesPlayed,
        winRate: matchesPlayed === 0 ? 0 : (wins / matchesPlayed) * 100,
      };
    });
  }, [players, matches]);

  const rankedByMmr = useMemo(
    () => [...leaderboard].sort((a, b) => b.mmr - a.mmr),
    [leaderboard],
  );

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    rankedByMmr.forEach((p, i) => map.set(p.id, i + 1));
    return map;
  }, [rankedByMmr]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = useMemo(() => {
    const list = [...leaderboard];
    list.sort((a, b) => {
      if (sortKey === "name")
        return sortAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      let valA = 0,
        valB = 0;
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

  const top3 = rankedByMmr.slice(0, 3);
  const plinthClass = ["first", "second", "third"];
  const medalEmoji = ["🥇", "🥈", "🥉"];
  const sortCols: { key: SortKey; label: string }[] = [
    { key: "rank", label: "Rank" },
    { key: "mmr", label: "MMR" },
    { key: "winRate", label: "Win %" },
    { key: "wl", label: "W/L" },
    { key: "matches", label: "Battles" },
    { key: "name", label: "Name" },
  ];

  const goToProfile = (id: string) => router.push(`/players/${id}`);

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
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏆</div>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            Tallying the honours…
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
        <div className="goa-crown">🏆</div>
        <h1 className="goa-title">Hall of Honour</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Podium — top 3 */}
      {top3.length >= 1 && (
        <div className="goa-podium">
          {[1, 0, 2].map((idx) => {
            const p = top3[idx];
            if (!p) return <div key={idx} className="goa-podium-slot" />;
            const cls = plinthClass[idx];
            return (
              <div
                key={p.id}
                className={`goa-podium-slot ${cls}`}
                onClick={() => goToProfile(p.id)}
              >
                <PlayerAvatar
                  avatarUrl={p.avatar_url}
                  name={p.name}
                  size={64}
                  borderColor={
                    idx === 0
                      ? "rgba(201,151,58,0.8)"
                      : idx === 1
                        ? "rgba(192,192,192,0.7)"
                        : "rgba(180,100,40,0.7)"
                  }
                />
                <span className="goa-podium-name">{p.name}</span>
                <span className="goa-podium-mmr">{p.mmr} MMR</span>
                <div className={`goa-podium-plinth ${cls}`}>
                  <span className="goa-podium-medal">{medalEmoji[idx]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sort pills */}
      <div className="goa-sort-bar">
        {sortCols.map(({ key, label }) => (
          <button
            key={key}
            className={`goa-sort-btn ${sortKey === key ? "active" : ""}`}
            onClick={() => handleSort(key)}
          >
            {label}
            {sortKey === key && (
              <span style={{ fontSize: "0.55rem" }}>{sortAsc ? "▲" : "▼"}</span>
            )}
          </button>
        ))}
      </div>

      <p className="goa-tap-hint">Tap a player to view their profile</p>

      {/* Table */}
      <div className="goa-table-wrap">
        <div className="goa-header-row">
          <span
            className={`goa-col-head center ${sortKey === "rank" ? "active" : ""}`}
            onClick={() => handleSort("rank")}
          >
            #
          </span>
          <span
            className={`goa-col-head ${sortKey === "name" ? "active" : ""}`}
            onClick={() => handleSort("name")}
          >
            Name
          </span>
          <span
            className={`goa-col-head right ${sortKey === "mmr" ? "active" : ""}`}
            onClick={() => handleSort("mmr")}
          >
            MMR
          </span>
          <span
            className={`goa-col-head right ${sortKey === "winRate" ? "active" : ""}`}
            onClick={() => handleSort("winRate")}
          >
            Win%
          </span>
          <span
            className={`goa-col-head right ${sortKey === "wl" ? "active" : ""}`}
            onClick={() => handleSort("wl")}
          >
            W/L
          </span>
          <span
            className={`goa-col-head right ${sortKey === "matches" ? "active" : ""}`}
            onClick={() => handleSort("matches")}
          >
            Bat.
          </span>
        </div>

        {sorted.map((p) => {
          const rank = rankMap.get(p.id) ?? 0;
          const rankCls =
            rank === 1 ? "r1" : rank === 2 ? "r2" : rank === 3 ? "r3" : "";
          const rowCls = rank <= 3 ? `rank-${rank}` : "";

          return (
            <div
              key={p.id}
              className={`goa-row ${rowCls}`}
              onClick={() => goToProfile(p.id)}
            >
              <span className={`goa-cell-rank ${rankCls}`}>
                {rank === 1
                  ? "🥇"
                  : rank === 2
                    ? "🥈"
                    : rank === 3
                      ? "🥉"
                      : `#${rank}`}
              </span>
              <span className="goa-cell-name">
                <PlayerAvatar
                  avatarUrl={p.avatar_url}
                  name={p.name}
                  size={26}
                />
                {p.name}
                <span className="goa-name-arrow">›</span>
              </span>
              <span className="goa-cell-mmr">{p.mmr}</span>
              <span
                className="goa-cell-wr"
                style={{
                  color: p.winRate >= 50 ? "var(--gain)" : "var(--loss)",
                }}
              >
                {p.winRate.toFixed(1)}%
              </span>
              <span className="goa-cell-wl">
                <span className="goa-wins">{p.wins}</span>
                <span style={{ color: "var(--muted)" }}>/</span>
                <span className="goa-losses">{p.losses}</span>
              </span>
              <span className="goa-cell-m">{p.matches}</span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
