"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type Player = {
  id: string;
  name: string;
  mmr: number;
  avatar_url?: string | null;
};

type SplitResult = {
  atlantis: Player[];
  titans: Player[];
  atlantisAvg: number;
  titansAvg: number;
  diff: number;
} | null;

const avg = (players: Player[]) =>
  players.length === 0
    ? 0
    : Math.round(players.reduce((s, p) => s + p.mmr, 0) / players.length);

const randomSplit = (pool: Player[]): SplitResult => {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const mid = Math.ceil(shuffled.length / 2);
  const atlantis = shuffled.slice(0, mid);
  const titans = shuffled.slice(mid);
  const atlantisAvg = avg(atlantis);
  const titansAvg = avg(titans);
  return {
    atlantis,
    titans,
    atlantisAvg,
    titansAvg,
    diff: Math.abs(atlantisAvg - titansAvg),
  };
};

const balancedSplit = (pool: Player[]): SplitResult => {
  const n = pool.length;
  const totalMMR = pool.reduce((s, p) => s + p.mmr, 0);

  let bestDiff = Infinity;
  let bestMask = 0;

  // iterate all subsets (0 to 2^n - 1)
  for (let mask = 0; mask < 1 << n; mask++) {
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
    diff: Math.round(Math.abs(atlantisAvg - titansAvg)),
  };
};

export default function TeamSplitterPage() {
  const router = useRouter();
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
        .select("id, name, mmr, avatar_url")
        .order("name");
      setAllPlayers(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const available = allPlayers.filter(
    (p) =>
      !pool.some((x) => x.id === p.id) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
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
      (p) => p.name.toLowerCase() === name.trim().toLowerCase(),
    );
    const player = existing ?? (await upsertPlayer(name.trim()));
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

  const handleGoToBattle = () => {
    if (!result) return;
    const atlantisIds = result.atlantis.map((p) => p.id).join(",");
    const titansIds = result.titans.map((p) => p.id).join(",");
    router.push(`/matches/new?atlantis=${atlantisIds}&titans=${titansIds}`);
  };

  const canSplit = pool.length >= 2;

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
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚔️</div>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            Summoning players…
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
        <div className="goa-crown">⚔️</div>
        <h1 className="goa-title">Divide the Players</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Player pool builder */}
      <div className="goa-card">
        <div className="goa-card-head">
          Player Pool
          {pool.length > 0 && (
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "'Cinzel', serif",
                fontSize: "0.6rem",
                color: "var(--muted)",
                letterSpacing: "0.05em",
              }}
            >
              {pool.length} summoned
            </span>
          )}
        </div>
        <div className="goa-card-body">
          <input
            className="goa-search"
            placeholder="Search or add a player..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setResult(null);
            }}
          />

          {search && (
            <div className="goa-dropdown">
              {available.map((p) => (
                <button
                  key={p.id}
                  className="goa-splitter-option"
                  onClick={() => addToPool(p.name)}
                >
                  <span>{p.name}</span>
                  <span className="goa-splitter-option-mmr">{p.mmr} MMR</span>
                </button>
              ))}
              {available.length === 0 && (
                <button
                  className="goa-splitter-option goa-splitter-option-new"
                  onClick={() => addToPool(search)}
                >
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
                  <PlayerAvatar
                    avatarUrl={p.avatar_url}
                    name={p.name}
                    size={22}
                  />
                  {p.name}
                  <span className="goa-pool-mmr">{p.mmr}</span>
                </span>
                <button
                  className="goa-remove"
                  onClick={() => removeFromPool(p.id)}
                >
                  ✕
                </button>
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
          <span className="goa-split-desc">
            Similar average MMR across teams
          </span>
        </button>
      </div>

      {!canSplit && (
        <p
          style={{
            textAlign: "center",
            fontFamily: "'Cinzel', serif",
            fontSize: "0.62rem",
            letterSpacing: "0.12em",
            color: "var(--muted)",
            textTransform: "uppercase",
            margin: "0 0.75rem 0.75rem",
          }}
        >
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
                <div className="goa-result-avg">
                  Avg {result.atlantisAvg} MMR
                </div>
                {result.atlantis.map((p) => (
                  <div key={p.id} className="goa-result-player">
                    <PlayerAvatar
                      avatarUrl={p.avatar_url}
                      name={p.name}
                      size={20}
                      borderColor="var(--atl)"
                    />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </span>
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
                    <PlayerAvatar
                      avatarUrl={p.avatar_url}
                      name={p.name}
                      size={22}
                    />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </span>
                    <span className="goa-result-player-mmr">{p.mmr}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Go to battle */}
          <div className="goa-btn-wrap">
            <button className="goa-btn" onClick={handleGoToBattle}>
              ⚔ Begin the Battle
              <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>→</span>
            </button>
          </div>
        </>
      )}
    </main>
  );
}
