"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

type Player = {
  id: string;
  name: string;
  mmr: number;
};

type SplitResult = {
  atlantis: Player[];
  titans: Player[];
  atlantisAvg: number;
  titansAvg: number;
  diff: number;
} | null;

const avg = (players: Player[]) =>
  players.length === 0 ? 0 : Math.round(players.reduce((s, p) => s + p.mmr, 0) / players.length);

const randomSplit = (pool: Player[]): SplitResult => {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const mid = Math.ceil(shuffled.length / 2);
  const atlantis = shuffled.slice(0, mid);
  const titans = shuffled.slice(mid);
  const atlantisAvg = avg(atlantis);
  const titansAvg = avg(titans);
  return { atlantis, titans, atlantisAvg, titansAvg, diff: Math.abs(atlantisAvg - titansAvg) };
};

const balancedSplit = (pool: Player[]): SplitResult => {
  const n = pool.length;
  const totalMMR = pool.reduce((s, p) => s + p.mmr, 0);

  let bestDiff = Infinity;
  let bestMask = 0;

  // iterate all subsets (0 to 2^n - 1)
  for (let mask = 0; mask < (1 << n); mask++) {
    const teamA: Player[] = [];
    let teamASum = 0;

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        teamA.push(pool[i]);
        teamASum += pool[i].mmr;
      }
    }

    const teamB: Player[] = [];
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) {
        teamB.push(pool[i]);
      }
    }

    const teamBSum = totalMMR - teamASum;
    const diff = Math.abs(teamASum - teamBSum);

    // optional: enforce near-equal sizes if needed
    if (Math.abs(teamA.length - teamB.length) > 1) continue;

    if (diff < bestDiff) {
      bestDiff = diff;
      bestMask = mask;
    }
  }

  // build final teams
  const atlantis: Player[] = [];
  const titans: Player[] = [];

  let atlantisSum = 0;
  let titansSum = 0;

  for (let i = 0; i < n; i++) {
    if (bestMask & (1 << i)) {
      atlantis.push(pool[i]);
      atlantisSum += pool[i].mmr;
    } else {
      titans.push(pool[i]);
      titansSum += pool[i].mmr;
    }
  }

  const atlantisAvg = Math.round(atlantisSum / atlantis.length);
  const titansAvg = Math.round(titansSum / titans.length);

  return {
    atlantis,
    titans,
    atlantisAvg,
    titansAvg,
    diff: Math.round(Math.abs(atlantisAvg - titansAvg) ),
  };
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap');

  .goa-root {
    --gold: #C9973A;
    --gold-light: #F0C96A;
    --gold-dark: #7A5A1A;
    --atlantis-light: #2AABB8;
    --atlantis-dark: #0D3D47;
    --titans-light: #C42A3A;
    --titans-dark: #3D0D14;
    --stone: #1C1A14;
    --stone-mid: #2A2720;
    --stone-lt: #3A3628;
    --border: rgba(201,151,58,0.3);
    --border-bright: rgba(201,151,58,0.7);
    --txt: #F0E6C8;
    --muted: #A09070;
    font-family: 'Crimson Pro', Georgia, serif;
    background:
      radial-gradient(ellipse 120% 50% at 50% 0%, rgba(26,107,122,0.18) 0%, transparent 55%),
      radial-gradient(ellipse 80% 40% at 50% 100%, rgba(122,26,42,0.12) 0%, transparent 55%),
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

  .goa-card {
    margin: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    background: rgba(28,26,20,0.85);
    position: relative;
  }
  .goa-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-bright), transparent);
  }
  .goa-card-head {
    padding: 0.55rem 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, rgba(42,39,32,0.5), rgba(28,26,20,0.8));
    font-family: 'Cinzel', serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--gold);
  }
  .goa-card-body { padding: 0.75rem; }

  .goa-search {
    width: 100%;
    background: rgba(42,39,32,0.8);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 0.6rem 0.75rem;
    color: var(--txt);
    font-family: 'Crimson Pro', serif;
    font-size: 1rem;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .goa-search::placeholder { color: var(--muted); font-style: italic; }
  .goa-search:focus { border-color: var(--border-bright); }

  .goa-dropdown {
    margin-top: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 3px;
    overflow: hidden;
    max-height: 180px;
    overflow-y: auto;
  }
  .goa-dropdown::-webkit-scrollbar { width: 4px; }
  .goa-dropdown::-webkit-scrollbar-track { background: var(--stone-mid); }
  .goa-dropdown::-webkit-scrollbar-thumb { background: var(--gold-dark); border-radius: 2px; }

  .goa-option {
    width: 100%;
    background: var(--stone-mid);
    border: none;
    border-bottom: 1px solid rgba(201,151,58,0.1);
    padding: 0.55rem 0.75rem;
    color: var(--txt);
    font-family: 'Crimson Pro', serif;
    font-size: 0.95rem;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background 0.15s;
  }
  .goa-option:hover { background: rgba(58,54,40,0.9); }
  .goa-option:last-child { border-bottom: none; }
  .goa-option-mmr { font-family: 'Cinzel', serif; font-size: 0.65rem; color: var(--muted); }
  .goa-option-new { color: var(--gold); font-style: italic; }

  .goa-pool {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-top: 0.65rem;
  }

  .goa-pool-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(42,39,32,0.5);
    border: 1px solid rgba(201,151,58,0.15);
    border-radius: 3px;
    padding: 0.42rem 0.6rem;
    animation: fadeSlide 0.2s ease;
  }
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .goa-pool-name { font-size: 0.9rem; color: var(--txt); display: flex; align-items: center; gap: 0.35rem; }
  .goa-pool-mmr { font-family: 'Cinzel', serif; font-size: 0.65rem; color: var(--muted); }
  .goa-remove {
    background: none;
    border: 1px solid rgba(196,42,58,0.35);
    border-radius: 2px;
    color: rgba(196,42,58,0.7);
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    font-size: 0.8rem;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .goa-remove:hover { background: rgba(196,42,58,0.2); color: #ff6b7a; border-color: rgba(196,42,58,0.8); }

  .goa-pool-empty { color: var(--muted); font-style: italic; font-size: 0.82rem; text-align: center; padding: 0.4rem; }

  .goa-split-btns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.65rem;
    margin: 0 0.75rem 0.75rem;
  }

  .goa-split-btn {
    border-radius: 4px;
    padding: 0.85rem 0.5rem;
    cursor: pointer;
    font-family: 'Cinzel', serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: center;
    border: 1px solid var(--border);
    background: rgba(28,26,20,0.85);
    color: var(--txt);
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }
  .goa-split-btn::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-bright), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .goa-split-btn:hover:not(:disabled)::before { opacity: 1; }
  .goa-split-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .goa-split-btn.random {
    border-color: rgba(42,171,184,0.4);
    color: var(--atlantis-light);
  }
  .goa-split-btn.random:hover:not(:disabled) {
    background: rgba(26,107,122,0.25);
    border-color: var(--atlantis-light);
    box-shadow: 0 0 12px rgba(42,171,184,0.2);
  }

  .goa-split-btn.balanced {
    border-color: rgba(201,151,58,0.5);
    color: var(--gold-light);
  }
  .goa-split-btn.balanced:hover:not(:disabled) {
    background: rgba(201,151,58,0.15);
    border-color: var(--gold);
    box-shadow: 0 0 12px rgba(201,151,58,0.2);
  }

  .goa-split-icon { font-size: 1.5rem; display: block; margin-bottom: 0.3rem; }
  .goa-split-desc { font-size: 0.6rem; font-weight: 400; color: var(--muted); display: block; margin-top: 0.15rem; font-family: 'Crimson Pro', serif; font-style: italic; text-transform: none; letter-spacing: 0; }

  /* Result */
  .goa-result {
    margin: 0 0.75rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    background: rgba(28,26,20,0.85);
    position: relative;
    animation: fadeSlide 0.25s ease;
  }
  .goa-result::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-bright), transparent);
  }

  .goa-result-head {
    padding: 0.55rem 0.85rem;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, rgba(42,39,32,0.5), rgba(28,26,20,0.8));
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .goa-result-title {
    font-family: 'Cinzel', serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--gold);
  }
  .goa-result-diff {
    font-family: 'Cinzel', serif;
    font-size: 0.62rem;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  .goa-result-diff span { color: var(--gold-light); font-weight: 600; }

  .goa-result-teams {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .goa-result-team { padding: 0.65rem 0.7rem; }
  .goa-result-team:first-child { border-right: 1px solid var(--border); }

  .goa-result-team-head {
    font-family: 'Cinzel', serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 0.15rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .goa-result-team-head.atl { color: var(--atlantis-light); }
  .goa-result-team-head.tit { color: var(--titans-light); }

  .goa-result-avg {
    font-family: 'Cinzel', serif;
    font-size: 0.6rem;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin-bottom: 0.45rem;
  }

  .goa-result-player {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.22rem 0;
    border-bottom: 1px solid rgba(201,151,58,0.06);
    font-size: 0.85rem;
    color: var(--txt);
  }
  .goa-result-player:last-child { border-bottom: none; }
  .goa-result-player-mmr { font-family: 'Cinzel', serif; font-size: 0.6rem; color: var(--muted); margin-left: auto; }

  .goa-dot-atl { color: var(--atlantis-light); font-size: 0.65rem; }
  .goa-dot-tit { color: var(--titans-light); font-size: 0.65rem; }

  .goa-divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent); margin: 0.25rem 0.75rem; }

  .goa-footer {
    text-align: center;
    padding: 0 1rem 2rem;
    font-family: 'Cinzel', serif;
    font-size: 0.53rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(160,144,112,0.35);
  }
`;

export default function TeamSplitterPage() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pool, setPool] = useState<Player[]>([]);
  const [result, setResult] = useState<SplitResult>(null);
  const [lastMode, setLastMode] = useState<"random" | "balanced" | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabaseClient
        .from("players")
        .select("id, name, mmr")
        .order("name");
      setAllPlayers(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const available = allPlayers.filter(
    (p) => !pool.some((x) => x.id === p.id) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const upsertPlayer = async (name: string): Promise<Player> => {
    const { data, error } = await supabaseClient
      .from("players")
      .upsert({ name }, { onConflict: "name" })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const addToPool = async (name: string) => {
    if (!name.trim()) return;
    const existing = allPlayers.find(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase()
    );
    const player = existing ?? await upsertPlayer(name.trim());
    if (!pool.some((p) => p.id === player.id)) {
      setPool((prev) => [...prev, player]);
      if (!allPlayers.some((p) => p.id === player.id)) {
        setAllPlayers((prev) => [...prev, player]);
      }
    }
    setSearch("");
    setResult(null);
  };

  const removeFromPool = (id: string) => {
    setPool((prev) => prev.filter((p) => p.id !== id));
    setResult(null);
  };

  const handleRandom = () => {
    setResult(randomSplit(pool));
    setLastMode("random");
  };

  const handleBalanced = () => {
    setResult(balancedSplit(pool));
    setLastMode("balanced");
  };

  const canSplit = pool.length >= 2;

  if (loading) {
    return (
      <div className="goa-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <style>{styles}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚔️</div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: "0.75rem", letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase" }}>
            Summoning players…
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="goa-root">
      <style>{styles}</style>

      <header className="goa-header">
        <div className="goa-crown">⚔️</div>
        <h1 className="goa-title">Divide the Players</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Player pool builder */}
      <div className="goa-card">
        <div className="goa-card-head">
          <span>🧑‍🤝‍🧑</span> Player Pool
          {pool.length > 0 && (
            <span style={{ marginLeft: "auto", fontFamily: "'Cinzel', serif", fontSize: "0.6rem", color: "var(--muted)", letterSpacing: "0.05em" }}>
              {pool.length} summoned
            </span>
          )}
        </div>
        <div className="goa-card-body">
          <input
            className="goa-search"
            placeholder="Search or add a player..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setResult(null); }}
          />

          {search && (
            <div className="goa-dropdown">
              {available.map((p) => (
                <button key={p.id} className="goa-option" onClick={() => addToPool(p.name)}>
                  <span>{p.name}</span>
                  <span className="goa-option-mmr">{p.mmr} MMR</span>
                </button>
              ))}
              {available.length === 0 && (
                <button className="goa-option goa-option-new" onClick={() => addToPool(search)}>
                  ✦ Recruit &quot;{search}&quot;
                </button>
              )}
            </div>
          )}

          <div className="goa-pool">
            {pool.length === 0 && (
              <p className="goa-pool-empty">No players assembled yet</p>
            )}
            {pool.map((p) => (
              <div key={p.id} className="goa-pool-row">
                <span className="goa-pool-name">
                  <span style={{ color: "var(--gold)", fontSize: "0.65rem" }}>◆</span>
                  {p.name}
                  <span className="goa-pool-mmr">{p.mmr}</span>
                </span>
                <button className="goa-remove" onClick={() => removeFromPool(p.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Split buttons */}
      <div className="goa-split-btns">
        <button
          className="goa-split-btn random"
          onClick={handleRandom}
          disabled={!canSplit}
        >
          <span className="goa-split-icon">🎲</span>
          Random Split
          <span className="goa-split-desc">Fate decides the sides</span>
        </button>

        <button
          className="goa-split-btn balanced"
          onClick={handleBalanced}
          disabled={!canSplit}
        >
          <span className="goa-split-icon">⚖️</span>
          Balanced Split
          <span className="goa-split-desc">Similar average MMR across teams</span>
        </button>
      </div>

      {!canSplit && (
        <p style={{ textAlign: "center", fontFamily: "'Cinzel', serif", fontSize: "0.62rem", letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase", margin: "0 0.75rem 0.75rem" }}>
          Add at least 2 players to split
        </p>
      )}

      {/* Result */}
      {result && (
        <>
          <div className="goa-result">
            <div className="goa-result-head">
              <span className="goa-result-title">
                {lastMode === "balanced" ? "⚖️ Balanced" : "🎲 Random"} Teams
              </span>
              <span className="goa-result-diff">
                <span>{result.diff}</span> MMR difference
              </span>
            </div>

            <div className="goa-result-teams">
              <div className="goa-result-team">
                <div className="goa-result-team-head tit">
                  <span>Atlantis</span>
                </div>
                <div className="goa-result-avg">Avg {result.atlantisAvg} MMR</div>
                {result.atlantis.map((p) => (
                  <div key={p.id} className="goa-result-player">
                    <span className="goa-dot-tit">◆</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <span className="goa-result-player-mmr">{p.mmr}</span>
                  </div>
                ))}
              </div>

              <div className="goa-result-team">
                <div className="goa-result-team-head atl">
                  <span>Titans</span>
                </div>
                <div className="goa-result-avg">Avg {result.titansAvg} MMR</div>
                {result.titans.map((p) => (
                  <div key={p.id} className="goa-result-player">
                    <span className="goa-dot-atl">◆</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <span className="goa-result-player-mmr">{p.mmr}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Re-roll for random */}
          {lastMode === "random" && (
            <div style={{ margin: "0 0.75rem 0.75rem" }}>
              <button
                className="goa-split-btn random"
                style={{ width: "100%", padding: "0.7rem" }}
                onClick={handleRandom}
              >
                🎲 Re-roll the Fates
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
