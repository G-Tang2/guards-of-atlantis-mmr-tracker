"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PasswordGate } from "@/components/PasswordGate";
import { DraftMethod } from "@/lib/match";
import { TEAMS_DRAFT_STORAGE_KEY } from "@/lib/teamsDraft";
import { BATTLE_LOG_STORAGE_KEY } from "@/lib/battleLog";
import { Swords, Crown, Dices, Scale, GripVertical } from "lucide-react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type Player = {
  id: string;
  name: string;
  mmr: number;
  avatar_url?: string | null;
};

// The three places a player can sit: unassigned, or on one of the two
// teams. Players move freely between all three via drag-and-drop.
type Column = "pool" | "atlantis" | "titans";
type Columns = Record<Column, Player[]>;

type Split = { atlantis: Player[]; titans: Player[] };

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

const randomSplit = (pool: Player[]): Split => {
  const shuffled = shuffle(pool);
  const mid = Math.ceil(shuffled.length / 2);
  return { atlantis: shuffled.slice(0, mid), titans: shuffled.slice(mid) };
};

const balancedSplit = (pool: Player[]): Split => {
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

  return { atlantis, titans };
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

// ── Drag-and-drop: move a player between the Pool, Atlantis and Titans ────────

function DraggablePlayerRow({
  player,
  column,
  onRemove,
}: {
  player: Player;
  column: Column;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: player.id, data: { column } });

  return (
    <div
      ref={setNodeRef}
      className={`goa-result-player draggable ${isDragging ? "dragging" : ""}`}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
      }}
    >
      <span
        className="goa-result-player-grab"
        {...listeners}
        {...attributes}
      >
        <GripVertical size={14} className="goa-result-player-grip" />
        <PlayerAvatar
          avatarUrl={player.avatar_url}
          name={player.name}
          size={20}
        />
        <span className="goa-result-player-name">{player.name}</span>
      </span>
      <span className="goa-result-player-mmr">{player.mmr} MMR</span>
      <button
        className="goa-remove"
        onClick={() => onRemove(player.id)}
        aria-label={`Remove ${player.name}`}
      >
        ✕
      </button>
    </div>
  );
}

function DroppableColumn({
  column,
  label,
  labelClass,
  avgMmr,
  emptyHint,
  members,
  onRemove,
}: {
  column: Column;
  label: string;
  labelClass?: string;
  avgMmr?: number;
  emptyHint: string;
  members: Player[];
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  return (
    <div
      ref={setNodeRef}
      className={`goa-result-team ${isOver ? "drag-over" : ""}`}
    >
      <div className={`goa-result-team-head ${labelClass ?? ""}`}>
        {label}
      </div>
      {avgMmr !== undefined && (
        <div className="goa-result-avg">Avg {avgMmr} MMR</div>
      )}
      {members.length === 0 && <p className="goa-pool-empty">{emptyHint}</p>}
      {members.map((p) => (
        <DraggablePlayerRow
          key={p.id}
          player={p}
          column={column}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

export default function TeamSplitterPage() {
  const router = useRouter();

  // Roster data
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // The merged pool + teams table — every summoned player lives in
  // exactly one of these three columns at all times.
  const [columns, setColumns] = useState<Columns>({
    pool: [],
    atlantis: [],
    titans: [],
  });

  // How the current team split was produced. Defaults to "custom" since,
  // absent a split tool, teams are only ever built by manually adding
  // players — and any drag-and-drop tweak after a split tool runs also
  // marks it "custom", since the tool's output no longer stands alone.
  const [assemblyMethod, setAssemblyMethod] = useState<DraftMethod>("custom");

  // Wave/life counter settings for this match, independent of the
  // remaining-at-match-end counters recorded on Record of Battle. Both are
  // one shared starting total — Atlantis and Titans aren't tracked
  // separately. Wave counter can additionally run as two lanes instead of
  // one, but both lanes always start at this same value; the choice only
  // determines how many "remaining" inputs Record of Battle shows later.
  const [waveCounter, setWaveCounter] = useState("");
  const [lifeCounter, setLifeCounter] = useState("");
  const [twoWaveLanes, setTwoWaveLanes] = useState(false);

  // Draft modal
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [coinWinner, setCoinWinner] = useState<"atlantis" | "titans" | null>(null);

  // Drag-and-drop: require a small movement before a drag starts, so it
  // doesn't hijack a plain tap/scroll on the rows.
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const from = active.data.current?.column as Column | undefined;
    const to = over.id as Column;
    if (!from || from === to) return;

    const playerId = active.id as string;
    setAssemblyMethod("custom");
    setColumns((prev) => {
      const player = prev[from].find((p) => p.id === playerId);
      if (!player) return prev;
      return {
        ...prev,
        [from]: prev[from].filter((p) => p.id !== playerId),
        [to]: [...prev[to], player],
      };
    });
  };

  useEffect(() => {
    supabaseClient
      .from("players")
      .select("id, name, mmr, avatar_url")
      .order("name")
      .then(({ data }) => {
        const players = data ?? [];
        setAllPlayers(players);

        // Restore an in-progress team assembly (e.g. the user hit Back
        // from the match-record step) instead of starting over empty.
        try {
          const raw = sessionStorage.getItem(TEAMS_DRAFT_STORAGE_KEY);
          if (raw) {
            const saved = JSON.parse(raw) as {
              pool: string[];
              atlantis: string[];
              titans: string[];
              method: DraftMethod;
              waveCounter?: string;
              lifeCounter?: string;
              twoWaveLanes?: boolean;
            };
            const byId = new Map<string, Player>(
              players.map((p) => [p.id, p]),
            );
            const resolve = (ids: string[]) =>
              ids.map((id) => byId.get(id)).filter((p): p is Player => !!p);
            setColumns({
              pool: resolve(saved.pool),
              atlantis: resolve(saved.atlantis),
              titans: resolve(saved.titans),
            });
            setAssemblyMethod(saved.method);
            setWaveCounter(saved.waveCounter ?? "");
            setLifeCounter(saved.lifeCounter ?? "");
            setTwoWaveLanes(saved.twoWaveLanes ?? false);
          }
        } catch {
          // Corrupt/stale entry — ignore and start fresh.
        }

        setLoading(false);
      });
  }, []);

  // Single source of truth for the team draft — read by /matches/new on
  // handoff (it reads the wave/life counter fields too, to bound the
  // remaining-counter ranges and to record the starting values on the
  // match), and by this page itself to restore state after the user hits
  // Back. Also called directly (not just via the effect below) right
  // before navigating to /matches/new, so the handoff never depends on
  // effect timing.
  const persistDraft = () => {
    const draft = {
      pool: columns.pool.map((p) => p.id),
      atlantis: columns.atlantis.map((p) => p.id),
      titans: columns.titans.map((p) => p.id),
      method: assemblyMethod,
      waveCounter,
      lifeCounter,
      twoWaveLanes,
    };
    const isEmpty =
      draft.pool.length === 0 &&
      draft.atlantis.length === 0 &&
      draft.titans.length === 0;
    if (isEmpty) {
      sessionStorage.removeItem(TEAMS_DRAFT_STORAGE_KEY);
    } else {
      sessionStorage.setItem(TEAMS_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }
  };

  // Keep the draft in sync so it can be restored on the way back from
  // /matches/new. Skipped until the initial load (and any restore above)
  // has finished, so it can't clobber a saved draft with the empty state
  // columns starts in.
  useEffect(() => {
    if (loading) return;
    persistDraft();
  }, [
    columns,
    assemblyMethod,
    waveCounter,
    lifeCounter,
    twoWaveLanes,
    loading,
  ]);

  const allAdded = [...columns.pool, ...columns.atlantis, ...columns.titans];

  const available = allPlayers.filter(
    (p) =>
      !allAdded.some((x) => x.id === p.id) &&
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
    setColumns((prev) => {
      const already = [...prev.pool, ...prev.atlantis, ...prev.titans].some(
        (p) => p.id === player.id,
      );
      return already ? prev : { ...prev, pool: [...prev.pool, player] };
    });
    if (!allPlayers.some((p) => p.id === player.id))
      setAllPlayers((prev) => [...prev, player]);
    setSearch("");
  };

  const removePlayer = (id: string) => {
    setColumns((prev) => ({
      pool: prev.pool.filter((p) => p.id !== id),
      atlantis: prev.atlantis.filter((p) => p.id !== id),
      titans: prev.titans.filter((p) => p.id !== id),
    }));
  };

  // ── Split handlers ──────────────────────────────────────────────────────────

  const handleRandom = () => {
    const { atlantis, titans } = randomSplit(allAdded);
    setColumns({ pool: [], atlantis, titans });
    setAssemblyMethod("random");
  };
  const handleBalanced = () => {
    const { atlantis, titans } = balancedSplit(allAdded);
    setColumns({ pool: [], atlantis, titans });
    setAssemblyMethod("balanced");
  };

  const teamsReady = columns.atlantis.length > 0 && columns.titans.length > 0;
  const canBattle = teamsReady && waveCounter !== "" && lifeCounter !== "";
  const [detailPromptOpen, setDetailPromptOpen] = useState(false);

  const handleGoToBattle = () => {
    if (!canBattle) return;
    setDetailPromptOpen(true);
  };

  const goToSimpleBattle = () => {
    persistDraft();
    setDetailPromptOpen(false);
    router.push("/matches/new");
  };

  const goToDetailedBattle = () => {
    persistDraft();
    // Start clean — any leftover log from a previous, abandoned detailed
    // recording shouldn't carry over into this match.
    sessionStorage.removeItem(BATTLE_LOG_STORAGE_KEY);
    setDetailPromptOpen(false);
    router.push("/matches/battle-log");
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
    const [a, b] = shuffle(allAdded);
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
    const remaining = allAdded.filter((p) => !captainIds.has(p.id));

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
    setColumns({ pool: [], atlantis: draft.atlantis, titans: draft.titans });
    setAssemblyMethod("captains_draft");
    closeDraft();
  };

  const canSplit = allAdded.length >= 2;
  const canDraft = allAdded.length >= 3; // need at least 2 captains + 1 player

  if (loading) {
    return (
      <PasswordGate>
        <div className="goa-root goa-loading-screen">
          <div className="goa-loading-inner">
            <div className="goa-loading-icon">
              <Swords size={32} />
            </div>
            <p className="goa-loading-text">Summoning players…</p>
          </div>
        </div>
      </PasswordGate>
    );
  }

  return (
    <PasswordGate>
    <main className="goa-root">
      <header className="goa-header">
        <div className="goa-crown">
          <Swords size={30} />
        </div>
        <h1 className="goa-title">Divide the Host</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Assemble Teams — merged pool + team table */}
      <div className="goa-card">
        <div className="goa-card-head">
          Assemble Teams
          {allAdded.length > 0 && (
            <span className="goa-card-count">{allAdded.length} summoned</span>
          )}
        </div>
        <div className="goa-card-body">
          <input
            className="goa-search"
            placeholder="Search or add a player…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        </div>

        {/* Split shortcuts — auto-fill Atlantis/Titans from everyone summoned */}
        <div className="goa-split-btns">
          <button
            className={`goa-split-btn draft ${draftOpen ? "active" : ""}`}
            onClick={openDraft}
            disabled={!canDraft}
          >
            <span className="goa-split-icon">
              <Crown size={18} />
            </span>
            Captain&apos;s Draft
          </button>
          <button
            className="goa-split-btn random"
            onClick={handleRandom}
            disabled={!canSplit}
          >
            <span className="goa-split-icon">
              <Dices size={18} />
            </span>
            Random
          </button>
          <button
            className="goa-split-btn balanced"
            onClick={handleBalanced}
            disabled={!canSplit}
          >
            <span className="goa-split-icon">
              <Scale size={18} />
            </span>
            Balanced
          </button>
        </div>

        {!canSplit && (
          <p className="goa-splitter-hint">Add at least 2 players to split</p>
        )}

        {teamsReady && (
          <div className="goa-result-head">
            <span className="goa-result-title">Team Balance</span>
            <span className="goa-result-diff">
              <span>{Math.abs(avg(columns.atlantis) - avg(columns.titans))}</span>{" "}
              MMR difference
            </span>
          </div>
        )}

        {/* Pool + Teams — drag a player into either column to assign them */}
        <DndContext
          sensors={dndSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="goa-result-teams">
            <DroppableColumn
              column="pool"
              label="Player Pool"
              emptyHint="No players waiting — search above to summon one"
              members={columns.pool}
              onRemove={removePlayer}
            />
            <DroppableColumn
              column="atlantis"
              label="Atlantis"
              labelClass="atl"
              avgMmr={columns.atlantis.length > 0 ? avg(columns.atlantis) : undefined}
              emptyHint="Drag players here"
              members={columns.atlantis}
              onRemove={removePlayer}
            />
            <DroppableColumn
              column="titans"
              label="Titans"
              labelClass="tit"
              avgMmr={columns.titans.length > 0 ? avg(columns.titans) : undefined}
              emptyHint="Drag players here"
              members={columns.titans}
              onRemove={removePlayer}
            />
          </div>
        </DndContext>
      </div>

      {/* Game settings — its own card, outside Assemble Teams, so it
          doesn't read as attached to the Titans column above it.
          Independent of Record of Battle's own remaining counters. Both
          are one shared starting total (never per team). Wave counter can
          additionally run as two lanes instead of one, but both always
          start at the same value here — the checkbox only decides how
          many "remaining" inputs show up later. */}
      {teamsReady && (
        <div className="goa-card">
          <div className="goa-card-head">Game Settings</div>
          <div className="goa-game-settings">
            <div className="goa-counter-field">
              <div className="goa-counter-field-head">
                <label className="goa-counter-label">
                  <Image
                    src="/icons/wave_counters.png"
                    alt=""
                    width={14}
                    height={14}
                    className="goa-label-icon"
                  />
                  Wave Counter
                </label>
                <label className="goa-counter-checkbox">
                  <input
                    type="checkbox"
                    checked={twoWaveLanes}
                    onChange={(e) => setTwoWaveLanes(e.target.checked)}
                  />
                  <span className="goa-toggle-track">
                    <span className="goa-toggle-thumb" />
                  </span>
                  <span className="goa-toggle-text">Two lanes</span>
                </label>
              </div>
              <select
                className="goa-select"
                value={waveCounter}
                onChange={(e) => setWaveCounter(e.target.value)}
              >
                <option value="">—</option>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="7">7</option>
              </select>
            </div>
            <div className="goa-counter-field">
              <label className="goa-counter-label">
                <Image
                  src="/icons/life_counters.png"
                  alt=""
                  width={14}
                  height={14}
                  className="goa-label-icon"
                />
                Life Counter
              </label>
              <select
                className="goa-select"
                value={lifeCounter}
                onChange={(e) => setLifeCounter(e.target.value)}
              >
                <option value="">—</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {teamsReady && (waveCounter === "" || lifeCounter === "") && (
        <p className="goa-splitter-hint">
          Select a wave counter and life counter to begin
        </p>
      )}

      <div className="goa-btn-wrap">
        <button
          className="goa-btn inline-flex items-center justify-center gap-2"
          onClick={handleGoToBattle}
          disabled={!canBattle}
        >
          <Swords size={18} />
          Begin the Battle
        </button>
      </div>

      {/* ══════════════ DETAILED BATTLE PROMPT ══════════════ */}
      {detailPromptOpen && (
        <div
          className="draft-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailPromptOpen(false);
          }}
        >
          <div className="draft-sheet">
            <div className="draft-head">
              <span className="draft-head-title">Record Detailed Battle?</span>
              <button
                className="draft-close"
                onClick={() => setDetailPromptOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="draft-body">
              <p className="draft-note" style={{ textAlign: "left" }}>
                Track hero kills, attacks, defends, minion kills, and heals
                for every player, round by round.
              </p>
              <div className="goa-btn-wrap" style={{ margin: 0 }}>
                <button
                  className="goa-btn inline-flex items-center justify-center gap-2"
                  onClick={goToDetailedBattle}
                >
                  <Swords size={18} />
                  Yes, Record in Detail
                </button>
              </div>
              <div className="goa-btn-wrap" style={{ margin: 0 }}>
                <button
                  className="goa-battle-option"
                  onClick={goToSimpleBattle}
                  style={{ width: "100%", textAlign: "center" }}
                >
                  No, Skip to Record of Battle
                </button>
              </div>
            </div>
          </div>
        </div>
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
              <span className="draft-head-title inline-flex items-center gap-1.5">
                <Crown size={16} />
                Captain&apos;s Draft
              </span>
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
                  className="draft-random-btn inline-flex items-center justify-center gap-1.5"
                  onClick={randomiseCaptains}
                >
                  <Dices size={16} />
                  Randomise Captains
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
                            {allAdded
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
                      <span className="draft-coin-vs">
                        <Swords size={24} />
                      </span>
                    )}

                    {/* Winner crown between them */}
                    {coinWinner && (
                      <span className="draft-coin-crown">
                        <Crown size={30} />
                      </span>
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
                              {i === 0 ? <Crown size={11} /> : i + 1}
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
    </PasswordGate>
  );
}
