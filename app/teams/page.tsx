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
  mode: "random" | "balanced" | "draft";
} | null;

// ── Draft types ───────────────────────────────────────────────────────────────

type DraftPhase = "select_captains" | "drafting" | "complete";

type DraftState = {
  phase: DraftPhase;
  captainAtlantis: Player | null;
  captainTitans: Player | null;
  firstPick: "atlantis" | "titans";
  currentPick: "atlantis" | "titans";
  pickNumber: number;
  atlantis: Player[];
  titans: Player[];
  remaining: Player[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const avg = (players: Player[]) =>
  players.length === 0
    ? 0
    : Math.round(players.reduce((s, p) => s + p.mmr, 0) / players.length);

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

const randomSplit = (pool: Player[]): SplitResult => {
  const shuffled = shuffle(pool);
  const mid = Math.ceil(shuffled.length / 2);
  const atlantis = shuffled.slice(0, mid);
  const titans = shuffled.slice(mid);
  return {
    atlantis,
    titans,
    atlantisAvg: avg(atlantis),
    titansAvg: avg(titans),
    diff: Math.abs(avg(atlantis) - avg(titans)),
    mode: "random",
  };
};

const balancedSplit = (pool: Player[]): SplitResult => {
  const n = pool.length;
  const totalMMR = pool.reduce((s, p) => s + p.mmr, 0);
  let bestDiff = Infinity;
  let bestMask = 0;

  for (let mask = 0; mask < 1 << n; mask++) {
    let teamASize = 0;
    let teamASum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        teamASize++;
        teamASum += pool[i].mmr;
      }
    }
    const teamBSize = n - teamASize;
    if (Math.abs(teamASize - teamBSize) > 1) continue;
    const diff = Math.abs(teamASum - (totalMMR - teamASum));
    if (diff < bestDiff) {
      bestDiff = diff;
      bestMask = mask;
    }
  }

  const atlantis: Player[] = [];
  const titans: Player[] = [];
  for (let i = 0; i < n; i++) {
    (bestMask & (1 << i) ? atlantis : titans).push(pool[i]);
  }

  return {
    atlantis,
    titans,
    atlantisAvg: avg(atlantis),
    titansAvg: avg(titans),
    diff: Math.abs(avg(atlantis) - avg(titans)),
    mode: "balanced",
  };
};

// Snake pick order: 1,2,2,1,1,2,2,1… (first pick alternates every two picks)
const snakeFaction = (
  pickNumber: number,
  firstPick: "atlantis" | "titans",
): "atlantis" | "titans" => {
  const second: "atlantis" | "titans" =
    firstPick === "atlantis" ? "titans" : "atlantis";
  // Groups of 2: group 0 → first, group 1 → second, group 2 → first…
  return Math.floor(pickNumber / 2) % 2 === 0 ? firstPick : second;
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = `
 
  /* ── Draft modal ── */
  .draft-overlay {
    position: fixed; inset: 0;
    background: rgba(10,9,6,0.85);
    z-index: 200;
    display: flex; align-items: flex-end; justify-content: center;
    animation: overlayIn 0.2s ease;
  }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }

  .draft-sheet {
    width: 100%; max-width: 480px;
    background: #1E1C16;
    border: 1px solid rgba(201,151,58,0.5);
    border-bottom: none;
    border-radius: 14px 14px 0 0;
    max-height: 90vh;
    display: flex; flex-direction: column;
    overflow: hidden;
    animation: sheetUp 0.28s cubic-bezier(0.32,0.72,0,1);
    position: relative;
  }
  .draft-sheet::before { content:''; position:absolute; top:0;left:0;right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(201,151,58,0.7),transparent); }
  @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }

  .draft-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.9rem 1rem 0.75rem;
    border-bottom: 1px solid rgba(201,151,58,0.2);
    background: linear-gradient(135deg,rgba(42,39,32,0.6),rgba(28,26,20,0.9));
    flex-shrink: 0;
  }
  .draft-head-title { font-family:'Cinzel',serif; font-size:0.88rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--gold-light); }
  .draft-close { background:none; border:1px solid rgba(201,151,58,0.3); border-radius:3px; color:var(--muted); width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:0.75rem; transition:all 0.15s; }
  .draft-close:hover { border-color:var(--gold); color:var(--gold-light); }

  .draft-body { flex:1; overflow-y:auto; padding:0.85rem 0.9rem 1.5rem; display:flex; flex-direction:column; gap:0.7rem; }
  .draft-body::-webkit-scrollbar { width:3px; }
  .draft-body::-webkit-scrollbar-thumb { background:rgba(201,151,58,0.3); border-radius:2px; }

  .draft-note { font-family:'Cinzel',serif; font-size:0.65rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); text-align:center; }
  .draft-note.highlight { color:var(--gold-light); }

  .draft-random-btn { width:100%; background:rgba(42,39,32,0.7); border:1px solid rgba(201,151,58,0.3); border-radius:4px; color:var(--gold-light); font-family:'Cinzel',serif; font-size:0.7rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; padding:0.6rem; cursor:pointer; transition:all 0.15s; }
  .draft-random-btn:hover { background:rgba(201,151,58,0.15); border-color:var(--gold); }

  .draft-captain-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; }
  .draft-captain-col { display:flex; flex-direction:column; gap:0.35rem; }

  .draft-faction-label { font-family:'Cinzel',serif; font-size:0.72rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; }
  .draft-faction-label.atl { color:var(--atl-light); }
  .draft-faction-label.tit { color:var(--tit-light); }

  .draft-col-label { font-family:'Cinzel',serif; font-size:0.55rem; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); }

  .draft-captain-chosen { display:flex; align-items:center; gap:0.4rem; background:rgba(42,39,32,0.6); border:1px solid rgba(201,151,58,0.25); border-radius:3px; padding:0.4rem 0.5rem; }
  .draft-captain-name { font-family:'Crimson Pro',serif; font-size:0.88rem; color:var(--txt); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  .draft-player-scroll { display:flex; flex-direction:column; gap:0.25rem; max-height:150px; overflow-y:auto; }
  .draft-player-scroll::-webkit-scrollbar { width:3px; }
  .draft-player-scroll::-webkit-scrollbar-thumb { background:rgba(201,151,58,0.3); border-radius:2px; }
  .draft-player-option { display:flex; align-items:center; gap:0.4rem; background:rgba(28,26,20,0.85); border:1px solid rgba(201,151,58,0.15); border-radius:3px; padding:0.38rem 0.5rem; cursor:pointer; font-family:'Crimson Pro',serif; font-size:0.88rem; color:var(--txt); transition:all 0.12s; width:100%; text-align:left; }
  .draft-player-option:hover { background:rgba(42,39,32,0.9); border-color:rgba(201,151,58,0.4); }
  .draft-player-option:disabled { opacity:0.3; cursor:not-allowed; }

  .draft-start-btn { width:100%; background:linear-gradient(135deg,rgba(201,151,58,0.18),rgba(122,88,26,0.3)); border:1px solid var(--gold); border-radius:4px; color:var(--gold-light); font-family:'Cinzel',serif; font-size:0.82rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; padding:0.8rem; cursor:pointer; transition:all 0.2s; }
  .draft-start-btn:disabled { opacity:0.3; cursor:not-allowed; }
  .draft-start-btn:not(:disabled):hover { box-shadow:0 0 16px rgba(201,151,58,0.3); }

  /* Drafting phase */
  .draft-pick-banner { display:flex; align-items:center; gap:0.55rem; padding:0.65rem 0.75rem; border-radius:4px; border:1px solid; animation:pulse 1.8s ease-in-out infinite; }
  .draft-pick-banner.atl { background:rgba(196,42,58,0.1); border-color:rgba(196,42,58,0.45); }
  .draft-pick-banner.tit { background:rgba(42,171,184,0.1); border-color:rgba(42,171,184,0.45); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.72} }
  .draft-pick-info { flex:1; display:flex; flex-direction:column; gap:0.08rem; }
  .draft-pick-sub { font-family:'Cinzel',serif; font-size:0.55rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); }
  .draft-pick-num { font-family:'Cinzel',serif; font-size:0.6rem; color:var(--muted); }

  .draft-available { display:flex; flex-direction:column; gap:0.32rem; }
  .draft-pick-btn { display:flex; align-items:center; gap:0.5rem; background:rgba(28,26,20,0.85); border:1px solid rgba(201,151,58,0.2); border-radius:4px; padding:0.55rem 0.75rem; cursor:pointer; transition:all 0.15s; width:100%; }
  .draft-pick-btn:hover { background:rgba(201,151,58,0.1); border-color:rgba(201,151,58,0.5); transform:translateX(3px); }
  .draft-pick-btn-name { flex:1; font-family:'Crimson Pro',serif; font-size:0.95rem; color:var(--txt); text-align:left; }
  .draft-pick-btn-mmr { font-family:'Cinzel',serif; font-size:0.62rem; color:var(--muted); }

  .draft-live-teams { display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; }
  .draft-live-team { background:rgba(28,26,20,0.7); border:1px solid rgba(201,151,58,0.15); border-radius:4px; padding:0.5rem 0.6rem; display:flex; flex-direction:column; gap:0.28rem; }
  .draft-live-row { display:flex; align-items:center; gap:0.3rem; padding:0.15rem 0; border-bottom:1px solid rgba(201,151,58,0.06); animation:fadeSlide 0.2s ease; }
  .draft-live-row:last-child { border-bottom:none; }
  .draft-live-num { font-family:'Cinzel',serif; font-size:0.55rem; color:var(--muted); width:14px; text-align:center; flex-shrink:0; }
  .draft-live-name { font-family:'Crimson Pro',serif; font-size:0.82rem; color:var(--txt); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
`;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamSplitterPage() {
  const router = useRouter();

  // Pool state
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pool, setPool] = useState<Player[]>([]);

  // Split result
  const [result, setResult] = useState<SplitResult>(null);

  // Draft modal
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);

  useEffect(() => {
    supabaseClient
      .from("players")
      .select("id, name, mmr, avatar_url")
      .order("name")
      .then(({ data }) => {
        setAllPlayers(data ?? []);
        setLoading(false);
      });
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
      if (!allPlayers.some((p) => p.id === player.id))
        setAllPlayers((prev) => [...prev, player]);
    }
    setSearch("");
    setResult(null);
  };

  const removeFromPool = (id: string) => {
    setPool((prev) => prev.filter((p) => p.id !== id));
    setResult(null);
  };

  // ── Split handlers ──────────────────────────────────────────────────────────

  const handleRandom = () => setResult(randomSplit(pool));
  const handleBalanced = () => setResult(balancedSplit(pool));

  const handleGoToBattle = () => {
    if (!result) return;
    const params = new URLSearchParams();
    result.atlantis.forEach((p) => params.append("atl", p.id));
    result.titans.forEach((p) => params.append("tit", p.id));
    router.push(`/matches/new?${params.toString()}`);
  };

  // ── Draft handlers ──────────────────────────────────────────────────────────

  const openDraft = () => {
    setDraft({
      phase: "select_captains",
      captainAtlantis: null,
      captainTitans: null,
      firstPick: "atlantis",
      currentPick: "atlantis",
      pickNumber: 0,
      atlantis: [],
      titans: [],
      remaining: [],
    });
    setDraftOpen(true);
  };

  const closeDraft = () => {
    setDraftOpen(false);
    setDraft(null);
  };

  const setCaptain = (
    faction: "atlantis" | "titans",
    player: Player | null,
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      // Prevent the same player being both captains
      if (player) {
        const other =
          faction === "atlantis" ? prev.captainTitans : prev.captainAtlantis;
        if (other?.id === player.id) return prev;
      }
      return {
        ...prev,
        [faction === "atlantis" ? "captainAtlantis" : "captainTitans"]: player,
      };
    });
  };

  const randomiseCaptains = () => {
    const [a, b] = shuffle(pool);
    setDraft((prev) =>
      prev ? { ...prev, captainAtlantis: a, captainTitans: b } : prev,
    );
  };

  const shuffleExceptCaptain = <T,>(team: T[]): T[] => [
    team[0],
    ...shuffle(team.slice(1)),
  ];

  const startDraft = () => {
    if (!draft?.captainAtlantis || !draft?.captainTitans) return;
    const firstPick: "atlantis" | "titans" =
      Math.random() < 0.5 ? "atlantis" : "titans";
    const captainIds = new Set([
      draft.captainAtlantis.id,
      draft.captainTitans.id,
    ]);
    const remaining = pool.filter((p) => !captainIds.has(p.id));
    setDraft({
      ...draft,
      phase: "drafting",
      firstPick,
      currentPick: firstPick,
      pickNumber: 1,
      atlantis: [draft.captainAtlantis],
      titans: [draft.captainTitans],
      remaining,
    });
  };

  const draftPick = (player: Player) => {
    setDraft((prev) => {
      if (!prev || prev.phase !== "drafting") return prev;

      const newAtlantis =
        prev.currentPick === "atlantis"
          ? [...prev.atlantis, player]
          : prev.atlantis;
      const newTitans =
        prev.currentPick === "titans" ? [...prev.titans, player] : prev.titans;
      const newRemaining = prev.remaining.filter((p) => p.id !== player.id);
      const newPickNumber = prev.pickNumber + 1;

      if (newRemaining.length === 0) {
        // Draft done — shuffle teams to hide pick order
        return {
          ...prev,
          phase: "complete",
          pickNumber: newPickNumber,
          atlantis: shuffleExceptCaptain(newAtlantis),
          titans: shuffleExceptCaptain(newTitans),
          remaining: [],
        };
      }

      return {
        ...prev,
        pickNumber: newPickNumber,
        currentPick: snakeFaction(newPickNumber, prev.firstPick),
        atlantis: newAtlantis,
        titans: newTitans,
        remaining: newRemaining,
      };
    });
  };

  const confirmDraft = () => {
    if (!draft || draft.phase !== "complete") return;
    setResult({
      atlantis: draft.atlantis,
      titans: draft.titans,
      atlantisAvg: avg(draft.atlantis),
      titansAvg: avg(draft.titans),
      diff: Math.abs(avg(draft.atlantis) - avg(draft.titans)),
      mode: "draft",
    });
    closeDraft();
  };

  const canSplit = pool.length >= 2;
  const canDraft = pool.length >= 3; // need at least 2 captains + 1 player

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
        <style>{styles}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚔️</div>
          <p
            style={{
              fontFamily: "'Cinzel',serif",
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
      <style>{styles}</style>

      <button className="goa-back" onClick={() => router.back()}>
        ‹ Home
      </button>

      <header className="goa-header">
        <div className="goa-crown">⚔️</div>
        <h1 className="goa-title">Divide the Host</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Player pool */}
      <div className="goa-card">
        <div className="goa-card-head">
          Player Pool
          {pool.length > 0 && (
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "'Cinzel',serif",
                fontSize: "0.6rem",
                color: "var(--muted)",
              }}
            >
              {pool.length} summoned
            </span>
          )}
        </div>
        <div className="goa-card-body">
          <input
            className="goa-search"
            placeholder="Search or add a player…"
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
                  <div className="flex">
                    <PlayerAvatar
                      avatarUrl={p.avatar_url}
                      name={p.name}
                      size={22}
                    />
                    <span className="ml-2">{p.name}</span>
                  </div>
                  <span className="goa-splitter-option-mmr">{p.mmr} MMR</span>
                </button>
              ))}
              {available.length === 0 && (
                <button
                  className="goa-splitter-option goa-option-new"
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

      {/* Split buttons — 2 col */}
      <div className="goa-split-btns">
        <button
          className={`goa-split-btn draft ${
            draftOpen || result?.mode === "draft" ? "active" : ""
          }`}
          onClick={openDraft}
          disabled={!canDraft}
        >
          <span className="goa-split-icon">👑</span>
          Captain&apos;s Draft
        </button>
        <button
          className="goa-split-btn random"
          onClick={handleRandom}
          disabled={!canSplit}
        >
          <span className="goa-split-icon">🎲</span>
          Random
        </button>
        <button
          className="goa-split-btn balanced"
          onClick={handleBalanced}
          disabled={!canSplit}
        >
          <span className="goa-split-icon">⚖️</span>
          Balanced
        </button>
      </div>

      {!canSplit && (
        <p
          style={{
            textAlign: "center",
            fontFamily: "'Cinzel',serif",
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
                {result.mode === "balanced"
                  ? "⚖️ Balanced"
                  : result.mode === "draft"
                    ? "👑 Draft"
                    : "🎲 Random"}{" "}
                Teams
              </span>
              <span className="goa-result-diff">
                <span>{result.diff}</span> MMR difference
              </span>
            </div>

            <div className="goa-result-teams">
              {(["atlantis", "titans"] as const).map((faction) => {
                const members = result[faction];
                const teamAvg = result[`${faction}Avg`];
                return (
                  <div key={faction} className="goa-result-team">
                    <div
                      className={`goa-result-team-head ${faction === "atlantis" ? "atl" : "tit"}`}
                    >
                      {faction === "atlantis" ? "Atlantis" : "Titans"}
                    </div>
                    <div className="goa-result-avg">Avg {teamAvg} MMR</div>
                    {members.map((p) => (
                      <div key={p.id} className="goa-result-player">
                        <PlayerAvatar
                          avatarUrl={p.avatar_url}
                          name={p.name}
                          size={20}
                        />
                        <span
                          style={{
                            flex: 1,
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
                );
              })}
            </div>
          </div>

          <div className="goa-btn-wrap">
            <button className="goa-btn" onClick={handleGoToBattle}>
              ⚔ Begin the Battle
            </button>
          </div>
        </>
      )}

      {/* ══════════════ CAPTAIN'S DRAFT MODAL ══════════════ */}
      {draftOpen && draft && (
        <div
          className="draft-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDraft();
          }}
        >
          <div className="draft-sheet">
            {/* Header */}
            <div className="draft-head">
              <span className="draft-head-title">👑 Captain&apos;s Draft</span>
              <button className="draft-close" onClick={closeDraft}>
                ✕
              </button>
            </div>

            {/* ── Phase 1: Select captains ── */}
            {draft.phase === "select_captains" && (
              <div className="draft-body">
                <p className="draft-note">
                  Choose one captain per team, or randomise.
                </p>

                <button
                  className="draft-random-btn"
                  onClick={randomiseCaptains}
                >
                  🎲 Randomise Captains
                </button>

                <div className="draft-captain-grid">
                  {(["atlantis", "titans"] as const).map((faction) => {
                    const chosen =
                      faction === "atlantis"
                        ? draft.captainAtlantis
                        : draft.captainTitans;
                    const otherChosen =
                      faction === "atlantis"
                        ? draft.captainTitans
                        : draft.captainAtlantis;

                    return (
                      <div key={faction} className="draft-captain-col">
                        <span
                          className={`draft-faction-label ${faction === "atlantis" ? "atl" : "tit"}`}
                        >
                          {faction === "atlantis" ? "Atlantis" : "Titans"}
                        </span>
                        <span className="draft-col-label">Captain</span>

                        {chosen ? (
                          <div className="draft-captain-chosen">
                            <PlayerAvatar
                              avatarUrl={chosen.avatar_url}
                              name={chosen.name}
                              size={28}
                            />
                            <span className="draft-captain-name">
                              {chosen.name}
                            </span>
                            <button
                              className="goa-remove"
                              onClick={() => setCaptain(faction, null)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="draft-player-scroll">
                            {pool
                              .filter((p) => p.id !== otherChosen?.id)
                              .map((p) => (
                                <button
                                  key={p.id}
                                  className="draft-player-option"
                                  onClick={() => setCaptain(faction, p)}
                                >
                                  <PlayerAvatar
                                    avatarUrl={p.avatar_url}
                                    name={p.name}
                                    size={20}
                                  />
                                  <span>{p.name}</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  className="draft-start-btn"
                  onClick={startDraft}
                  disabled={!draft.captainAtlantis || !draft.captainTitans}
                >
                  Start Draft →
                </button>
              </div>
            )}

            {/* ── Phase 2: Snake draft ── */}
            {draft.phase === "drafting" && (
              <div className="draft-body">
                {/* Whose pick */}
                <div
                  className={`draft-pick-banner ${draft.currentPick === "atlantis" ? "atl" : "tit"}`}
                >
                  <PlayerAvatar
                    avatarUrl={
                      draft.currentPick === "atlantis"
                        ? draft.captainAtlantis?.avatar_url
                        : draft.captainTitans?.avatar_url
                    }
                    name={
                      draft.currentPick === "atlantis"
                        ? (draft.captainAtlantis?.name ?? "")
                        : (draft.captainTitans?.name ?? "")
                    }
                    size={30}
                  />
                  <div className="draft-pick-info">
                    <span
                      className={`draft-faction-label ${draft.currentPick === "atlantis" ? "atl" : "tit"}`}
                    >
                      {draft.currentPick === "atlantis" ? "Atlantis" : "Titans"}{" "}
                      picks
                    </span>
                    <span className="draft-pick-sub">
                      Captain:{" "}
                      {draft.currentPick === "atlantis"
                        ? draft.captainAtlantis?.name
                        : draft.captainTitans?.name}
                    </span>
                  </div>
                  <span className="draft-pick-num">
                    Pick {draft.pickNumber + 1}
                  </span>
                </div>

                {/* Players to pick from */}
                <div className="draft-available">
                  {draft.remaining.map((p) => (
                    <button
                      key={p.id}
                      className="draft-pick-btn"
                      onClick={() => draftPick(p)}
                    >
                      <PlayerAvatar
                        avatarUrl={p.avatar_url}
                        name={p.name}
                        size={26}
                      />
                      <span className="draft-pick-btn-name">{p.name}</span>
                      <span className="draft-pick-btn-mmr">{p.mmr} MMR</span>
                    </button>
                  ))}
                </div>

                {/* Live team preview */}
                <div className="draft-live-teams">
                  {(["atlantis", "titans"] as const).map((faction) => {
                    const members = draft[faction];
                    return (
                      <div key={faction} className="draft-live-team">
                        <span
                          className={`draft-faction-label ${faction === "atlantis" ? "atl" : "tit"}`}
                        >
                          {faction === "atlantis" ? "Atlantis" : "Titans"} (
                          {members.length})
                        </span>
                        {members.map((p, i) => (
                          <div key={p.id} className="draft-live-row">
                            <span className="draft-live-num">
                              {i === 0 ? "👑" : i + 1}
                            </span>
                            <PlayerAvatar
                              avatarUrl={p.avatar_url}
                              name={p.name}
                              size={18}
                            />
                            <span className="draft-live-name">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Phase 3: Draft complete ── */}
            {draft.phase === "complete" && (
              <div className="draft-body">
                <p className="draft-note highlight">
                  ✦ Draft complete — pick order has been hidden
                </p>

                <div className="draft-live-teams">
                  {(["atlantis", "titans"] as const).map((faction) => {
                    const members = draft[faction];
                    const memberAvg = avg(members);
                    return (
                      <div key={faction} className="draft-live-team">
                        <div>
                          <span
                            className={`draft-faction-label ${faction === "atlantis" ? "atl" : "tit"}`}
                          >
                            {faction === "atlantis" ? "Atlantis" : "Titans"}
                          </span>
                          <span
                            style={{
                              fontFamily: "'Cinzel',serif",
                              fontSize: "0.55rem",
                              color: "var(--muted)",
                              marginLeft: "0.35rem",
                            }}
                          >
                            avg {memberAvg}
                          </span>
                        </div>
                        {members.map((p) => (
                          <div key={p.id} className="draft-live-row">
                            <PlayerAvatar
                              avatarUrl={p.avatar_url}
                              name={p.name}
                              size={20}
                            />
                            <span className="draft-live-name">{p.name}</span>
                            <span
                              style={{
                                fontFamily: "'Cinzel',serif",
                                fontSize: "0.58rem",
                                color: "var(--muted)",
                              }}
                            >
                              {p.mmr}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <button className="draft-start-btn" onClick={confirmDraft}>
                  ✓ Confirm Teams
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="goa-divider" style={{ marginTop: "0.5rem" }} />
    </main>
  );
}
