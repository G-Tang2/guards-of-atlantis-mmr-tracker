"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  CheckCircle2,
  Swords,
  ScrollText,
  Undo2,
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
  // Which team currently holds the tie-break token — persists across the
  // whole session (unlike everything else here, which resets per round or
  // per turn), flipping only when it's actually used to break a tie.
  tieBreakToken: Team;
  // This turn's initiative value per not-yet-acted player, entered by the
  // controller in the select-player screen. Cleared at the start of every
  // new turn.
  initiative: Record<string, number>;
  // Whether picking the current acting player flipped the tie-break
  // token — lets "go back" (a misclick) undo exactly that flip, since
  // flipping a two-state token twice restores it.
  actingPlayerTokenFlipped: boolean;
};

// ─── Config options ─────────────────────────────────────────────────────────

const STRATEGY_OPTIONS = [30, 60, 90, 120, 150];
const ACTION_OPTIONS = [15, 30, 45, 60, 75];
const EOR_OPTIONS = [90, 120, 150, 180, 210];
const RESERVE_OPTIONS = [60, 120, 180, 240, 300];
const INITIATIVE_OPTIONS = Array.from({ length: 19 }, (_, i) => i); // 0–18

// A player's *total* action time across a whole session can run well past
// a minute, unlike the short live countdowns formatActionTime is normally
// used for — this spells it out as minutes + seconds instead of a single
// large number of seconds.
function formatMinutesSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

// ─── Sound ──────────────────────────────────────────────────────────────────
// No audio assets/infra exist elsewhere in this app — a short sine-wave
// chime is synthesized on the fly instead of shipping a new sound file.
//
// iOS/iPadOS Safari creates every AudioContext in a suspended state and
// only lets it start producing sound once it's been resumed inside a
// direct user-gesture handler (a tap) — resuming it later, from a timer
// callback, does nothing audible. The old code made a fresh AudioContext
// per beep and always played it from the 1s tick/reserve-interval effects
// (never a tap), so on iPad it stayed silently suspended forever. Now a
// single context is created lazily and reused for every cue, and
// unlockAudioContext() is called from the timer's own tap handlers to
// resume it on real user gestures.

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function unlockAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
}

function playBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
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
  } catch {
    // Audio unsupported/blocked by the browser — non-fatal.
  }
}

// Short, higher-pitched blip for the final-5-seconds countdown — distinct
// from the 15s warning chime above so the two cues aren't confused.
function playTick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
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
  } catch {
    // Audio unsupported/blocked by the browser — non-fatal.
  }
}

// Soft, unhurried reminder — repeated on a slow interval for as long as a
// team is spending reserve time. Distinct in tone from the two cues above
// (a gentle sine, not a buzzy sawtooth) since it just needs to remind
// people reserve is running, not startle them.
function playReservePulse() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 523.25; // C5
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio unsupported/blocked by the browser — non-fatal.
  }
}

// A quick two-note "go" chime for whenever a fresh phase countdown begins
// (strategy, an action pick, or end-of-round) — distinct from the other
// cues above since it signals a start rather than a warning.
function playCountdownStart() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [660, 990].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.12;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  } catch {
    // Audio unsupported/blocked by the browser — non-fatal.
  }
}

// ─── Session state machine (pure, so the 1s tick and every button handler
// can share the exact same transition logic) ───────────────────────────────

function freshRound(
  round: number,
  config: TimerConfig,
  tieBreakToken: Team,
): SessionState {
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
    tieBreakToken,
    initiative: {},
    actingPlayerTokenFlipped: false,
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
    initiative: {},
  };
}

function flipToken(team: Team): Team {
  return team === "atlantis" ? "titans" : "atlantis";
}

// Who should be highlighted to go next in the select-player screen: the
// not-yet-acted player(s) with the highest entered initiative. If several
// are tied for highest, only the ones on the tie-break token's team are
// highlighted instead (the token decides who among the tied group goes) —
// unless none of the tied players are on that team, in which case the
// token doesn't apply and the whole tied group is highlighted.
function computeInitiativeHighlight(
  initiative: Record<string, number>,
  actedThisTurn: string[],
  tieBreakToken: Team,
  allPlayerIds: string[],
  teamOf: (id: string) => Team,
): { highlighted: Set<string>; tieResolvedByToken: boolean } {
  const candidates = allPlayerIds.filter(
    (id) => !actedThisTurn.includes(id) && initiative[id] !== undefined,
  );
  if (candidates.length === 0) {
    return { highlighted: new Set(), tieResolvedByToken: false };
  }
  const maxValue = Math.max(...candidates.map((id) => initiative[id]));
  const tied = candidates.filter((id) => initiative[id] === maxValue);
  if (tied.length === 1) {
    return { highlighted: new Set(tied), tieResolvedByToken: false };
  }
  const tokenTeamTied = tied.filter((id) => teamOf(id) === tieBreakToken);
  if (tokenTeamTied.length > 0) {
    return { highlighted: new Set(tokenTeamTied), tieResolvedByToken: true };
  }
  return { highlighted: new Set(tied), tieResolvedByToken: false };
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
  return {
    ...freshRound(s.round + 1, config, s.tieBreakToken),
    actionSeconds: s.actionSeconds,
  };
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
    actingPlayerTokenFlipped: false,
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
  const [initialTieBreakToken, setInitialTieBreakToken] = useState<Team>("atlantis");
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

  // Who the select-player screen highlights as "up next" right now.
  const initiativeHighlight = useMemo(() => {
    if (!session || session.phase !== "select_player") return new Set<string>();
    return computeInitiativeHighlight(
      session.initiative,
      session.actedThisTurn,
      session.tieBreakToken,
      allPlayerIds,
      teamOf,
    ).highlighted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, allPlayerIds]);

  const beepFiredRef = useRef<Record<string, boolean>>({});
  const lastTickValueRef = useRef<Record<string, number>>({});
  // Tracks the last-seen value of the *main* phase countdown (id "main" —
  // strategy, an action pick, or end-of-round) so a fresh restart, which
  // always jumps the value back up, can be told apart from the normal
  // second-by-second decrement. Reserve-drain countdowns reuse other ids
  // and already get their own start cue (the immediate reserve pulse
  // below), so they're intentionally not covered here.
  const lastMainCountdownValueRef = useRef<number | undefined>(undefined);
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

      if (id === "main") {
        if (
          lastMainCountdownValueRef.current === undefined ||
          value > lastMainCountdownValueRef.current
        ) {
          playCountdownStart();
        }
        lastMainCountdownValueRef.current = value;
      }
    });
    if (!activeCountdowns.some(({ id }) => id === "main")) {
      lastMainCountdownValueRef.current = undefined;
    }
  }, [activeCountdowns]);

  // A gentle repeating reminder for as long as any reserve clock is
  // actively draining — distinct from the one-shot cues above since it
  // needs to keep signalling for the whole stretch, not just once.
  useEffect(() => {
    if (stage !== "running" || !session) return;
    const draining =
      session.atlantisDraining || session.titansDraining || session.actionDraining;
    if (!draining) return;
    playReservePulse();
    const id = setInterval(playReservePulse, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stage,
    session?.atlantisDraining,
    session?.titansDraining,
    session?.actionDraining,
  ]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleStart = () => {
    // Must run inside this tap handler, not later from the tick effect —
    // iOS Safari only lets an AudioContext start producing sound when
    // resumed directly from a user gesture (see the note above playBeep).
    unlockAudioContext();
    const cfg: TimerConfig = { strategyTime, actionTime, eorTime, reserveTime };
    setConfig(cfg);
    setSession(freshRound(1, cfg, initialTieBreakToken));
    setStage("running");
  };

  const handleReady = (team: Team) => {
    if (!config) return;
    unlockAudioContext();
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
    unlockAudioContext();
    setSession((prev) => {
      if (!prev || prev.phase !== "select_player") return prev;
      const { highlighted, tieResolvedByToken } = computeInitiativeHighlight(
        prev.initiative,
        prev.actedThisTurn,
        prev.tieBreakToken,
        allPlayerIds,
        teamOf,
      );
      const shouldFlip = tieResolvedByToken && highlighted.has(playerId);
      return {
        ...prev,
        phase: "action",
        actingPlayerId: playerId,
        phaseTimeRemaining: config.actionTime,
        actionDraining: false,
        actionElapsed: 0,
        tieBreakToken: shouldFlip ? flipToken(prev.tieBreakToken) : prev.tieBreakToken,
        actingPlayerTokenFlipped: shouldFlip,
      };
    });
  };

  const handleSetInitiative = (playerId: string, value: number) => {
    setSession((prev) =>
      prev
        ? { ...prev, initiative: { ...prev.initiative, [playerId]: value } }
        : prev,
    );
  };

  const handleCompleteAction = () => {
    if (!config) return;
    unlockAudioContext();
    setSession((prev) => (prev ? commitAction(prev, config, allPlayerIds) : prev));
  };

  // Undoes an accidental pick — back to select-player with nothing
  // committed (no action time recorded, not marked acted), and reverses
  // the tie-break flip if picking this player had caused one.
  const handleGoBackToSelect = () => {
    setSession((prev) => {
      if (!prev || prev.phase !== "action") return prev;
      return {
        ...prev,
        phase: "select_player",
        actingPlayerId: null,
        actionDraining: false,
        actionElapsed: 0,
        tieBreakToken: prev.actingPlayerTokenFlipped
          ? flipToken(prev.tieBreakToken)
          : prev.tieBreakToken,
        actingPlayerTokenFlipped: false,
      };
    });
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
      <div className="goa-root goa-timer-page goa-loading-screen">
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
    <main
      className={`goa-root goa-timer-page${stage === "running" ? " goa-timer-live" : ""}`}
    >
      <header className="goa-header">
        <div className="goa-crown">
          <TimerIcon size={30} />
        </div>
        <h1 className="goa-title">Battle Timer</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {stage === "setup" && (
        <div className="goa-card">
          <div className="goa-card-head">How a Round Works</div>
          <div className="goa-timer-diagram-wrap">
            <svg
              viewBox="0 0 960 300"
              className="goa-timer-diagram"
              role="img"
              aria-label="One round begins, runs strategy phase then action phase across four turns, then end of round phase, then loops back into a fresh round with reserves refilled."
            >
              <defs>
                <marker id="timerArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 Z" fill="currentColor" />
                </marker>
                <marker id="timerArrowGold" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 Z" fill="#c9973a" />
                </marker>
              </defs>

              <g stroke="currentColor" strokeWidth="1.5" opacity="0.55">
                <line x1="64" y1="110" x2="108" y2="110" markerEnd="url(#timerArrow)" />
                <line x1="282" y1="110" x2="318" y2="110" markerEnd="url(#timerArrow)" />
                <line x1="512" y1="110" x2="558" y2="110" markerEnd="url(#timerArrow)" />
                <line x1="732" y1="110" x2="774" y2="110" markerEnd="url(#timerArrow)" />
              </g>

              <circle cx="40" cy="110" r="24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
              <text x="40" y="115" textAnchor="middle" fontSize="9" letterSpacing="0.02em" fill="currentColor">ROUND</text>
              <text x="40" y="153" textAnchor="middle" fontSize="10" letterSpacing="0.06em" fill="currentColor" opacity="0.6">BEGIN</text>

              <rect x="110" y="70" width="172" height="80" rx="4" fill="#211d15" stroke="#c9973a" strokeWidth="1.5" />
              <text x="196" y="94" textAnchor="middle" fontSize="13" fontWeight="700" letterSpacing="0.04em" fill="#f0c96a">STRATEGY</text>
              <text x="196" y="112" textAnchor="middle" fontSize="10.5" fill="#a89a7c">both teams plan,</text>
              <text x="196" y="126" textAnchor="middle" fontSize="10.5" fill="#a89a7c">then ready up</text>
              <circle cx="176" cy="140" r="3.5" fill="#c42a3a" />
              <circle cx="216" cy="140" r="3.5" fill="#2aabb8" />

              <rect x="320" y="70" width="192" height="80" rx="4" fill="#201c22" stroke="#9b7fd4" strokeWidth="1.5" />
              <text x="416" y="94" textAnchor="middle" fontSize="13" fontWeight="700" letterSpacing="0.04em" fill="#c3b1ec">ACTION</text>
              <text x="416" y="112" textAnchor="middle" fontSize="10.5" fill="#a89a7c">one player acts,</text>
              <text x="416" y="126" textAnchor="middle" fontSize="10.5" fill="#a89a7c">picked each time</text>
              <text x="416" y="142" textAnchor="middle" fontSize="9.5" letterSpacing="0.04em" fill="#9b7fd4">× every player</text>

              <g stroke="#c9973a" strokeWidth="1.2" opacity="0.75" fill="none">
                <path d="M110,172 L110,180 L512,180 L512,172" />
              </g>
              <text x="311" y="197" textAnchor="middle" fontSize="10.5" letterSpacing="0.08em" fill="#c9973a" fontWeight="600">× 4 TURNS PER ROUND</text>

              <rect x="560" y="70" width="172" height="80" rx="4" fill="#1a2126" stroke="#5a7a8a" strokeWidth="1.5" />
              <text x="646" y="94" textAnchor="middle" fontSize="13" fontWeight="700" letterSpacing="0.04em" fill="#9fc0cf">END OF ROUND</text>
              <text x="646" y="112" textAnchor="middle" fontSize="10.5" fill="#a89a7c">both teams close</text>
              <text x="646" y="126" textAnchor="middle" fontSize="10.5" fill="#a89a7c">out, then ready up</text>
              <circle cx="626" cy="140" r="3.5" fill="#c42a3a" />
              <circle cx="666" cy="140" r="3.5" fill="#2aabb8" />

              <circle cx="800" cy="110" r="24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
              <text x="800" y="115" textAnchor="middle" fontSize="9" letterSpacing="0.02em" fill="currentColor">ROUND</text>
              <text x="800" y="153" textAnchor="middle" fontSize="10" letterSpacing="0.06em" fill="currentColor" opacity="0.6">END</text>

              <path d="M800,134 C 800,235 40,235 40,134" fill="none" stroke="#c9973a" strokeWidth="1.5" strokeDasharray="2 5" markerEnd="url(#timerArrowGold)" opacity="0.85" />
              <text x="420" y="255" textAnchor="middle" fontSize="11" letterSpacing="0.05em" fill="#c9973a" fontWeight="600">NEXT ROUND — RESERVES REFILL</text>

              <g transform="translate(60,270)">
                <circle cx="0" cy="0" r="3.5" fill="#c42a3a" />
                <text x="10" y="4" fontSize="9.5" fill="#a89a7c" letterSpacing="0.01em">Atlantis</text>
                <circle cx="70" cy="0" r="3.5" fill="#2aabb8" />
                <text x="80" y="4" fontSize="9.5" fill="#a89a7c" letterSpacing="0.01em">Titans</text>
              </g>
            </svg>
          </div>
          <p className="goa-timer-diagram-caption">
            Strategy and action repeat for each of a round&rsquo;s four
            turns; end of round runs once, then the whole sequence loops
            into a fresh round.
          </p>
        </div>
      )}

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
        <div className="goa-card">
          <div className="goa-card-head">Tie Breaker Coin</div>
          <div className="goa-timer-token-row">
            <button
              type="button"
              className={`goa-timer-token-btn atl${initialTieBreakToken === "atlantis" ? " active" : ""}`}
              onClick={() => setInitialTieBreakToken("atlantis")}
            >
              <Image
                src="/icons/tiebreaker_orange.png"
                alt=""
                width={22}
                height={22}
              />
              Orange (Atlantis)
            </button>
            <button
              type="button"
              className={`goa-timer-token-btn tit${initialTieBreakToken === "titans" ? " active" : ""}`}
              onClick={() => setInitialTieBreakToken("titans")}
            >
              <Image
                src="/icons/tiebreaker_blue.png"
                alt=""
                width={22}
                height={22}
              />
              Blue (Titans)
            </button>
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
        <div className="goa-timer-live-body">
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
              <span className="goa-timer-reserve-value">{formatActionTime(session.atlantisReserve)}</span>
            </div>
            <div className={`goa-timer-reserve tit${session.titansDraining ? " draining" : ""}`}>
              <span className="goa-timer-reserve-label">Titans Reserve</span>
              <span className="goa-timer-reserve-value">{formatActionTime(session.titansReserve)}</span>
            </div>
          </div>

          <div className="goa-timer-token-indicator">
            <Image
              src={
                session.tieBreakToken === "atlantis"
                  ? "/icons/tiebreaker_orange.png"
                  : "/icons/tiebreaker_blue.png"
              }
              alt=""
              width={66}
              height={66}
            />
          </div>

          {(session.phase === "strategy" || session.phase === "end_of_round") && (
            <div className="goa-timer-main-count">
              {!session.atlantisDraining && !session.titansDraining
                ? formatActionTime(session.phaseTimeRemaining)
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
            <div
              className="goa-timer-select-teams"
              style={
                {
                  "--roster-size": Math.max(atlantis.length, titans.length, 1),
                } as CSSProperties
              }
            >
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
                      const highlighted = initiativeHighlight.has(p.id);
                      // Any not-yet-acted player can be picked — the
                      // highlight is just a suggestion (highest initiative,
                      // tie-break resolved), not an enforced pick order.
                      const selectable = !acted;
                      return (
                        <div
                          key={p.id}
                          className={`goa-player-row${selectable ? " clickable" : ""}${highlighted ? " goa-timer-initiative-highlight" : ""}`}
                          onClick={() => selectable && handleSelectPlayer(p.id)}
                          style={acted ? { opacity: 0.4 } : undefined}
                        >
                          <span className="goa-player-name">
                            <PlayerAvatar avatarUrl={p.avatar_url} name={p.name} size={22} />
                            {p.name}
                          </span>
                          {!acted && (
                            <select
                              className="goa-timer-initiative-select"
                              value={session.initiative[p.id] ?? ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSetInitiative(p.id, Number(e.target.value));
                              }}
                            >
                              <option value="" disabled>
                                —
                              </option>
                              {INITIATIVE_OPTIONS.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          )}
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
                  ? formatActionTime(session.phaseTimeRemaining)
                  : formatActionTime(
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
        </div>

          <div className="goa-timer-controls">
            {session.phase === "action" && (
              <button
                className="goa-timer-control-btn"
                onClick={handleGoBackToSelect}
              >
                <Undo2 size={14} />
                Wrong Player?
              </button>
            )}
            <button
              className="goa-timer-control-btn"
              onClick={() => setPaused((v) => !v)}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
              {paused ? "Resume" : "Pause"}
            </button>
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
                      <span>{formatMinutesSeconds(session.actionSeconds[p.id] ?? 0)}</span>
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
