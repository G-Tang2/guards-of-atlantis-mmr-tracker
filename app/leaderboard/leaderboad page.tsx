"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap');

  .goa-root {
    --gold: #C9973A;
    --gold-light: #F0C96A;
    --gold-dark: #7A5A1A;
    --stone: #1C1A14;
    --stone-mid: #2A2720;
    --stone-lt: #3A3628;
    --border: rgba(201,151,58,0.3);
    --border-bright: rgba(201,151,58,0.7);
    --txt: #F0E6C8;
    --muted: #A09070;
    --gain: #5DBB8A;
    --loss: #C44A4A;
    font-family: 'Crimson Pro', Georgia, serif;
    background:
      radial-gradient(ellipse 120% 50% at 50% 0%, rgba(26,107,122,0.15) 0%, transparent 55%),
      radial-gradient(ellipse 80% 40% at 50% 100%, rgba(122,26,42,0.1) 0%, transparent 55%),
      repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(201,151,58,0.025) 40px),
      repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(201,151,58,0.025) 40px),
      #1C1A14;
    min-height: 100vh;
    color: var(--txt);
  }

  .goa-header {
    text-align: center;
    padding: 1.75rem 1rem 1rem;
  }
  .goa-header::after {
    content: '';
    display: block;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    margin: 1rem auto 0;
    width: 75%;
  }
  .goa-crown { font-size: 1.8rem; margin-bottom: 0.2rem; }
  .goa-title {
    font-family: 'Cinzel', serif;
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--gold-light);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-shadow: 0 0 20px rgba(201,151,58,0.45);
    margin: 0;
  }
  .goa-subtitle {
    font-family: 'Cinzel', serif;
    font-size: 0.65rem;
    color: var(--muted);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-top: 0.2rem;
  }

  .goa-podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem 1rem 0;
  }
  .goa-podium-slot {
    flex: 1;
    max-width: 115px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .goa-podium-slot:hover { opacity: 0.8; }
  .goa-podium-slot.first { order: 2; }
  .goa-podium-slot.second { order: 1; }
  .goa-podium-slot.third { order: 3; }
  .goa-podium-name {
    font-family: 'Cinzel', serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-align: center;
    color: var(--txt);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .goa-podium-mmr {
    font-family: 'Cinzel', serif;
    font-size: 0.58rem;
    color: var(--muted);
    letter-spacing: 0.05em;
  }
  .goa-podium-plinth {
    width: 100%;
    border-radius: 3px 3px 0 0;
    border: 1px solid var(--border);
    border-bottom: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 0.5rem;
    position: relative;
    overflow: hidden;
  }
  .goa-podium-plinth::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-bright), transparent);
  }
  .goa-podium-plinth.first  { height: 80px; background: linear-gradient(180deg, rgba(201,151,58,0.18), rgba(28,26,20,0.9)); border-color: rgba(201,151,58,0.6); }
  .goa-podium-plinth.second { height: 56px; background: linear-gradient(180deg, rgba(160,160,160,0.12), rgba(28,26,20,0.9)); border-color: rgba(160,160,160,0.4); }
  .goa-podium-plinth.third  { height: 40px; background: linear-gradient(180deg, rgba(180,100,40,0.12), rgba(28,26,20,0.9)); border-color: rgba(180,100,40,0.35); }
  .goa-podium-medal { font-size: 1.4rem; }
  .goa-podium-rank {
    font-family: 'Cinzel', serif;
    font-size: 0.6rem;
    margin-top: 0.15rem;
  }
  .goa-podium-plinth.first  .goa-podium-rank { color: var(--gold-light); }
  .goa-podium-plinth.second .goa-podium-rank { color: #C0C0C0; }
  .goa-podium-plinth.third  .goa-podium-rank { color: #CD7F32; }

  .goa-sort-bar {
    margin: 0.85rem 0.75rem 0;
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .goa-sort-btn {
    background: rgba(42,39,32,0.7);
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--muted);
    font-family: 'Cinzel', serif;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.3rem 0.55rem;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .goa-sort-btn:hover { border-color: var(--border-bright); color: var(--txt); }
  .goa-sort-btn.active { background: rgba(201,151,58,0.15); border-color: var(--border-bright); color: var(--gold-light); }

  .goa-table-wrap {
    margin: 0.6rem 0.75rem 2rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  }
  .goa-table-wrap::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-bright), transparent);
  }
  .goa-row {
    display: grid;
    grid-template-columns: 38px 1fr 58px 50px 50px 42px;
    align-items: center;
    padding: 0.5rem 0.65rem;
    border-bottom: 1px solid rgba(201,151,58,0.1);
    background: rgba(28,26,20,0.85);
    transition: background 0.15s;
    gap: 0.2rem;
    cursor: pointer;
  }
  .goa-row:last-child { border-bottom: none; }
  .goa-row:hover { background: rgba(58,54,40,0.9); }
  .goa-row.rank-1 { background: rgba(201,151,58,0.08); }
  .goa-row.rank-2 { background: rgba(160,160,160,0.05); }
  .goa-row.rank-3 { background: rgba(180,100,40,0.06); }
  .goa-row.rank-1:hover { background: rgba(201,151,58,0.14); }
  .goa-row.rank-2:hover { background: rgba(160,160,160,0.1); }
  .goa-row.rank-3:hover { background: rgba(180,100,40,0.1); }

  .goa-cell-rank {
    font-family: 'Cinzel', serif;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--muted);
    text-align: center;
  }
  .goa-cell-rank.r1 { color: var(--gold-light); }
  .goa-cell-rank.r2 { color: #C0C0C0; }
  .goa-cell-rank.r3 { color: #CD7F32; }

  .goa-cell-name {
    font-size: 0.9rem;
    color: var(--txt);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    transition: color 0.15s;
  }
  .goa-row:hover .goa-cell-name { color: var(--gold-light); }
  .goa-name-arrow {
    font-size: 0.6rem;
    color: var(--muted);
    opacity: 0;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  .goa-row:hover .goa-name-arrow { opacity: 1; }

  .goa-cell-mmr {
    font-family: 'Cinzel', serif;
    font-size: 0.72rem;
    color: var(--gold-light);
    text-align: right;
    font-weight: 600;
  }
  .goa-cell-wr {
    font-family: 'Cinzel', serif;
    font-size: 0.65rem;
    text-align: right;
  }
  .goa-cell-wl {
    font-family: 'Cinzel', serif;
    font-size: 0.62rem;
    text-align: right;
  }
  .goa-cell-m {
    font-family: 'Cinzel', serif;
    font-size: 0.65rem;
    color: var(--muted);
    text-align: right;
  }
  .goa-wins { color: var(--gain); }
  .goa-losses { color: var(--loss); }

  .goa-header-row {
    display: grid;
    grid-template-columns: 38px 1fr 58px 50px 50px 42px;
    padding: 0.45rem 0.65rem;
    border-bottom: 1px solid var(--border);
    background: rgba(42,39,32,0.6);
    gap: 0.2rem;
  }
  .goa-col-head {
    font-family: 'Cinzel', serif;
    font-size: 0.55rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.2rem;
    transition: color 0.15s;
    user-select: none;
  }
  .goa-col-head:hover { color: var(--gold-light); }
  .goa-col-head.active { color: var(--gold); }
  .goa-col-head.right { justify-content: flex-end; }

  .goa-tap-hint {
    text-align: center;
    font-family: 'Cinzel', serif;
    font-size: 0.55rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(160,144,112,0.45);
    padding: 0 0.75rem 0.4rem;
  }
`;

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
        .select("id, name, mmr");
      const { data: matchesData } = await supabaseClient.from("matches").select(`
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
      let wins = 0, losses = 0, matchesPlayed = 0;
      matches.forEach((match) => {
        const entry = match.match_players.find((mp) => mp.player_id === player.id);
        if (!entry) return;
        matchesPlayed++;
        if (entry.team === match.winner) wins++; else losses++;
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

  const rankedByMmr = useMemo(() => [...leaderboard].sort((a, b) => b.mmr - a.mmr), [leaderboard]);

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    rankedByMmr.forEach((p, i) => map.set(p.id, i + 1));
    return map;
  }, [rankedByMmr]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = useMemo(() => {
    const list = [...leaderboard];
    list.sort((a, b) => {
      if (sortKey === "name") return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      let valA = 0, valB = 0;
      switch (sortKey) {
        case "mmr":      valA = a.mmr;                   valB = b.mmr;                   break;
        case "winRate":  valA = a.winRate;                valB = b.winRate;                break;
        case "wl":       valA = a.wins - a.losses;        valB = b.wins - b.losses;        break;
        case "matches":  valA = a.matches;                valB = b.matches;                break;
        case "rank":     valA = rankMap.get(a.id) ?? 0;   valB = rankMap.get(b.id) ?? 0;   break;
      }
      return sortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [leaderboard, sortKey, sortAsc, rankMap]);

  const top3 = rankedByMmr.slice(0, 3);
  const plinthClass = ["first", "second", "third"];
  const medalEmoji = ["🥇", "🥈", "🥉"];
  const sortCols: { key: SortKey; label: string }[] = [
    { key: "rank",    label: "Rank"    },
    { key: "mmr",     label: "MMR"     },
    { key: "winRate", label: "Win %"   },
    { key: "wl",      label: "W/L"     },
    { key: "matches", label: "Battles" },
    { key: "name",    label: "Name"    },
  ];

  const goToProfile = (id: string) => router.push(`/players/${id}`);

  if (loading) {
    return (
      <div className="goa-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <style>{styles}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏆</div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: "0.75rem", letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase" }}>
            Tallying the honours…
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="goa-root">
      <style>{styles}</style>

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
              <div key={p.id} className={`goa-podium-slot ${cls}`} onClick={() => goToProfile(p.id)}>
                <span className="goa-podium-name">{p.name}</span>
                <span className="goa-podium-mmr">{p.mmr} MMR</span>
                <div className={`goa-podium-plinth ${cls}`}>
                  <span className="goa-podium-medal">{medalEmoji[idx]}</span>
                  <span className="goa-podium-rank">#{idx + 1}</span>
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
            {sortKey === key && <span style={{ fontSize: "0.55rem" }}>{sortAsc ? "▲" : "▼"}</span>}
          </button>
        ))}
      </div>

      <p className="goa-tap-hint">Tap a guardian to view their profile</p>

      {/* Table */}
      <div className="goa-table-wrap">
        <div className="goa-header-row">
          <span className={`goa-col-head ${sortKey === "rank" ? "active" : ""}`} onClick={() => handleSort("rank")}>#</span>
          <span className={`goa-col-head ${sortKey === "name" ? "active" : ""}`} onClick={() => handleSort("name")}>Guardian</span>
          <span className={`goa-col-head right ${sortKey === "mmr" ? "active" : ""}`} onClick={() => handleSort("mmr")}>MMR</span>
          <span className={`goa-col-head right ${sortKey === "winRate" ? "active" : ""}`} onClick={() => handleSort("winRate")}>Win%</span>
          <span className={`goa-col-head right ${sortKey === "wl" ? "active" : ""}`} onClick={() => handleSort("wl")}>W/L</span>
          <span className={`goa-col-head right ${sortKey === "matches" ? "active" : ""}`} onClick={() => handleSort("matches")}>Bat.</span>
        </div>

        {sorted.map((p) => {
          const rank = rankMap.get(p.id) ?? 0;
          const rankCls = rank === 1 ? "r1" : rank === 2 ? "r2" : rank === 3 ? "r3" : "";
          const rowCls = rank <= 3 ? `rank-${rank}` : "";

          return (
            <div key={p.id} className={`goa-row ${rowCls}`} onClick={() => goToProfile(p.id)}>
              <span className={`goa-cell-rank ${rankCls}`}>
                {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
              </span>
              <span className="goa-cell-name">
                {p.name}
                <span className="goa-name-arrow">›</span>
              </span>
              <span className="goa-cell-mmr">{p.mmr}</span>
              <span className="goa-cell-wr" style={{ color: p.winRate >= 50 ? "var(--gain)" : "var(--loss)" }}>
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
