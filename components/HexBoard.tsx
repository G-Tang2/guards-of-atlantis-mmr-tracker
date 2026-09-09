"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { X, Trash2, Save, RotateCcw, Grid3x3, ZoomOut, HelpCircle, ChevronDown } from "lucide-react";
import { HEROES } from "@/lib/heroes";
import { HERO_CARDS } from "@/lib/heroCards";
import { HeroActionCard } from "@/components/HeroActionCard";
import { BOARD_WIDTH, BOARD_HEIGHT, IMAGE_WIDTH, IMAGE_HEIGHT, ALL_CELLS, hexCenter, hexPoints, nearestCell } from "@/lib/hexGrid";

// The board's own photo sits behind the grid as a plain background
// image; the hexes render as an outline-only overlay on top of it (see
// the SVG below) rather than solid terrain colors, so the real art shows
// through instead of being covered by it.
const BOARD_IMAGE_SRC = "/board/across-the-river.webp";

// Generic (non-hero) pieces — no dedicated art exists for these in the
// repo, so they're a colored badge with a single letter instead of a
// portrait (lucide has no per-letter glyphs to use instead — checked).
// Ids are namespaced ("minion-...") so they can never collide with a
// hero id (heroes and minions share one id-keyed piece system — see
// resolvePieceVisual below).
type MinionType = { id: string; label: string; color: string; letter: string };
const MINION_SHAPES: { shape: string; label: string; letter: string }[] = [
  { shape: "melee", label: "Melee Minion", letter: "M" },
  { shape: "ranged", label: "Ranged Minion", letter: "R" },
  { shape: "heavy", label: "Heavy Minion", letter: "H" },
];
// The two faction colors already defined in .goa-root (see globals.css)
// — every minion comes in both, matching the actual teams.
const MINION_TEAMS: { team: string; label: string; color: string }[] = [
  { team: "titans", label: "Titans", color: "var(--titans)" },
  { team: "atlantis", label: "Atlantis", color: "var(--atlantis)" },
];
// Grouped by team (not flattened) so the palette below can render each
// team as its own contiguous block, separated from the other team and
// from the heroes — see MINION_TEAMS.map in the palette JSX.
const MINION_TYPES_BY_TEAM: { team: string; pieces: MinionType[] }[] = MINION_TEAMS.map((t) => ({
  team: t.team,
  pieces: MINION_SHAPES.map((s) => ({
    id: `minion-${s.shape}-${t.team}`,
    label: `${s.label} (${t.label})`,
    color: t.color,
    letter: s.letter,
  })),
}));
const MINION_TYPES: MinionType[] = MINION_TYPES_BY_TEAM.flatMap((t) => t.pieces);

// Neutral in-game effect tokens (rocks, zombies, ice, smoke bombs, etc.
// — the things card effects place on the board, not team-owned units),
// using the game's own real art (public/tokens), unlike minions above.
// No team association — these are placed by whichever hero's card
// effect created them, not owned outright by a side.
type GameTokenType = { id: string; label: string; icon: string };
const GAME_TOKEN_FILES: { file: string; label: string }[] = [
  { file: "token_barrier.png", label: "Barrier" },
  { file: "token_blast.png", label: "Blast" },
  { file: "token_dud.png", label: "Dud" },
  { file: "token_familiar.png", label: "Familiar" },
  { file: "token_glitch.png", label: "Glitch" },
  { file: "token_grenade.png", label: "Grenade" },
  { file: "token_ice.png", label: "Ice" },
  { file: "token_illusion.png", label: "Illusion" },
  { file: "token_magma.png", label: "Magma" },
  { file: "token_rock.png", label: "Rock" },
  { file: "token_smoke_bomb.png", label: "Smoke Bomb" },
  { file: "token_totem.png", label: "Totem" },
  { file: "token_tree.png", label: "Tree" },
  { file: "token_zombie.png", label: "Zombie" },
];
const GAME_TOKENS: GameTokenType[] = GAME_TOKEN_FILES.map((t) => ({
  id: `gametoken-${t.file.replace("token_", "").replace(".png", "")}`,
  label: t.label,
  icon: `/tokens/${t.file}`,
}));

type PieceVisual = {
  label: string;
  hero?: (typeof HEROES)[number];
  minion?: MinionType;
  gameToken?: GameTokenType;
};

// Heroes, minions, and game tokens are all just "pieces" identified by a
// single id — this is the one place that knows how to turn any of them
// into something paintable, so the board/palette/drag-ghost rendering
// below doesn't need its own three-way branch repeated everywhere.
function resolvePieceVisual(pieceId: string): PieceVisual | null {
  const hero = HEROES.find((h) => h.id === pieceId);
  if (hero) return { label: hero.name, hero };
  const minion = MINION_TYPES.find((m) => m.id === pieceId);
  if (minion) return { label: minion.label, minion };
  const gameToken = GAME_TOKENS.find((g) => g.id === pieceId);
  if (gameToken) return { label: gameToken.label, gameToken };
  return null;
}

function PieceThumb({
  pieceId,
  size,
  className = "",
  ringColor,
}: {
  pieceId: string;
  size: number;
  className?: string;
  // Overrides the piece's border color — used to show a placed hero's
  // assigned team (see the drawer's team buttons) without needing a
  // separate hero-vs-minion rendering path just for that.
  ringColor?: string;
}) {
  const visual = resolvePieceVisual(pieceId);
  if (!visual) return null;
  const ringStyle = ringColor ? { borderColor: ringColor } : undefined;
  if (visual.hero) {
    return (
      <Image
        src={visual.hero.icon}
        alt={visual.hero.name}
        width={size}
        height={size}
        className={`goa-piece-thumb ${className}`}
        style={{ width: size, height: size, ...ringStyle }}
      />
    );
  }
  if (visual.gameToken) {
    return (
      <Image
        src={visual.gameToken.icon}
        alt={visual.gameToken.label}
        width={size}
        height={size}
        className={`goa-piece-thumb ${className}`}
        style={{ width: size, height: size, ...ringStyle }}
      />
    );
  }
  const { letter, color, label } = visual.minion!;
  return (
    <div
      className={`goa-piece-thumb goa-minion-thumb ${className}`}
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.55), ...ringStyle }}
      role="img"
      aria-label={label}
    >
      {letter}
    </div>
  );
}

const STORAGE_KEY = "goa-board-placements";
// How far the pointer has to move before a press counts as a drag rather
// than a tap — shared by "tap a placed piece to remove it" and "tap a
// palette piece does nothing" below. Palette pieces used to need a
// long-press first (to avoid fighting the strip's own horizontal
// scroll), but drag now starts immediately on pointerdown everywhere,
// same as board pieces — scrolling the strip via a swipe that starts
// directly on a piece is the traded-off cost of that.
const MOVE_THRESHOLD_PX = 8;

// Team is only ever meaningfully set on hero pieces (minions already
// bake it into which colored variant was placed) — optional and unset
// by default, assigned via the card drawer's team buttons.
type PlacedToken = { id: string; pieceId: string; col: number; row: number; team?: string };

type SavedLayout = { name: string; tokens: PlacedToken[] };
const LAYOUTS_STORAGE_KEY = "goa-board-layouts";
// A built-in entry in the "load layout" dropdown, alongside whatever the
// user has actually saved — not itself a SavedLayout (it isn't persisted
// to LAYOUTS_STORAGE_KEY and can't be deleted), just always available as
// a way back to the starting scenario. Named distinctly enough that a
// user's own saved layout is very unlikely to collide with it.
const DEFAULT_LAYOUT_NAME = "Default Layout";

// A starting scenario — two skirmish clusters (top-middle and
// bottom-left grass regions) instead of a blank board on a first-ever
// visit, and reloadable at any time afterward via DEFAULT_LAYOUT_NAME
// in the layout dropdown.
const DEFAULT_TOKENS: PlacedToken[] = [
  { id: "default-1", pieceId: "minion-heavy-titans", col: 13, row: 2 },
  { id: "default-2", pieceId: "minion-ranged-titans", col: 12, row: 2 },
  { id: "default-3", pieceId: "minion-heavy-titans", col: 13, row: 4 },
  { id: "default-4", pieceId: "minion-heavy-titans", col: 15, row: 1 },
  { id: "default-5", pieceId: "minion-heavy-atlantis", col: 15, row: 2 },
  { id: "default-6", pieceId: "minion-ranged-atlantis", col: 17, row: 3 },
  { id: "default-7", pieceId: "minion-melee-atlantis", col: 14, row: 4 },
  { id: "default-8", pieceId: "minion-melee-atlantis", col: 16, row: 1 },
  { id: "default-9", pieceId: "minion-heavy-atlantis", col: 8, row: 16 },
  { id: "default-10", pieceId: "minion-ranged-atlantis", col: 9, row: 16 },
  { id: "default-11", pieceId: "minion-melee-atlantis", col: 8, row: 14 },
  { id: "default-12", pieceId: "minion-melee-atlantis", col: 6, row: 17 },
  { id: "default-13", pieceId: "minion-heavy-titans", col: 6, row: 16 },
  { id: "default-14", pieceId: "minion-ranged-titans", col: 4, row: 15 },
  { id: "default-15", pieceId: "minion-melee-titans", col: 5, row: 17 },
  { id: "default-16", pieceId: "minion-melee-titans", col: 7, row: 14 },
];

type DragState = {
  kind: "existing" | "new";
  id: string;
  pieceId: string;
  // Fixed for the life of the drag — `moved` is measured from here, not
  // from the previous frame's x/y (see handlePointerMove's own comment).
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
};

let idCounter = 0;
function makeTokenId(): string {
  idCounter += 1;
  return `t${Date.now()}_${idCounter}`;
}

// Pinch-zoom bounds — 1x is "the whole board fits the box" (the normal
// state), up to 4x for lining pieces up precisely on the fine 22x19.5
// grid.
const MIN_SCALE = 1;
const MAX_SCALE = 4;
type ViewTransform = { scale: number; x: number; y: number };
const DEFAULT_VIEW: ViewTransform = { scale: MIN_SCALE, x: 0, y: 0 };

export function HexBoard() {
  const [tokens, setTokens] = useState<PlacedToken[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dragRender, setDragRender] = useState<DragState | null>(null);
  // Purely visual — hiding the grid still leaves it functional (pieces
  // still snap to the same hexes), it just stops drawing the outline so
  // the photo can be seen clean. Off by default so the board reads as
  // the photo first; "Show Grid" is right there for precise placement.
  const [showGrid, setShowGrid] = useState(false);
  const [heroSearch, setHeroSearch] = useState("");
  const filteredHeroes = HEROES.filter((h) => h.name.toLowerCase().includes(heroSearch.trim().toLowerCase()));
  // Pinch-zoom/pan — entirely separate gesture from piece dragging below
  // (that only ever tracks a single pointer; this only ever acts once a
  // *second* one joins it), so the two can't fight over the same touch.
  const [view, setView] = useState<ViewTransform>(DEFAULT_VIEW);
  // Which hero's card drawer (if any) is open, and which specific placed
  // token it was opened from — set by tapping a placed hero piece (a
  // plain tap, not a drag; see handlePointerUp). Tracking the token id
  // (not just the hero id) is what lets the drawer's team buttons target
  // that one placement, in case the same hero is placed more than once.
  // Minion pieces have no cards, so tapping one leaves this untouched.
  const [openHero, setOpenHero] = useState<{ heroId: string; tokenId: string } | null>(null);
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [layoutsLoaded, setLayoutsLoaded] = useState(false);
  const [selectedLayoutName, setSelectedLayoutName] = useState("");
  // Off by default — a tap-to-reveal tip instead of permanent on-page
  // text, since it's mainly useful the first few visits.
  const [showHelp, setShowHelp] = useState(false);
  // Each palette section can be collapsed independently, to cut down how
  // much scrolling three separate rows (Minions/Tokens/Heroes, the last
  // with 32 items) demands when you only need one of them right now.
  // Expanded by default so a first-time visit doesn't hide the palette
  // entirely — collapsing is an opt-in decluttering step, not the
  // default state.
  const [openSections, setOpenSections] = useState({ minions: true, tokens: true, heroes: true });
  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const boardWrapRef = useRef<HTMLDivElement>(null);
  // The outer wrap element — separate from boardWrapRef (which points to
  // the inner grid-frame, for hit-testing) purely so the wheel-zoom
  // listener below can be attached natively as non-passive; see its own
  // comment for why that can't just be a React onWheel prop.
  const wrapElRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const viewRef = useRef(view);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchBaselineRef = useRef<{ dist: number; scale: number } | null>(null);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Load once on mount, then persist on every change after that — the
  // `loaded` guard keeps the very first render (before the load effect
  // below has run) from immediately overwriting whatever was already
  // saved with an empty array. A first-ever visit (nothing saved yet)
  // starts from DEFAULT_TOKENS instead of a blank board; anything
  // actually saved — including an intentionally-cleared empty board —
  // always wins over it from then on.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setTokens(raw ? JSON.parse(raw) : DEFAULT_TOKENS);
    } catch {
      // Private browsing / storage disabled — still start from the
      // default scenario for this session, same as a first-ever visit.
      setTokens(DEFAULT_TOKENS);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      // Nothing to do if storage isn't available — the board still
      // works for the rest of this session, it just won't persist.
    }
  }, [tokens, loaded]);

  // Named layouts — a separate save slot from the live board above, so
  // "what's on the board right now" and "scenarios I've saved for later"
  // don't overwrite each other.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYOUTS_STORAGE_KEY);
      if (raw) setSavedLayouts(JSON.parse(raw));
    } catch {
      // Private browsing / storage disabled — start with no saved layouts.
    }
    setLayoutsLoaded(true);
  }, []);

  useEffect(() => {
    if (!layoutsLoaded) return;
    try {
      localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(savedLayouts));
    } catch {
      // Nothing to do if storage isn't available.
    }
  }, [savedLayouts, layoutsLoaded]);

  const saveCurrentAsLayout = () => {
    const name = window.prompt("Name this layout:")?.trim();
    if (!name) return;
    if (name === DEFAULT_LAYOUT_NAME) {
      window.alert(`"${DEFAULT_LAYOUT_NAME}" is reserved for the built-in starting scenario — pick a different name.`);
      return;
    }
    setSavedLayouts((prev) => [
      ...prev.filter((l) => l.name !== name),
      { name, tokens: tokens.map((t) => ({ ...t })) },
    ]);
    setSelectedLayoutName(name);
  };

  const loadSelectedLayout = (name: string) => {
    setSelectedLayoutName(name);
    if (!name) return;
    if (name === DEFAULT_LAYOUT_NAME) {
      setTokens(DEFAULT_TOKENS.map((t) => ({ ...t })));
      return;
    }
    const layout = savedLayouts.find((l) => l.name === name);
    if (layout) setTokens(layout.tokens.map((t) => ({ ...t })));
  };

  const deleteSelectedLayout = () => {
    if (!selectedLayoutName) return;
    if (!window.confirm(`Delete saved layout "${selectedLayoutName}"?`)) return;
    setSavedLayouts((prev) => prev.filter((l) => l.name !== selectedLayoutName));
    setSelectedLayoutName("");
  };

  const resolveCellAt = useCallback((clientX: number, clientY: number) => {
    const wrap = boardWrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }
    const localX = ((clientX - rect.left) / rect.width) * BOARD_WIDTH;
    const localY = ((clientY - rect.top) / rect.height) * BOARD_HEIGHT;
    return nearestCell(localX, localY);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const current = dragStateRef.current;
    if (!current) return;
    // Measured from the drag's fixed starting point, not the previous
    // frame's position — comparing frame-to-frame deltas meant a smooth,
    // slow drag (lots of small pointermove steps) could accumulate a
    // large total displacement while every individual step stayed under
    // the threshold, so `moved` never actually latched to true. On drop,
    // that hit the "never moved -> treat as a tap, delete the piece"
    // branch below even after a real, deliberate drag — the piece
    // vanishing instead of relocating.
    const moved = current.moved || Math.hypot(e.clientX - current.startX, e.clientY - current.startY) > MOVE_THRESHOLD_PX;
    const next: DragState = { ...current, x: e.clientX, y: e.clientY, moved };
    dragStateRef.current = next;
    setDragRender(next);
  }, []);

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const current = dragStateRef.current;
      if (!current) return;
      dragStateRef.current = null;
      setDragRender(null);

      const cell = resolveCellAt(e.clientX, e.clientY);

      if (current.kind === "new") {
        // A plain tap on a palette hero (never actually dragged) does
        // nothing — only a real drag-onto-the-board places a piece.
        if (cell && current.moved) {
          setTokens((prev) => {
            // Each hex holds at most one piece — tokens don't stack.
            // Checked against the latest state here (not the `tokens`
            // this callback closed over) so a rapid second drop can't
            // race a stale read and double up on the same cell.
            const occupied = prev.some((t) => t.col === cell.col && t.row === cell.row);
            if (occupied) return prev;
            return [...prev, { id: makeTokenId(), pieceId: current.pieceId, col: cell.col, row: cell.row }];
          });
        }
        return;
      }

      // Existing board piece: removing one is exclusively "drag it off
      // the board and drop" — a plain tap (no drag) opens that hero's
      // card drawer instead (toggling closed if it's already open for
      // this same hero); minion pieces have no cards, so tapping one
      // does nothing, same as before.
      if (!current.moved) {
        const visual = resolvePieceVisual(current.pieceId);
        if (visual?.hero) {
          const heroId = visual.hero.id;
          const tokenId = current.id;
          setOpenHero((prev) => (prev?.tokenId === tokenId ? null : { heroId, tokenId }));
        }
        return;
      } else if (cell) {
        setTokens((prev) => {
          const occupied = prev.some((t) => t.col === cell.col && t.row === cell.row && t.id !== current.id);
          // Occupied by a different piece — reject the move and leave it
          // where it was, rather than letting two pieces share one hex.
          if (occupied) return prev;
          return prev.map((t) => (t.id === current.id ? { ...t, col: cell.col, row: cell.row } : t));
        });
      } else {
        // Dropped outside the board entirely — remove it.
        setTokens((prev) => prev.filter((t) => t.id !== current.id));
      }
    },
    [resolveCellAt],
  );

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Pinch-zoom/pan: only ever acts once a *second* pointer joins one
  // already down on the board — a lone finger is left entirely alone
  // here, so this can't interfere with dragging a piece with one hand.
  const handlePinchPointerMove = useCallback((e: PointerEvent) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointersRef.current.size !== 2) return;
    const baseline = pinchBaselineRef.current;
    if (!baseline) return;

    const pts = [...activePointersRef.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (dist === 0) return;
    const midX = (pts[0].x + pts[1].x) / 2;
    const midY = (pts[0].y + pts[1].y) / 2;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, baseline.scale * (dist / baseline.dist)));

    setView((v) => {
      // Standard "zoom to point": find which content-space point is
      // currently under the pinch midpoint, then choose the pan that
      // keeps that same point under the midpoint at the new scale. Since
      // the midpoint itself is recomputed live from both fingers' actual
      // positions, this also naturally handles panning (dragging both
      // fingers together) in the same formula, not just pinching in place.
      const contentX = (midX - v.x) / v.scale;
      const contentY = (midY - v.y) / v.scale;
      return { scale: newScale, x: midX - contentX * newScale, y: midY - contentY * newScale };
    });
  }, []);

  const handlePinchPointerUp = useCallback((e: PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchBaselineRef.current = null;
    }
    if (activePointersRef.current.size === 0 && viewRef.current.scale <= MIN_SCALE) {
      // Fully zoomed back out — snap to a clean centered state instead
      // of leaving a leftover pan offset from wherever the gesture ended.
      setView(DEFAULT_VIEW);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePinchPointerMove);
    window.addEventListener("pointerup", handlePinchPointerUp);
    window.addEventListener("pointercancel", handlePinchPointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePinchPointerMove);
      window.removeEventListener("pointerup", handlePinchPointerUp);
      window.removeEventListener("pointercancel", handlePinchPointerUp);
    };
  }, [handlePinchPointerMove, handlePinchPointerUp]);

  // Mouse/trackpad zoom (PC has no pinch gesture) — scroll wheel over the
  // board zooms in/out, anchored at the cursor using the same "zoom to
  // point" math as the pinch handler above. Attached as a native
  // listener with {passive:false} rather than a React onWheel prop:
  // React registers its delegated wheel listener as passive by default
  // (matching the browser's own performance default), so
  // event.preventDefault() inside a React onWheel handler is silently
  // ignored and the page scrolls out from under the board anyway.
  useEffect(() => {
    const el = wrapElRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = Math.exp(-e.deltaY * 0.001);
      setView((v) => {
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * zoomFactor));
        if (newScale <= MIN_SCALE) return DEFAULT_VIEW;
        const contentX = (e.clientX - v.x) / v.scale;
        const contentY = (e.clientY - v.y) / v.scale;
        return { scale: newScale, x: e.clientX - contentX * newScale, y: e.clientY - contentY * newScale };
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Tracks every pointer that touches down anywhere on the board (not
  // just on pieces) purely to notice when a *second* one joins — this
  // is a plain bubbling React handler, so it fires for token/palette
  // pointerdowns too without interfering with their own handlers.
  const handleBoardPointerDown = (e: ReactPointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointersRef.current.size === 2) {
      const pts = [...activePointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchBaselineRef.current = { dist, scale: viewRef.current.scale };
    }
  };

  const startDragExisting = (token: PlacedToken, e: ReactPointerEvent) => {
    e.preventDefault();
    if (dragStateRef.current) return;
    const state: DragState = {
      kind: "existing",
      id: token.id,
      pieceId: token.pieceId,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
    dragStateRef.current = state;
    setDragRender(state);
  };

  // Starts immediately on pointerdown, same as startDragExisting — this
  // used to wait for a long-press first, to avoid fighting the palette
  // strip's own horizontal scroll, but that made a real drag routinely
  // misfire as "just scrolling" and get cancelled before it ever
  // started (see MOVE_THRESHOLD_PX's own comment for why). Swiping a
  // finger starting directly on a piece now always picks it up instead
  // of scrolling the strip.
  const startDragNew = (pieceId: string, e: ReactPointerEvent) => {
    e.preventDefault();
    if (dragStateRef.current) return;
    const state: DragState = {
      kind: "new",
      id: pieceId,
      pieceId,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
    dragStateRef.current = state;
    setDragRender(state);
  };

  const draggingPieceId = dragRender?.pieceId ?? null;
  const draggingExistingId = dragRender?.kind === "existing" ? dragRender.id : null;

  return (
    <div className="goa-board-inner">
      {/* One combined icon toolbar — this used to be two separate rows
          of text buttons (board controls, then layout controls), which
          ate a lot of vertical space above the board itself. */}
      <div className="goa-board-toolbar">
        <button
          type="button"
          className={`goa-board-icon-btn ${showHelp ? "active" : ""}`}
          onClick={() => setShowHelp((v) => !v)}
          aria-label={showHelp ? "Hide help" : "Show help"}
          aria-pressed={showHelp}
        >
          <HelpCircle size={16} />
        </button>
        <button
          type="button"
          className={`goa-board-icon-btn ${showGrid ? "active" : ""}`}
          onClick={() => setShowGrid((v) => !v)}
          aria-label={showGrid ? "Hide grid" : "Show grid"}
          aria-pressed={showGrid}
        >
          <Grid3x3 size={16} />
        </button>
        {view.scale > MIN_SCALE && (
          <button type="button" className="goa-board-icon-btn" onClick={() => setView(DEFAULT_VIEW)} aria-label="Reset zoom">
            <ZoomOut size={16} />
          </button>
        )}
        <button
          type="button"
          className="goa-board-icon-btn goa-board-icon-btn-danger"
          onClick={() => {
            // Nothing to lose, nothing to confirm.
            if (tokens.length === 0) return;
            if (window.confirm("Clear all pieces from the board? This can't be undone.")) setTokens([]);
          }}
          aria-label="Clear board"
        >
          <Trash2 size={16} />
        </button>

        <div className="goa-board-toolbar-divider" />

        <select
          className="goa-board-layout-select"
          value={selectedLayoutName}
          onChange={(e) => loadSelectedLayout(e.target.value)}
        >
          <option value="">Load layout…</option>
          <option value={DEFAULT_LAYOUT_NAME}>{DEFAULT_LAYOUT_NAME}</option>
          {savedLayouts.map((l) => (
            <option key={l.name} value={l.name}>
              {l.name}
            </option>
          ))}
        </select>
        <button type="button" className="goa-board-icon-btn" onClick={saveCurrentAsLayout} aria-label="Save current layout">
          <Save size={16} />
        </button>
        {/* Re-applies whichever layout is selected, discarding whatever's
            been moved around on the board since — selecting the same
            option again wouldn't re-fire onChange, so this is the only
            way back to it without picking a different layout first. */}
        {selectedLayoutName && (
          <button
            type="button"
            className="goa-board-icon-btn"
            onClick={() => loadSelectedLayout(selectedLayoutName)}
            aria-label="Reset to selected layout"
          >
            <RotateCcw size={16} />
          </button>
        )}
        {/* Not shown for the built-in default — that one isn't a saved
            layout and can't be deleted, only user-saved ones can. */}
        {selectedLayoutName && selectedLayoutName !== DEFAULT_LAYOUT_NAME && (
          <button
            type="button"
            className="goa-board-icon-btn goa-board-icon-btn-danger"
            onClick={deleteSelectedLayout}
            aria-label="Delete selected layout"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {showHelp && (
        <div className="goa-board-tip">
          <p className="goa-board-hint">
            Pinch or scroll to zoom the map. Drag a piece below onto the board. Drag a placed piece off the board to
            remove it.
          </p>
          <div className="goa-board-legend">
            {MINION_SHAPES.map((s) => (
              <span key={s.shape} className="goa-board-legend-item">
                <strong>{s.letter}</strong> {s.label.replace(" Minion", "")}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className="goa-board-wrap"
        ref={wrapElRef}
        style={{ aspectRatio: `${IMAGE_WIDTH} / ${IMAGE_HEIGHT}` }}
        onPointerDown={handleBoardPointerDown}
        onDoubleClick={() => setView(DEFAULT_VIEW)}
      >
        {/* The 2px gap from the wrap's own border lives here (inset: 2px
            in CSS) rather than as padding on .goa-board-wrap — the image
            below uses `fill` (position: absolute; inset: 0), which
            aligns to its containing block's padding-box edge regardless
            of that block's own padding value, so padding on the wrap
            wouldn't actually create a visible gap. */}
        <div
          className="goa-board-frame"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: "0 0" }}
        >
          <Image
            src={BOARD_IMAGE_SRC}
            alt="Guards of Atlantis II battle board"
            fill
            className="goa-board-bg-img"
            sizes="(max-width: 480px) 100vw, 480px"
            priority
          />
          {/* A second, independently-inset frame for the grid + tokens —
              same reasoning as goa-board-frame above (padding on the SVG
              itself wouldn't move the token overlay, which is a sibling,
              not a descendant, of the SVG), letting the grid be nudged
              relative to the photo without moving the photo itself. All
              of the board's coordinate math (hit-testing, token
              placement) is anchored to this frame. */}
          <div className="goa-board-grid-frame" ref={boardWrapRef}>
            {/* "none" stretches the grid non-uniformly to exactly fill
                this frame, instead of letterboxing to preserve regular
                hexes — the tradeoff that keeps the photo itself
                uncropped; see IMAGE_WIDTH/IMAGE_HEIGHT's own comment in
                lib/hexGrid.ts. */}
            <svg
              viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
              className="goa-board-svg"
              preserveAspectRatio="none"
              style={{ opacity: showGrid ? 1 : 0 }}
            >
              {ALL_CELLS.map(({ col, row }) => {
                const { x, y } = hexCenter(col, row);
                return <polygon key={`${col}-${row}`} points={hexPoints(x, y)} className="goa-board-hex" />;
              })}
            </svg>

            {tokens
              .filter((t) => t.id !== draggingExistingId)
              .map((t) => {
                if (!resolvePieceVisual(t.pieceId)) return null;
                const { x, y } = hexCenter(t.col, t.row);
                const ringColor = MINION_TEAMS.find((team) => team.team === t.team)?.color;
                return (
                  <div
                    key={t.id}
                    className="goa-board-token"
                    style={{ left: `${(x / BOARD_WIDTH) * 100}%`, top: `${(y / BOARD_HEIGHT) * 100}%` }}
                    onPointerDown={(e) => startDragExisting(t, e)}
                  >
                    <PieceThumb pieceId={t.pieceId} size={18} className="goa-board-token-img" ringColor={ringColor} />
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="goa-board-section-label"
        onClick={() => toggleSection("minions")}
        aria-expanded={openSections.minions}
      >
        <ChevronDown size={12} className={`goa-board-section-chevron ${openSections.minions ? "" : "collapsed"}`} />
        Minions
      </button>
      {openSections.minions && (
        <div className="goa-board-palette">
          {/* Titans minions, then Atlantis minions, separated by a thin
              divider. */}
          {MINION_TYPES_BY_TEAM.map(({ team, pieces }, i) => (
            <Fragment key={team}>
              {i > 0 && <div className="goa-board-palette-divider" />}
              <div className="goa-board-palette-group">
                {pieces.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`goa-board-palette-item ${draggingPieceId === m.id && dragRender?.kind === "new" ? "active" : ""}`}
                    onPointerDown={(e) => startDragNew(m.id, e)}
                  >
                    <PieceThumb pieceId={m.id} size={32} />
                  </button>
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      )}

      <button
        type="button"
        className="goa-board-section-label"
        onClick={() => toggleSection("heroes")}
        aria-expanded={openSections.heroes}
      >
        <ChevronDown size={12} className={`goa-board-section-chevron ${openSections.heroes ? "" : "collapsed"}`} />
        Heroes
      </button>
      {openSections.heroes && (
        <>
          <input
            type="text"
            className="goa-board-hero-search"
            placeholder="Search heroes…"
            value={heroSearch}
            onChange={(e) => setHeroSearch(e.target.value)}
          />
          <div className="goa-board-palette">
            {filteredHeroes.length === 0 ? (
              <p className="goa-board-hero-empty">No heroes match &quot;{heroSearch}&quot;</p>
            ) : (
              filteredHeroes.map((hero) => (
                <button
                  key={hero.id}
                  type="button"
                  className={`goa-board-palette-item ${draggingPieceId === hero.id && dragRender?.kind === "new" ? "active" : ""}`}
                  onPointerDown={(e) => startDragNew(hero.id, e)}
                >
                  <PieceThumb pieceId={hero.id} size={32} />
                </button>
              ))
            )}
          </div>
        </>
      )}

      <button
        type="button"
        className="goa-board-section-label"
        onClick={() => toggleSection("tokens")}
        aria-expanded={openSections.tokens}
      >
        <ChevronDown size={12} className={`goa-board-section-chevron ${openSections.tokens ? "" : "collapsed"}`} />
        Tokens
      </button>
      {openSections.tokens && (
        <div className="goa-board-palette">
          {GAME_TOKENS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`goa-board-palette-item ${draggingPieceId === g.id && dragRender?.kind === "new" ? "active" : ""}`}
              onPointerDown={(e) => startDragNew(g.id, e)}
            >
              <PieceThumb pieceId={g.id} size={32} />
            </button>
          ))}
        </div>
      )}

      {dragRender && resolvePieceVisual(dragRender.pieceId) && (
        <div className="goa-board-drag-ghost" style={{ left: dragRender.x, top: dragRender.y }}>
          <PieceThumb pieceId={dragRender.pieceId} size={36} />
        </div>
      )}

      {openHero &&
        (() => {
          const hero = HEROES.find((h) => h.id === openHero.heroId);
          if (!hero) return null;
          const cards = HERO_CARDS[openHero.heroId] ?? [];
          const placedTeam = tokens.find((t) => t.id === openHero.tokenId)?.team;
          return (
            <div className="goa-board-drawer">
              <div className="goa-board-drawer-header">
                <span className="goa-board-drawer-title">{hero.name}</span>
                <div className="goa-board-drawer-team-buttons">
                  {MINION_TEAMS.map((t) => (
                    <button
                      key={t.team}
                      type="button"
                      className={`goa-board-team-btn ${placedTeam === t.team ? "active" : ""}`}
                      style={{ "--team-color": t.color } as React.CSSProperties}
                      onClick={() =>
                        setTokens((prev) =>
                          prev.map((tok) =>
                            tok.id === openHero.tokenId
                              ? { ...tok, team: tok.team === t.team ? undefined : t.team }
                              : tok,
                          ),
                        )
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="goa-board-drawer-close"
                  onClick={() => setOpenHero(null)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="goa-board-drawer-cards">
                {cards.map((card, i) => (
                  <HeroActionCard key={i} heroId={openHero.heroId} card={card} className="goa-board-drawer-card" />
                ))}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
