"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { X, Trash2, Save, RotateCcw, Grid3x3, ZoomOut, HelpCircle, ChevronDown } from "lucide-react";
import { HEROES } from "@/lib/heroes";
import { HERO_CARDS } from "@/lib/heroCards";
import { HeroActionCard } from "@/components/HeroActionCard";
import { IMAGE_WIDTH, IMAGE_HEIGHT, BOARD_COLS, BOARD_ROWS, createHexGrid, coverScaleForRotation } from "@/lib/hexGrid";

// The board's own photo sits behind the grid as a plain background
// image; the hexes render as an outline-only overlay on top of it (see
// the SVG below) rather than solid terrain colors, so the real art shows
// through instead of being covered by it.

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
})).sort((a, b) => a.label.localeCompare(b.label));

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

// Pre-feature key — kept only so a board saved before multiple maps
// existed (everything back then was implicitly "Across the River")
// still loads once, via the migration fallback in loadMapData below.
const LEGACY_STORAGE_KEY = "goa-board-placements";
const LEGACY_LAYOUTS_STORAGE_KEY = "goa-board-layouts";
const MAP_STORAGE_KEY = "goa-board-selected-map";
const placementsKey = (mapId: string) => `goa-board-placements-${mapId}`;
const layoutsKey = (mapId: string) => `goa-board-layouts-${mapId}`;
// How far the pointer has to move before a press counts as a drag rather
// than a tap — shared by "tap a placed piece to remove it" and "tap a
// palette piece does nothing" below.
const MOVE_THRESHOLD_PX = 8;
// Touch-only: a palette item needs to be *held* this long before it's
// picked up for dragging — see startPendingPress's own comment for why
// (in short: a touch swipe starting directly on a palette item needs to
// still be able to scroll the strip, which an immediate drag prevented).
const LONG_PRESS_MS = 400;
// How far a touch can move during that hold before it's treated as a
// scroll swipe instead (cancelling the pending drag) — deliberately
// looser than MOVE_THRESHOLD_PX: a hold's own natural finger jitter
// needs more slack than a moving drag's tap-vs-drag distinction does, or
// genuine holds routinely misfire as scrolls before the timer even fires.
const PALETTE_CANCEL_THRESHOLD_PX = 12;

// Team is only ever meaningfully set on hero pieces (minions already
// bake it into which colored variant was placed) — optional and unset
// by default, assigned via the card drawer's team buttons.
type PlacedToken = { id: string; pieceId: string; col: number; row: number; team?: string };

type SavedLayout = { name: string; tokens: PlacedToken[] };
// A built-in entry in the "load layout" dropdown, alongside whatever the
// user has actually saved for the current map — not itself a
// SavedLayout (it isn't persisted and can't be deleted), just always
// available as a way back to that map's starting scenario. Named
// distinctly enough that a user's own saved layout is very unlikely to
// collide with it.
const DEFAULT_LAYOUT_NAME = "Start Layout";

// A starting scenario for Across the River — two skirmish clusters
// (top-middle and bottom-left grass regions) instead of a blank board
// on a first-ever visit, and reloadable at any time afterward via
// DEFAULT_LAYOUT_NAME in the layout dropdown.
const ACROSS_THE_RIVER_TOKENS: PlacedToken[] = [
  { id: "default-1", pieceId: "minion-heavy-titans", col: 13, row: 2 },
  { id: "default-2", pieceId: "minion-ranged-titans", col: 12, row: 2 },
  { id: "default-3", pieceId: "minion-heavy-atlantis", col: 15, row: 2 },
  { id: "default-4", pieceId: "minion-ranged-atlantis", col: 17, row: 3 },
  { id: "default-5", pieceId: "minion-melee-atlantis", col: 14, row: 4 },
  { id: "default-6", pieceId: "minion-melee-atlantis", col: 16, row: 1 },
  { id: "default-7", pieceId: "minion-heavy-atlantis", col: 8, row: 16 },
  { id: "default-8", pieceId: "minion-ranged-atlantis", col: 9, row: 16 },
  { id: "default-9", pieceId: "minion-melee-atlantis", col: 8, row: 14 },
  { id: "default-10", pieceId: "minion-melee-atlantis", col: 6, row: 17 },
  { id: "default-11", pieceId: "minion-heavy-titans", col: 6, row: 16 },
  { id: "default-12", pieceId: "minion-ranged-titans", col: 4, row: 15 },
  { id: "default-13", pieceId: "minion-melee-titans", col: 5, row: 17 },
  { id: "default-14", pieceId: "minion-melee-titans", col: 7, row: 14 },
  { id: "default-15", pieceId: "minion-melee-titans", col: 15, row: 1 },
  { id: "default-16", pieceId: "minion-melee-titans", col: 13, row: 4 },
];

// A starting scenario for Forgotten Island — mirrors Across the
// River's own approach (two clusters facing off), found by hand-placing
// pieces and exporting their positions via the (now-removed) temporary
// Export button.
const FORGOTTEN_ISLAND_TOKENS: PlacedToken[] = [
  { id: "default-1", pieceId: "minion-melee-titans", col: 16, row: 16 },
  { id: "default-2", pieceId: "minion-melee-titans", col: 17, row: 16 },
  { id: "default-3", pieceId: "minion-melee-titans", col: 15, row: 12 },
  { id: "default-4", pieceId: "minion-melee-titans", col: 19, row: 10 },
  { id: "default-5", pieceId: "minion-ranged-titans", col: 17, row: 13 },
  { id: "default-6", pieceId: "minion-heavy-titans", col: 16, row: 10 },
  { id: "default-7", pieceId: "minion-melee-atlantis", col: 14, row: 10 },
  { id: "default-8", pieceId: "minion-melee-atlantis", col: 15, row: 10 },
  { id: "default-9", pieceId: "minion-melee-atlantis", col: 16, row: 14 },
  { id: "default-10", pieceId: "minion-melee-atlantis", col: 12, row: 16 },
  { id: "default-11", pieceId: "minion-ranged-atlantis", col: 14, row: 13 },
  { id: "default-12", pieceId: "minion-heavy-atlantis", col: 15, row: 16 },
];

type MapDef = {
  id: string;
  label: string;
  image: string;
  defaultTokens: PlacedToken[];
  gridRotationDeg: number;
  gridCols: number;
  gridRows: number;
  // Nudges the grid's on-screen position, as a percentage of the frame's
  // own width/height, applied before the rotate/scale in HexBoard's
  // grid-rotate transform — lets a map's grid be centered on its terrain
  // rather than the photo's own frame. Percent, not raw px: the frame's
  // actual rendered size varies by screen (`.goa-board-wrap` is
  // `width: 100%; max-width: 480px`), so a fixed px offset tuned on one
  // screen represents a different (and visibly wrong) fraction of a
  // differently-sized one — percent stays correct at every size.
  gridOffsetX: number;
  gridOffsetY: number;
  // How much the grid+token layer is scaled up before being rotated by
  // gridRotationDeg, so the rotated layer still fully covers the square
  // frame instead of leaving its corners bare (see coverScaleForRotation
  // in lib/hexGrid.ts). A per-map field, not derived from gridRotationDeg
  // at render time, because gridCols/gridRows/gridOffsetX/Y were each
  // calibrated by eye against one specific scale value — re-deriving a
  // "tighter" scale from the angle alone would shrink the grid relative
  // to what those numbers actually mean. Across the River was never
  // part of any rotation calibration, so it keeps the untouched 1:1 fit
  // it always had.
  gridCoverScale: number;
};
const MAPS: MapDef[] = [
  {
    id: "across-the-river",
    label: "Across the River",
    image: "/board/across-the-river.webp",
    defaultTokens: ACROSS_THE_RIVER_TOKENS,
    gridRotationDeg: 0,
    gridCols: BOARD_COLS,
    gridRows: BOARD_ROWS,
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridCoverScale: 1,
  },
  {
    id: "forgotten-island",
    label: "Forgotten Island",
    image: "/board/forgotten-island.webp",
    defaultTokens: FORGOTTEN_ISLAND_TOKENS,
    // This map's own terrain runs at an angle to the photo's edges and
    // is a differently-sized grid than Across the River's — found by
    // eye via the (now-removed) live-calibration debug panel, which
    // rendered every angle at the worst-case (45°) cover scale to avoid
    // the grid visibly resizing while the angle slider was dragged — see
    // gridCoverScale's own comment above.
    gridRotationDeg: 15,
    gridCols: 31,
    gridRows: 27,
    // Converted from the raw px values (-9, 1) the offset was originally
    // tuned as, using the wrap's own max-width (480px) as the basis —
    // see gridOffsetX/Y's own comment on why percent replaced px.
    gridOffsetX: (-9 / 480) * 100,
    gridOffsetY: (1 / 480) * 100,
    gridCoverScale: coverScaleForRotation(45, IMAGE_WIDTH / IMAGE_HEIGHT),
  },
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

// The frame is flush with the wrap's padding box (`.goa-board-frame`
// is `inset: 0`), but `.goa-board-wrap` still has its own
// `border: 1px solid` — and getBoundingClientRect() on the wrap
// measures its border box (the outer edge, border included), not its
// padding box (where the frame actually sits, one border-width in on
// every side). Left unaccounted for, that 1px mismatch is invisible at
// rest but grows with scale, showing up as a real gap once zoomed in
// and panned to an edge — matches wrap's own `border-width` in
// globals.css.
const FRAME_INSET_PX = 1;

// Keeps the pan offset from ever revealing empty space past the map's
// edge. The frame sits at wrap-local (FRAME_INSET_PX, FRAME_INSET_PX)
// with its own size `rect.width/height - 2*FRAME_INSET_PX`; a local
// point p in the frame renders at FRAME_INSET_PX + scale*p + translate,
// so for the frame's far edge to still reach the wrap's far edge, and
// its near edge to not overshoot past the wrap's near edge, translate
// must stay within [wrap - inset - frame*scale, -inset] on each axis.
function clampView(view: ViewTransform, rect: { width: number; height: number }): ViewTransform {
  if (view.scale <= MIN_SCALE || rect.width === 0 || rect.height === 0) {
    return { ...view, x: 0, y: 0 };
  }
  const frameW = rect.width - FRAME_INSET_PX * 2;
  const frameH = rect.height - FRAME_INSET_PX * 2;
  const maxX = -FRAME_INSET_PX;
  const maxY = -FRAME_INSET_PX;
  const minX = rect.width - FRAME_INSET_PX - frameW * view.scale;
  const minY = rect.height - FRAME_INSET_PX - frameH * view.scale;
  return { ...view, x: Math.min(maxX, Math.max(minX, view.x)), y: Math.min(maxY, Math.max(minY, view.y)) };
}

export function HexBoard() {
  const [selectedMapId, setSelectedMapId] = useState(MAPS[0].id);
  const currentMap = MAPS.find((m) => m.id === selectedMapId) ?? MAPS[0];

  // The grid's own coordinate math never rotates (see coverScaleForRotation's
  // own comment for why) — only its size varies per map. Memoized since
  // createHexGrid does a full pass over every cell to compute its bounds.
  const grid = useMemo(
    () => createHexGrid(currentMap.gridCols, currentMap.gridRows),
    [currentMap.gridCols, currentMap.gridRows],
  );
  // Per-map — see MapDef's own comment on gridCoverScale for why this
  // isn't derived from gridRotationDeg here instead.
  const gridCoverScale = currentMap.gridCoverScale;
  const [tokens, setTokens] = useState<PlacedToken[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dragRender, setDragRender] = useState<DragState | null>(null);
  // Purely visual — hiding the grid still leaves it functional (pieces
  // still snap to the same hexes), it just stops drawing the outline so
  // the photo can be seen clean. Off by default so the board reads as
  // the photo first; "Show Grid" is right there for precise placement.
  const [showGrid, setShowGrid] = useState(false);
  const [heroSearch, setHeroSearch] = useState("");
  const filteredHeroes = HEROES.filter((h) => h.name.toLowerCase().includes(heroSearch.trim().toLowerCase())).sort(
    (a, b) => a.name.localeCompare(b.name),
  );
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
  const [selectedLayoutName, setSelectedLayoutName] = useState(DEFAULT_LAYOUT_NAME);
  // Off by default — a tap-to-reveal tip instead of permanent on-page
  // text, since it's mainly useful the first few visits.
  const [showHelp, setShowHelp] = useState(false);
  // Each palette section can be collapsed independently, to cut down how
  // much scrolling three separate rows (Minions/Tokens/Heroes, the last
  // with 32 items) demands when you only need one of them right now.
  // Expanded by default so a first-time visit doesn't hide the palette
  // entirely — collapsing is an opt-in decluttering step, not the
  // default state.
  const [openSections, setOpenSections] = useState({ minions: false, tokens: false, heroes: false });
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
  const panStateRef = useRef<{ pointerId: number; startX: number; startY: number; viewX: number; viewY: number } | null>(
    null,
  );
  const pendingPressRef = useRef<{
    pieceId: string;
    pointerId: number;
    startX: number;
    startY: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Loads everything for one map — its live board, its saved layouts,
  // and resets the selected-layout dropdown back to DEFAULT_LAYOUT_NAME
  // (that dropdown's other options are map-specific, so a name selected
  // for the old map likely doesn't exist for the new one). Used both on
  // first mount and whenever the
  // user switches maps below. A first-ever visit to a given map starts
  // from that map's own defaultTokens instead of a blank board; anything
  // actually saved for it — including an intentionally-cleared empty
  // board — always wins over that from then on. Across the River also
  // falls back to the flat pre-multi-map keys so a board saved before
  // this feature existed isn't silently lost.
  const loadMapData = useCallback((mapId: string) => {
    const map = MAPS.find((m) => m.id === mapId) ?? MAPS[0];
    const isLegacyMap = mapId === MAPS[0].id;
    try {
      const raw = localStorage.getItem(placementsKey(mapId)) ?? (isLegacyMap ? localStorage.getItem(LEGACY_STORAGE_KEY) : null);
      setTokens(raw ? JSON.parse(raw) : map.defaultTokens.map((t) => ({ ...t })));
    } catch {
      // Private browsing / storage disabled — still start from the
      // default scenario for this session, same as a first-ever visit.
      setTokens(map.defaultTokens.map((t) => ({ ...t })));
    }
    try {
      const raw = localStorage.getItem(layoutsKey(mapId)) ?? (isLegacyMap ? localStorage.getItem(LEGACY_LAYOUTS_STORAGE_KEY) : null);
      setSavedLayouts(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedLayouts([]);
    }
    setSelectedLayoutName(DEFAULT_LAYOUT_NAME);
  }, []);

  useEffect(() => {
    let mapId = MAPS[0].id;
    try {
      const saved = localStorage.getItem(MAP_STORAGE_KEY);
      if (saved && MAPS.some((m) => m.id === saved)) mapId = saved;
    } catch {
      // Private browsing / storage disabled — fall back to the first map.
    }
    setSelectedMapId(mapId);
    loadMapData(mapId);
    setLoaded(true);
    setLayoutsLoaded(true);
    // Deliberately mount-only — switchMap (not this effect) handles
    // every subsequent map change, since it also needs to persist the
    // choice and reset the view, not just reload data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMap = (mapId: string) => {
    if (mapId === selectedMapId) return;
    setSelectedMapId(mapId);
    try {
      localStorage.setItem(MAP_STORAGE_KEY, mapId);
    } catch {
      // Nothing to do if storage isn't available.
    }
    loadMapData(mapId);
    setView(DEFAULT_VIEW);
  };

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(placementsKey(selectedMapId), JSON.stringify(tokens));
    } catch {
      // Nothing to do if storage isn't available — the board still
      // works for the rest of this session, it just won't persist.
    }
  }, [tokens, loaded, selectedMapId]);

  useEffect(() => {
    if (!layoutsLoaded) return;
    try {
      localStorage.setItem(layoutsKey(selectedMapId), JSON.stringify(savedLayouts));
    } catch {
      // Nothing to do if storage isn't available.
    }
  }, [savedLayouts, layoutsLoaded, selectedMapId]);

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
      setTokens(currentMap.defaultTokens.map((t) => ({ ...t })));
      return;
    }
    const layout = savedLayouts.find((l) => l.name === name);
    if (layout) setTokens(layout.tokens.map((t) => ({ ...t })));
  };

  const deleteSelectedLayout = () => {
    if (!selectedLayoutName || selectedLayoutName === DEFAULT_LAYOUT_NAME) return;
    if (!window.confirm(`Delete saved layout "${selectedLayoutName}"?`)) return;
    setSavedLayouts((prev) => prev.filter((l) => l.name !== selectedLayoutName));
    setSelectedLayoutName(DEFAULT_LAYOUT_NAME);
  };

  const resolveCellAt = useCallback((clientX: number, clientY: number) => {
    const wrap = boardWrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }
    // Position within the frame, in the grid's own (unrotated) board
    // units — the frame itself never rotates, only the visual grid+token
    // layer inside it does (see coverScaleForRotation's own comment), so
    // that translate+rotate+scale has to be undone here to get back to
    // plain grid coordinates for nearestCell.
    const frameX = ((clientX - rect.left) / rect.width) * grid.boardWidth;
    const frameY = ((clientY - rect.top) / rect.height) * grid.boardHeight;
    // gridOffsetX/Y are a percentage of the frame's width/height, which
    // — since the frame's own grid-space extent (boardWidth/boardHeight)
    // is stretched linearly onto it — converts directly to the same
    // percentage of boardWidth/boardHeight, with no separate px-based
    // ratio needed (that's the resolution-independence this unit choice
    // is for; see gridOffsetX/Y's own comment). Undone first since the
    // forward transform is `translate(...) rotate(...) scale(...)` —
    // translate is applied last there, so it's undone first here.
    const offsetX = (currentMap.gridOffsetX / 100) * grid.boardWidth;
    const offsetY = (currentMap.gridOffsetY / 100) * grid.boardHeight;
    const cx = grid.boardWidth / 2;
    const cy = grid.boardHeight / 2;
    const dx = (frameX - offsetX - cx) / gridCoverScale;
    const dy = (frameY - offsetY - cy) / gridCoverScale;
    const rad = (-currentMap.gridRotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const localX = cx + dx * cos - dy * sin;
    const localY = cy + dx * sin + dy * cos;
    return grid.nearestCell(localX, localY);
  }, [grid, gridCoverScale, currentMap.gridRotationDeg, currentMap.gridOffsetX, currentMap.gridOffsetY]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const current = dragStateRef.current;
    if (!current) return;
    // A drag that began via startPendingPress's long-press never called
    // preventDefault on its own pointerdown (needed to leave a swipe
    // free to scroll the palette strip instead) — once movement starts
    // for real, this stops the browser from still claiming it as that
    // same native scroll.
    e.preventDefault();
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
      const next = { scale: newScale, x: midX - contentX * newScale, y: midY - contentY * newScale };
      const rect = wrapElRef.current?.getBoundingClientRect();
      return rect ? clampView(next, rect) : next;
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
        const next = { scale: newScale, x: e.clientX - contentX * newScale, y: e.clientY - contentY * newScale };
        return clampView(next, el.getBoundingClientRect());
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // iOS Safari's own two-finger pinch is a legacy, non-standard
  // "Gesture Event" that can activate independently of a touch-action
  // CSS value — `.goa-board-wrap`'s `touch-action: none` stops it in
  // most cases, but not reliably on every iOS version, and when it does
  // fire it zooms the whole page instead of reaching the board's own
  // pointer-event-based pinch/pan handling above. Suppressed outright
  // here as a defensive backstop; harmless (a no-op) on every other
  // browser, which never dispatches these events at all.
  useEffect(() => {
    const el = wrapElRef.current;
    if (!el) return;
    const suppressGesture = (e: Event) => e.preventDefault();
    el.addEventListener("gesturestart", suppressGesture);
    el.addEventListener("gesturechange", suppressGesture);
    el.addEventListener("gestureend", suppressGesture);
    return () => {
      el.removeEventListener("gesturestart", suppressGesture);
      el.removeEventListener("gesturechange", suppressGesture);
      el.removeEventListener("gestureend", suppressGesture);
    };
  }, []);

  // Single-finger/mouse pan when zoomed in — a separate gesture from
  // both piece-dragging and pinch-zoom above, so it only ever starts
  // when neither of those has already claimed the pointer (see
  // handleBoardPointerDown below).
  const handlePanPointerMove = useCallback((e: PointerEvent) => {
    const pan = panStateRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    const rect = wrapElRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = { scale: viewRef.current.scale, x: pan.viewX + (e.clientX - pan.startX), y: pan.viewY + (e.clientY - pan.startY) };
    setView(clampView(next, rect));
  }, []);

  const handlePanPointerUp = useCallback((e: PointerEvent) => {
    if (panStateRef.current?.pointerId === e.pointerId) panStateRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePanPointerMove);
    window.addEventListener("pointerup", handlePanPointerUp);
    window.addEventListener("pointercancel", handlePanPointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePanPointerMove);
      window.removeEventListener("pointerup", handlePanPointerUp);
      window.removeEventListener("pointercancel", handlePanPointerUp);
    };
  }, [handlePanPointerMove, handlePanPointerUp]);

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
      // A second finger joining means this is a pinch, not a pan.
      panStateRef.current = null;
      return;
    }
    // A lone pointer starts a pan only when zoomed in and it wasn't
    // already claimed by a piece drag — startDragExisting runs first
    // (it's the deeper element, so its handler fires before this one
    // during bubbling) and sets dragStateRef before this check runs.
    if (activePointersRef.current.size === 1 && !dragStateRef.current && viewRef.current.scale > MIN_SCALE) {
      panStateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        viewX: viewRef.current.x,
        viewY: viewRef.current.y,
      };
    }
  };

  const startDragExisting = (token: PlacedToken, e: ReactPointerEvent) => {
    if (dragStateRef.current) return;
    // Another pointer is already down elsewhere on the board — this one
    // is (or is about to become) the second finger of a pinch/pan
    // gesture, not a pickup. Without this, a second finger landing on a
    // piece would both start dragging it *and* register as the pinch's
    // second finger, and the two fought over the same view/token state
    // (this is also why two-finger panning could stop working — the
    // pinch handler was never getting an uncontested gesture).
    if (activePointersRef.current.size >= 1) return;
    e.preventDefault();
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

  // Picks a palette piece up for dragging — called either immediately
  // (mouse/pen, from startPendingPress) or once a touch's long-press
  // timer fires (see startPendingPress's own comment).
  const startDragNew = useCallback((pieceId: string, clientX: number, clientY: number) => {
    if (dragStateRef.current) return;
    const state: DragState = {
      kind: "new",
      id: pieceId,
      pieceId,
      startX: clientX,
      startY: clientY,
      x: clientX,
      y: clientY,
      moved: false,
    };
    dragStateRef.current = state;
    setDragRender(state);
  }, []);

  const cancelPendingPress = useCallback(() => {
    const pending = pendingPressRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingPressRef.current = null;
  }, []);

  // A touch starting directly on a palette item is ambiguous — it might
  // be the start of a drag, or it might be a swipe meant to scroll the
  // (horizontally-overflowing) palette strip. Immediately starting a
  // drag on every touch (tried first) made scrolling the strip
  // impossible; waiting for a long-press before committing to a drag
  // lets a swipe still scroll normally, at the cost of needing to hold
  // briefly to actually pick a piece up. Mouse/pen has no such ambiguity
  // (there's no swipe-to-scroll gesture to protect), so those still
  // start dragging immediately, same as before.
  const startPendingPress = (pieceId: string, e: ReactPointerEvent) => {
    if (dragStateRef.current) return;
    // A finger already down on the board (see startDragExisting's own
    // comment) means this second touch is part of a pinch/pan gesture,
    // not a pickup — even if it happens to land on a palette item.
    if (activePointersRef.current.size >= 1) return;
    if (e.pointerType !== "touch") {
      e.preventDefault();
      startDragNew(pieceId, e.clientX, e.clientY);
      return;
    }
    if (pendingPressRef.current) return;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    const timer = setTimeout(() => {
      if (pendingPressRef.current?.pointerId !== pointerId) return;
      pendingPressRef.current = null;
      startDragNew(pieceId, startX, startY);
    }, LONG_PRESS_MS);
    pendingPressRef.current = { pieceId, pointerId, startX, startY, timer };
  };

  const handlePendingPressMove = useCallback(
    (e: PointerEvent) => {
      const pending = pendingPressRef.current;
      if (!pending || pending.pointerId !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
      // Real movement before the hold completed — this is the palette
      // strip's own scroll gesture, not a drag; leave it alone (no
      // preventDefault anywhere in this flow) so the browser keeps
      // scrolling it natively.
      if (moved > PALETTE_CANCEL_THRESHOLD_PX) cancelPendingPress();
    },
    [cancelPendingPress],
  );

  const handlePendingPressUp = useCallback(
    (e: PointerEvent) => {
      const pending = pendingPressRef.current;
      if (!pending || pending.pointerId !== e.pointerId) return;
      // Released before the hold completed — a plain tap, does nothing.
      cancelPendingPress();
    },
    [cancelPendingPress],
  );

  useEffect(() => {
    window.addEventListener("pointermove", handlePendingPressMove);
    window.addEventListener("pointerup", handlePendingPressUp);
    window.addEventListener("pointercancel", handlePendingPressUp);
    return () => {
      window.removeEventListener("pointermove", handlePendingPressMove);
      window.removeEventListener("pointerup", handlePendingPressUp);
      window.removeEventListener("pointercancel", handlePendingPressUp);
      // Otherwise a still-pending long-press timer would fire after
      // unmount and try to start a drag on a component that's gone.
      cancelPendingPress();
    };
  }, [handlePendingPressMove, handlePendingPressUp, cancelPendingPress]);

  const draggingPieceId = dragRender?.pieceId ?? null;
  const draggingExistingId = dragRender?.kind === "existing" ? dragRender.id : null;

  return (
    <div className="goa-board-inner">
      {/* Its own row — kept apart from the icon toolbar below (rather
          than just another flex-wrap item there) so which map is active
          always reads as a distinct, full-width choice instead of
          competing for space with the board's own controls. */}
      <div className="goa-board-map-row">
        <select
          className="goa-board-layout-select"
          value={selectedMapId}
          onChange={(e) => switchMap(e.target.value)}
          aria-label="Select map"
        >
          {MAPS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

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
        <button
          type="button"
          className="goa-board-icon-btn"
          onClick={() => loadSelectedLayout(selectedLayoutName)}
          aria-label="Reset to selected layout"
        >
          <RotateCcw size={16} />
        </button>
        {/* Not shown for the built-in default — that one isn't a saved
            layout and can't be deleted, only user-saved ones can. */}
        {selectedLayoutName !== DEFAULT_LAYOUT_NAME && (
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
        {/* Sized/positioned via .goa-board-frame's own `inset: 0` rather
            than padding on .goa-board-wrap — the image below uses
            `fill`, which ignores a parent's padding value for its own
            inset. */}
        <div
          className="goa-board-frame"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: "0 0" }}
        >
          <Image
            key={currentMap.id}
            src={currentMap.image}
            alt={`Guards of Atlantis II battle board — ${currentMap.label}`}
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
            {/* Carries the map's own grid angle (MapDef's gridRotationDeg)
                as a plain CSS rotate — scaled up first by gridCoverScale
                so the rotated layer still fully covers this frame instead
                of leaving its corners bare; see coverScaleForRotation's
                own comment in lib/hexGrid.ts for why rotation lives here
                and not in the grid's own coordinate math. Sized to fill
                the frame exactly before that transform, so it rotates
                around the frame's own center. The leading translate
                (MapDef's gridOffsetX/Y) is applied first in the list so
                it shifts the already-rotated-and-scaled layer by a plain
                on-screen amount, not affected by the rotation/scale that
                follow it — lets a map's grid be centered on its terrain
                rather than the photo's own frame. */}
            <div
              className="goa-board-grid-rotate"
              style={{
                transform: `translate(${currentMap.gridOffsetX}%, ${currentMap.gridOffsetY}%) rotate(${currentMap.gridRotationDeg}deg) scale(${gridCoverScale})`,
              }}
            >
              {/* "none" stretches the grid non-uniformly to exactly fill
                  this frame, instead of letterboxing to preserve regular
                  hexes — the tradeoff that keeps the photo itself
                  uncropped; see IMAGE_WIDTH/IMAGE_HEIGHT's own comment in
                  lib/hexGrid.ts. */}
              <svg
                viewBox={`0 0 ${grid.boardWidth} ${grid.boardHeight}`}
                className="goa-board-svg"
                preserveAspectRatio="none"
                style={{ opacity: showGrid ? 1 : 0 }}
              >
                {grid.allCells.map(({ col, row }) => {
                  const { x, y } = grid.hexCenter(col, row);
                  return <polygon key={`${col}-${row}`} points={grid.hexPoints(x, y)} className="goa-board-hex" />;
                })}
              </svg>

              {tokens
                .filter((t) => t.id !== draggingExistingId)
                .map((t) => {
                  if (!resolvePieceVisual(t.pieceId)) return null;
                  const { x, y } = grid.hexCenter(t.col, t.row);
                  const ringColor = MINION_TEAMS.find((team) => team.team === t.team)?.color;
                  return (
                    <div
                      key={t.id}
                      className="goa-board-token"
                      style={{
                        left: `${(x / grid.boardWidth) * 100}%`,
                        top: `${(y / grid.boardHeight) * 100}%`,
                        // Cancels the parent's rotate+scale for this
                        // token's own artwork — its *position* should
                        // follow the angled grid, but a hero portrait or
                        // minion badge shouldn't itself appear tilted.
                        transform: `translate(-50%, -50%) rotate(${-currentMap.gridRotationDeg}deg) scale(${1 / gridCoverScale})`,
                      }}
                      onPointerDown={(e) => startDragExisting(t, e)}
                    >
                      <PieceThumb pieceId={t.pieceId} size={15} className="goa-board-token-img" ringColor={ringColor} />
                    </div>
                  );
                })}
            </div>
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
                    onPointerDown={(e) => startPendingPress(m.id, e)}
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
                  onPointerDown={(e) => startPendingPress(hero.id, e)}
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
              onPointerDown={(e) => startPendingPress(g.id, e)}
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
