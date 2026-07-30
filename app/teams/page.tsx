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

type DraftPhase = "select_captains" | "coin_flip" | "drafting" | "complete";

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

const shuffle = <T,>(arr: T[]): T[] => {
  const result = [...arr];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

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
  const [coinWinner, setCoinWinner] = useState<"atlantis" | "titans" | null>(null);

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
    const atlantisIds = result.atlantis.map((p) => p.id).join(",");
    const titansIds = result.titans.map((p) => p.id).join(",");
    router.push(`/matches/new?atlantis=${atlantisIds}&titans=${titansIds}`);
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
    // Decide first pick now but reveal through animation
    const firstPick: "atlantis" | "titans" =
      Math.random() < 0.5 ? "atlantis" : "titans";
    const captainIds = new Set([
      draft.captainAtlantis.id,
      draft.captainTitans.id,
    ]);
    const remaining = pool.filter((p) => !captainIds.has(p.id));

    // Store the resolved draft ready to begin, but show coin flip first
    setCoinWinner(null);
    setDraft({
      ...draft,
      phase: "coin_flip",
      firstPick,
      currentPick: firstPick,
      pickNumber: 1,
      atlantis: [draft.captainAtlantis],
      titans: [draft.captainTitans],
      remaining,
    });

    // Phase 1: spinning (1.8s) → reveal winner (after 2s)
    setTimeout(() => {
      setCoinWinner(firstPick);
    }, 2000);

    // Phase 2: auto-advance to drafting after reveal pause (5s total)
    setTimeout(() => {
      setDraft((prev) =>
        prev ? { ...prev, phase: "drafting" } : prev
      );
    }, 5000);
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
      <div className="goa-root goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">⚔️</div>
          <p className="goa-loading-text">Summoning players…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="goa-root">
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
            <span className="goa-card-count">{pool.length} summoned</span>
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
                  <span className="flex gap-2">
                    <PlayerAvatar
                      avatarUrl={p.avatar_url}
                      name={p.name}
                      size={22}
                    />
                    {p.name}
                  </span>
                  <span className="goa-pool-mmr">{p.mmr} MMR</span>
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
        <p className="goa-splitter-hint">Add at least 2 players to split</p>
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
                        <span className="goa-result-player-name">{p.name}</span>
                        <span className="goa-result-player-mmr">
                          {p.mmr} MMR
                        </span>
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
                            <span className="draft-captain-mmr">
                              {chosen.mmr} MMR
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
                                  <div className="flex align-center gap-1">
                                    <PlayerAvatar
                                      avatarUrl={p.avatar_url}
                                      name={p.name}
                                      size={20}
                                    />
                                    <span>{p.name}</span>
                                  </div>
                                  <span className="draft-player-mmr">
                                    {" "}
                                    {p.mmr} MMR
                                  </span>
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


            {/* ── Phase: Coin flip animation ── */}
            {draft.phase === "coin_flip" && (
              <div className="draft-body">
                <div className="draft-coin-scene">
                  <p className="draft-coin-label">
                    {coinWinner ? "First pick goes to…" : "Deciding who picks first…"}
                  </p>

                  <div className="draft-coin-captains">
                    {/* Atlantis captain */}
                    <div className="draft-coin-captain">
                      <div className={`draft-coin-avatar-wrap ${
                        coinWinner === null
                          ? "spinning"
                          : coinWinner === "atlantis"
                          ? "winner"
                          : "loser"
                      }`}>
                        <PlayerAvatar
                          avatarUrl={draft.captainAtlantis?.avatar_url}
                          name={draft.captainAtlantis?.name ?? ""}
                          size={64}
                          borderColor={coinWinner === "atlantis" ? "var(--gold)" : coinWinner === "titans" ? "rgba(42,39,32,0.4)" : "var(--atl-light)"}
                        />
                      </div>
                      <span className={`draft-coin-name ${
                        coinWinner === null ? "" : coinWinner === "atlantis" ? "winner" : "loser"
                      }`}>
                        {draft.captainAtlantis?.name}
                      </span>
                      <span className="draft-coin-faction atl">Atlantis</span>
                    </div>

                    {/* VS spinner */}
                    {!coinWinner && (
                      <span className="draft-coin-vs">⚔</span>
                    )}

                    {/* Winner crown between them */}
                    {coinWinner && (
                      <span className="draft-coin-crown">👑</span>
                    )}

                    {/* Titans captain */}
                    <div className="draft-coin-captain">
                      <div className={`draft-coin-avatar-wrap ${
                        coinWinner === null
                          ? "spinning"
                          : coinWinner === "titans"
                          ? "winner"
                          : "loser"
                      }`}>
                        <PlayerAvatar
                          avatarUrl={draft.captainTitans?.avatar_url}
                          name={draft.captainTitans?.name ?? ""}
                          size={64}
                          borderColor={coinWinner === "titans" ? "var(--gold)" : coinWinner === "atlantis" ? "rgba(42,39,32,0.4)" : "var(--tit-light)"}
                        />
                      </div>
                      <span className={`draft-coin-name ${
                        coinWinner === null ? "" : coinWinner === "titans" ? "winner" : "loser"
                      }`}>
                        {draft.captainTitans?.name}
                      </span>
                      <span className="draft-coin-faction tit">Titans</span>
                    </div>
                  </div>

                </div>
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
                  <span className="draft-available-label">
                    Available Players
                  </span>
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
                          {faction === "atlantis" ? "Atlantis" : "Titans"}
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
                            <span className="draft-live-mmr">{p.mmr} MMR</span>
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
                  ✦ Draft complete!
                </p>

                <div className="draft-live-teams">
                  {(["atlantis", "titans"] as const).map((faction) => {
                    const members = draft[faction];
                    const memberAvg = avg(members);
                    return (
                      <div key={faction} className="draft-live-team">
                        <div className="flex justify-between align-center">
                          <span
                            className={`draft-faction-label ${faction === "atlantis" ? "atl" : "tit"}`}
                          >
                            {faction === "atlantis" ? "Atlantis" : "Titans"}
                          </span>
                          <span className="draft-live-team-avg">
                            AVG MMR: {memberAvg}
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
                            <span className="draft-live-mmr sm">
                              {p.mmr} MMR
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

      <div className="goa-divider mt-lg" />
    </main>
  );
}
