"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PasswordGate } from "@/components/PasswordGate";
import { TEAMS_DRAFT_STORAGE_KEY } from "@/lib/teamsDraft";
import { TIMER_LOG_STORAGE_KEY } from "@/lib/timerLog";
import { formatActionTime } from "@/lib/match";
import {
  Timer as TimerIcon,
  Pause,
  Play,
  SkipForward,
  CheckCircle2,
  Swords,
  ScrollText,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Team = "atlantis" | "titans";
type Player = { id: string; name: string; avatar_url?: string | null };
type Phase = "strategy" | "select_player" | "action" | "end_of_round";

type TimerConfig = {
  strategyTime: number;
  actionTime: number;
  eorTime: number;
  reserveTime: number;
};

type SessionState = {
  round: number;
  turn: number;
  phase: Phase;
  atlantisReady: boolean;
  titansReady: boolean;
  atlantisReserve: number;
  titansReserve: number;
  atlantisDraining: boolean;
  titansDraining: boolean;
  actedThisTurn: string[];
  actingPlayerId: string | null;
  phaseTimeRemaining: number;
  actionDraining: boolean;
  actionElapsed: number;
  actionSeconds: Record<string, number>;
};

// ─── Config options ─────────────────────────────────────────────────────────

const STRATEGY_OPTIONS = [30, 60, 90, 120, 150];
const ACTION_OPTIONS = [15, 30, 45, 60, 75];
const EOR_OPTIONS = [90, 120, 150, 180, 210];
const RESERVE_OPTIONS = [60, 120, 180, 240, 300];

const formatClock = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// ─── Sound ──────────────────────────────────────────────────────────────────
// No audio assets/infra exist elsewhere in this app — a short sine-wave
// chime is synthesized on the fly instead of shipping a new sound file.

function playBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    // Audio unsupported/blocked by the browser — non-fatal.
  }
}

// Short, higher-pitched blip for the final-5-seconds countdown — distinct
// from the 15s warning chime above so the two cues aren't confused.
function playTick() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => ctx.close();
  } catch {
    // Audio unsupported/blocked by the browser — non-fatal.
  }
}

// ─── Session state machine (pure, so the 1s tick and every button handler
// can share the exact same transition logic) ───────────────────────────────

function freshRound(round: number, config: TimerConfig): SessionState {
  return {
    round,
    turn: 1,
    phase: "strategy",
    atlantisReady: false,
    titansReady: false,
    atlantisReserve: config.reserveTime,
    titansReserve: config.reserveTime,
    atlantisDraining: false,
    titansDraining: false,
    actedThisTurn: [],
    actingPlayerId: null,
    phaseTimeRemaining: config.strategyTime,
    actionDraining: false,
    actionElapsed: 0,
    actionSeconds: {},
  };
}

function startNewTurnStrategy(s: SessionState, config: TimerConfig): SessionState {
  return {
    ...s,
    phase: "strategy",
    atlantisReady: false,
    titansReady: false,
    atlantisDraining: false,
    titansDraining: false,
    phaseTimeRemaining: config.strategyTime,
    actedThisTurn: [],
  };
}

function startEndOfRound(s: SessionState, config: TimerConfig): SessionState {
  return {
    ...s,
    phase: "end_of_round",
    atlantisReady: false,
    titansReady: false,
    atlantisDraining: false,
    titansDraining: false,
    phaseTimeRemaining: config.eorTime,
  };
}

function startNewRound(s: SessionState, config: TimerConfig): SessionState {
  return { ...freshRound(s.round + 1, config), actionSeconds: s.actionSeconds };
}

// After any ready-state change, advance if both sides are now ready.
function resolveReadyPhase(s: SessionState, config: TimerConfig): SessionState {
  if (!(s.atlantisReady && s.titansReady)) return s;
  if (s.phase === "strategy") return { ...s, phase: "select_player" };
  if (s.phase === "end_of_round") return startNewRound(s, config);
  return s;
}

// Commits the acting player's accumulated time, marks them acted, and
// figures out what's next: another player this turn, the next turn's
// strategy phase, or end-of-round.
function commitAction(
  s: SessionState,
  config: TimerConfig,
  allPlayerIds: string[],
): SessionState {
  if (!s.actingPlayerId) return s;
  const playerId = s.actingPlayerId;
  const actionSeconds = {
    ...s.actionSeconds,
    [playerId]: (s.actionSeconds[playerId] ?? 0) + s.actionElapsed,
  };
  const actedThisTurn = [...s.actedThisTurn, playerId];
  const base: SessionState = {
    ...s,
    actionSeconds,
    actedThisTurn,
    actingPlayerId: null,
    actionDraining: false,
    actionElapsed: 0,
  };

  const allActed = allPlayerIds.every((id) => actedThisTurn.includes(id));
  if (!allActed) return { ...base, phase: "select_player" };
  return base.turn < 4
    ? startNewTurnStrategy({ ...base, turn: base.turn + 1 }, config)
    : startEndOfRound(base, config);
}

function tick(
  s: SessionState,
  config: TimerConfig,
  teamOf: (id: string) => Team,
  allPlayerIds: string[],
): SessionState {
  if (s.phase === "strategy" || s.phase === "end_of_round") {
    const next = { ...s };
    if (!next.atlantisDraining && !next.titansDraining) {
      if (next.phaseTimeRemaining > 0) {
        next.phaseTimeRemaining -= 1;
        if (next.phaseTimeRemaining === 0) {
          if (!next.atlantisReady) next.atlantisDraining = true;
          if (!next.titansReady) next.titansDraining = true;
        }
      }
      return resolveReadyPhase(next, config);
    }
    if (next.atlantisDraining && !next.atlantisReady) {
      next.atlantisReserve = Math.max(0, next.atlantisReserve - 1);
      if (next.atlantisReserve === 0) {
        next.atlantisReady = true;
        next.atlantisDraining = false;
      }
    }
    if (next.titansDraining && !next.titansReady) {
      next.titansReserve = Math.max(0, next.titansReserve - 1);
      if (next.titansReserve === 0) {
        next.titansReady = true;
        next.titansDraining = false;
      }
    }
    return resolveReadyPhase(next, config);
  }

  if (s.phase === "action" && s.actingPlayerId) {
    const team = teamOf(s.actingPlayerId);
    let next: SessionState = { ...s, actionElapsed: s.actionElapsed + 1 };
    if (!next.actionDraining) {
      if (next.phaseTimeRemaining > 0) {
        next.phaseTimeRemaining -= 1;
        if (next.phaseTimeRemaining === 0) next.actionDraining = true;
      }
      return next;
    }
    if (team === "atlantis") {
      next.atlantisReserve = Math.max(0, next.atlantisReserve - 1);
      if (next.atlantisReserve === 0) next = commitAction(next, config, allPlayerIds);
    } else {
      next.titansReserve = Math.max(0, next.titansReserve - 1);
      if (next.titansReserve === 0) next = commitAction(next, config, allPlayerIds);
    }
    return next;
  }

  return s;
}

// ─── Page ───────────────────────────────────────────────────────────────────

function MatchTimerPageInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [atlantis, setAtlantis] = useState<Player[]>([]);
  const [titans, setTitans] = useState<Player[]>([]);

  const [stage, setStage] = useState<"setup" | "running" | "finished">("setup");
  const [strategyTime, setStrategyTime] = useState(60);
  const [actionTime, setActionTime] = useState(30);
  const [eorTime, setEorTime] = useState(120);
  const [reserveTime, setReserveTime] = useState(180);
  const [config, setConfig] = useState<TimerConfig | null>(null);

  const [session, setSession] = useState<SessionState | null>(null);
  const [paused, setPaused] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(TEAMS_DRAFT_STORAGE_KEY);
    if (!raw) {
      router.replace("/teams");
      return;
    }
    try {
      const saved = JSON.parse(raw) as { atlantis: string[]; titans: string[] };
      if (saved.atlantis.length === 0 || saved.titans.length === 0) {
        router.replace("/teams");
        return;
      }
      supabaseClient
        .from("players")
        .select("id, name, avatar_url")
        .in("id", [...saved.atlantis, ...saved.titans])
        .then(({ data, error }) => {
          if (error || !data) {
            router.replace("/teams");
            return;
          }
          const byId = new Map<string, Player>(data.map((p) => [p.id, p]));
          setAtlantis(
            saved.atlantis.map((id) => byId.get(id)).filter((p): p is Player => !!p),
          );
          setTitans(
            saved.titans.map((id) => byId.get(id)).filter((p): p is Player => !!p),
          );
          setLoading(false);
        });
    } catch {
      router.replace("/teams");
    }
  }, [router]);

  const allPlayerIds = useMemo(
    () => [...atlantis, ...titans].map((p) => p.id),
    [atlantis, titans],
  );
  const atlantisIdSet = useMemo(() => new Set(atlantis.map((p) => p.id)), [atlantis]);
  const teamOf = (id: string): Team => (atlantisIdSet.has(id) ? "atlantis" : "titans");

  // 1Hz tick — the whole clock lives in `session`, updated as one pure
  // transition per second so every rule (draining, auto-ready, forced
  // advance) is evaluated in one consistent place.
  useEffect(() => {
    if (stage !== "running" || paused || !config) return;
    const id = setInterval(() => {
      setSession((prev) => (prev ? tick(prev, config, teamOf, allPlayerIds) : prev));
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, paused, config, atlantis, titans]);

  // Active countdown(s) this instant, for the 15s beep / 5s big-number cues.
  const activeCountdowns = useMemo(() => {
    if (stage !== "running" || !session) return [] as { id: string; value: number }[];
    const list: { id: string; value: number }[] = [];
    if (session.phase === "strategy" || session.phase === "end_of_round") {
      if (!session.atlantisDraining && !session.titansDraining) {
        list.push({ id: "main", value: session.phaseTimeRemaining });
      } else {
        if (session.atlantisDraining)
          list.push({ id: "atlantis-reserve", value: session.atlantisReserve });
        if (session.titansDraining)
          list.push({ id: "titans-reserve", value: session.titansReserve });
      }
    } else if (session.phase === "action" && session.actingPlayerId) {
      if (!session.actionDraining) {
        list.push({ id: "main", value: session.phaseTimeRemaining });
      } else {
        const team = teamOf(session.actingPlayerId);
        list.push({
          id: "action-reserve",
          value: team === "atlantis" ? session.atlantisReserve : session.titansReserve,
        });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, stage]);

  const beepFiredRef = useRef<Record<string, boolean>>({});
  const lastTickValueRef = useRef<Record<string, number>>({});
  useEffect(() => {
    activeCountdowns.forEach(({ id, value }) => {
      // One-shot warning chime at 15s remaining.
      if (value <= 15 && value > 0 && !beepFiredRef.current[id]) {
        beepFiredRef.current[id] = true;
        playBeep();
      }
      if (value > 15) beepFiredRef.current[id] = false;

      // A tick every second for the final 5 seconds (5, 4, 3, 2, 1).
      if (value >= 1 && value <= 5 && lastTickValueRef.current[id] !== value) {
        lastTickValueRef.current[id] = value;
        playTick();
      }
      if (value > 5) delete lastTickValueRef.current[id];
    });
  }, [activeCountdowns]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleStart = () => {
    const cfg: TimerConfig = { strategyTime, actionTime, eorTime, reserveTime };
    setConfig(cfg);
    setSession(freshRound(1, cfg));
    setStage("running");
  };

  const handleReady = (team: Team) => {
    if (!config) return;
    setSession((prev) => {
      if (!prev) return prev;
      const next =
        team === "atlantis"
          ? { ...prev, atlantisReady: true, atlantisDraining: false }
          : { ...prev, titansReady: true, titansDraining: false };
      return resolveReadyPhase(next, config);
    });
  };

  const handleSelectPlayer = (playerId: string) => {
    if (!config) return;
    setSession((prev) =>
      prev && prev.phase === "select_player"
        ? {
            ...prev,
            phase: "action",
            actingPlayerId: playerId,
            phaseTimeRemaining: config.actionTime,
            actionDraining: false,
            actionElapsed: 0,
          }
        : prev,
    );
  };

  const handleCompleteAction = () => {
    if (!config) return;
    setSession((prev) => (prev ? commitAction(prev, config, allPlayerIds) : prev));
  };

  const handleSkip = () => {
    if (!config || !session) return;
    if (session.phase === "action") {
      handleCompleteAction();
    } else if (session.phase === "strategy" || session.phase === "end_of_round") {
      setSession((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          atlantisReady: true,
          titansReady: true,
          atlantisDraining: false,
          titansDraining: false,
        };
        return resolveReadyPhase(next, config);
      });
    }
  };

  const confirmEndTimer = () => {
    if (!config) return;
    setSession((prev) => {
      if (!prev) return prev;
      const settled = prev.actingPlayerId ? commitAction(prev, config, allPlayerIds) : prev;
      return settled;
    });
    setConfirmEndOpen(false);
    setStage("finished");
  };

  const handleContinue = () => {
    if (session) {
      sessionStorage.setItem(TIMER_LOG_STORAGE_KEY, JSON.stringify(session.actionSeconds));
    }
    router.push("/matches/new");
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="goa-root goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <ScrollText size={32} />
          </div>
          <p className="goa-loading-text">Preparing the timer…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="goa-root">
      <header className="goa-header">
        <div className="goa-crown">
          <TimerIcon size={30} />
        </div>
        <h1 className="goa-title">Battle Timer</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {stage === "setup" && (
        <div className="goa-card">
          <div className="goa-card-head">Phase Durations</div>
          <div className="goa-game-settings">
            <div className="goa-counter-field">
              <label className="goa-counter-label">Strategy Phase</label>
              <select
                className="goa-select"
                value={strategyTime}
                onChange={(e) => setStrategyTime(Number(e.target.value))}
              >
                {STRATEGY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {formatActionTime(v)}
                  </option>
                ))}
              </select>
            </div>
            <div className="goa-counter-field">
              <label className="goa-counter-label">Action Phase</label>
              <select
                className="goa-select"
                value={actionTime}
                onChange={(e) => setActionTime(Number(e.target.value))}
              >
                {ACTION_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {formatActionTime(v)}
                  </option>
                ))}
              </select>
            </div>
            <div className="goa-counter-field">
              <label className="goa-counter-label">End of Round</label>
              <select
                className="goa-select"
                value={eorTime}
                onChange={(e) => setEorTime(Number(e.target.value))}
              >
                {EOR_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {formatActionTime(v)}
                  </option>
                ))}
              </select>
            </div>
            <div className="goa-counter-field">
              <label className="goa-counter-label">Team Reserve</label>
              <select
                className="goa-select"
                value={reserveTime}
                onChange={(e) => setReserveTime(Number(e.target.value))}
              >
                {RESERVE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {formatActionTime(v)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {stage === "setup" && (
        <div className="goa-btn-wrap">
          <button
            className="goa-btn inline-flex items-center justify-center gap-2"
            onClick={handleStart}
          >
            <TimerIcon size={18} />
            Start Timer
          </button>
        </div>
      )}

      {stage === "running" && session && config && (
        <>
          <div className="goa-timer-status">
            <span className="goa-timer-round">
              Round {session.round} · Turn {session.turn}/4
            </span>
            <span className="goa-timer-phase">
              {session.phase === "strategy" && "Strategy Phase"}
              {session.phase === "select_player" && "Select Next Player"}
              {session.phase === "action" && "Action Phase"}
              {session.phase === "end_of_round" && "End of Round"}
            </span>
          </div>

          <div className="goa-timer-reserves">
            <div className={`goa-timer-reserve atl${session.atlantisDraining ? " draining" : ""}`}>
              <span className="goa-timer-reserve-label">Atlantis Reserve</span>
              <span className="goa-timer-reserve-value">{formatClock(session.atlantisReserve)}</span>
            </div>
            <div className={`goa-timer-reserve tit${session.titansDraining ? " draining" : ""}`}>
              <span className="goa-timer-reserve-label">Titans Reserve</span>
              <span className="goa-timer-reserve-value">{formatClock(session.titansReserve)}</span>
            </div>
          </div>

          {(session.phase === "strategy" || session.phase === "end_of_round") && (
            <div className="goa-timer-main-count">
              {!session.atlantisDraining && !session.titansDraining
                ? formatClock(session.phaseTimeRemaining)
                : "—"}
            </div>
          )}

          {(session.phase === "strategy" || session.phase === "end_of_round") && (
            <div className="goa-timer-ready-row">
              <button
                className={`goa-timer-ready-btn atl${session.atlantisReady ? " ready" : ""}`}
                onClick={() => handleReady("atlantis")}
                disabled={session.atlantisReady}
              >
                <CheckCircle2 size={16} />
                {session.atlantisReady ? "Atlantis Ready" : "Ready Up: Atlantis"}
              </button>
              <button
                className={`goa-timer-ready-btn tit${session.titansReady ? " ready" : ""}`}
                onClick={() => handleReady("titans")}
                disabled={session.titansReady}
              >
                <CheckCircle2 size={16} />
                {session.titansReady ? "Titans Ready" : "Ready Up: Titans"}
              </button>
            </div>
          )}

          {session.phase === "select_player" && (
            <div className="goa-timer-select-teams">
              {[
                { label: "Atlantis", labelClass: "atl", players: atlantis },
                { label: "Titans", labelClass: "tit", players: titans },
              ].map(({ label, labelClass, players }) => (
                <div key={label} className="goa-section">
                  <div
                    className={`goa-section-header ${labelClass === "atl" ? "atlantis-header" : "titans-header"}`}
                  >
                    <h2 className="goa-section-title">{label}</h2>
                  </div>
                  <div className="goa-players">
                    {players.map((p) => {
                      const acted = session.actedThisTurn.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          className={`goa-player-row${acted ? "" : " clickable"}`}
                          onClick={() => !acted && handleSelectPlayer(p.id)}
                          style={acted ? { opacity: 0.4 } : undefined}
                        >
                          <span className="goa-player-name">
                            <PlayerAvatar avatarUrl={p.avatar_url} name={p.name} size={22} />
                            {p.name}
                          </span>
                          {acted && <CheckCircle2 size={15} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {session.phase === "action" && session.actingPlayerId && (
            <div className="goa-timer-action">
              {(() => {
                const player = [...atlantis, ...titans].find(
                  (p) => p.id === session.actingPlayerId,
                );
                if (!player) return null;
                return (
                  <div className="goa-timer-action-player">
                    <PlayerAvatar avatarUrl={player.avatar_url} name={player.name} size={48} />
                    <span>{player.name}</span>
                  </div>
                );
              })()}
              <div className="goa-timer-main-count">
                {!session.actionDraining
                  ? formatClock(session.phaseTimeRemaining)
                  : formatClock(
                      teamOf(session.actingPlayerId) === "atlantis"
                        ? session.atlantisReserve
                        : session.titansReserve,
                    )}
              </div>
              <div className="goa-btn-wrap">
                <button
                  className="goa-btn inline-flex items-center justify-center gap-2"
                  onClick={handleCompleteAction}
                >
                  <CheckCircle2 size={18} />
                  Complete Turn
                </button>
              </div>
            </div>
          )}

          <div className="goa-timer-controls">
            <button
              className="goa-timer-control-btn"
              onClick={() => setPaused((v) => !v)}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
              {paused ? "Resume" : "Pause"}
            </button>
            {session.phase !== "select_player" && (
              <button className="goa-timer-control-btn" onClick={handleSkip}>
                <SkipForward size={16} />
                Skip
              </button>
            )}
            <button
              className="goa-timer-control-btn danger"
              onClick={() => setConfirmEndOpen(true)}
            >
              End Timer
            </button>
          </div>

          {confirmEndOpen && (
            <div
              className="draft-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) setConfirmEndOpen(false);
              }}
            >
              <div className="draft-sheet">
                <div className="draft-head">
                  <span className="draft-head-title">End the Timer?</span>
                  <button
                    className="draft-close"
                    onClick={() => setConfirmEndOpen(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="draft-body">
                  <p className="draft-note" style={{ textAlign: "left" }}>
                    This ends the timer session and moves on to recording
                    the battle result.
                  </p>
                  <div className="goa-btn-wrap" style={{ margin: 0 }}>
                    <button
                      className="goa-btn sm inline-flex items-center justify-center gap-2"
                      onClick={() => setConfirmEndOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="goa-btn-wrap" style={{ margin: 0 }}>
                    <button
                      className="goa-btn danger sm inline-flex items-center justify-center gap-2"
                      onClick={confirmEndTimer}
                    >
                      End Timer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {stage === "finished" && session && (
        <>
          <div className="goa-section">
            <div className="goa-sec-head">Action Time</div>
            {[
              { label: "Atlantis", labelClass: "atl", players: atlantis },
              { label: "Titans", labelClass: "tit", players: titans },
            ].map(({ label, labelClass, players }) => (
              <div key={label}>
                <div
                  className={`goa-section-header ${labelClass === "atl" ? "atlantis-header" : "titans-header"}`}
                >
                  <h2 className="goa-section-title">{label}</h2>
                </div>
                <div className="goa-players">
                  {players.map((p) => (
                    <div key={p.id} className="goa-player-row">
                      <span className="goa-player-name">
                        <PlayerAvatar avatarUrl={p.avatar_url} name={p.name} size={22} />
                        {p.name}
                      </span>
                      <span>{formatActionTime(session.actionSeconds[p.id] ?? 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="goa-btn-wrap">
            <button
              className="goa-btn inline-flex items-center justify-center gap-2"
              onClick={handleContinue}
            >
              <Swords size={18} />
              Continue to Record of Battle
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default function MatchTimerPage() {
  return (
    <PasswordGate>
      <MatchTimerPageInner />
    </PasswordGate>
  );
}
