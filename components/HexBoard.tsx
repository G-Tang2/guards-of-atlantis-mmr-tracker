"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { HEROES } from "@/lib/heroes";
import { BOARD_WIDTH, BOARD_HEIGHT, IMAGE_WIDTH, IMAGE_HEIGHT, ALL_CELLS, hexCenter, hexPoints, nearestCell } from "@/lib/hexGrid";

// The board's own photo sits behind the grid as a plain background
// image; the hexes render as an outline-only overlay on top of it (see
// the SVG below) rather than solid terrain colors, so the real art shows
// through instead of being covered by it.
const BOARD_IMAGE_SRC = "/board/across-the-river.webp";

const STORAGE_KEY = "goa-board-placements";
// How far the pointer has to move before a press counts as a drag rather
// than a tap — shared by both the "tap a placed piece to remove it" and
// "quick tap on the palette does nothing" behaviors below.
const MOVE_THRESHOLD_PX = 8;
// Palette items sit inside a horizontally scrollable strip, so a plain
// immediate drag (like board tokens get) would fight a real scroll
// swipe — a long-press first commits to "this is a drag, not a scroll,"
// the same trick most mobile home screens use for reordering icons.
const LONG_PRESS_MS = 180;

type PlacedToken = { id: string; heroId: string; col: number; row: number };

type DragState = {
  kind: "existing" | "new";
  id: string;
  heroId: string;
  // Fixed for the life of the drag — `moved` is measured from here, not
  // from the previous frame's x/y (see handlePointerMove's own comment).
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
};

type PendingPress = {
  kind: "existing" | "new";
  id: string;
  heroId: string;
  startX: number;
  startY: number;
  timer: ReturnType<typeof setTimeout>;
};

let idCounter = 0;
function makeTokenId(): string {
  idCounter += 1;
  return `t${Date.now()}_${idCounter}`;
}

export function HexBoard() {
  const [tokens, setTokens] = useState<PlacedToken[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dragRender, setDragRender] = useState<DragState | null>(null);
  // Purely visual — hiding the grid still leaves it functional (pieces
  // still snap to the same hexes), it just stops drawing the outline so
  // the photo can be seen clean.
  const [showGrid, setShowGrid] = useState(true);

  const boardWrapRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const pendingRef = useRef<PendingPress | null>(null);

  // Load once on mount, then persist on every change after that — the
  // `loaded` guard keeps the very first render (before the load effect
  // below has run) from immediately overwriting whatever was already
  // saved with an empty array.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTokens(JSON.parse(raw));
    } catch {
      // Private browsing / storage disabled — start empty, same as a
      // first-ever visit.
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
    const pending = pendingRef.current;
    if (pending) {
      const dist = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
      if (dist > MOVE_THRESHOLD_PX) {
        // Moved before the long-press committed — treat it as a scroll
        // attempt on the palette strip and back off entirely, rather
        // than hijacking the gesture.
        clearTimeout(pending.timer);
        pendingRef.current = null;
      }
    }

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
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timer);
        pendingRef.current = null;
      }

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
            return [...prev, { id: makeTokenId(), heroId: current.heroId, col: cell.col, row: cell.row }];
          });
        }
        return;
      }

      // Existing board piece: a plain tap (no drag) removes it — the
      // simplest reliable "delete" gesture on mobile, where dragging a
      // piece cleanly off the board's own edge is fiddly to land.
      if (!current.moved) {
        setTokens((prev) => prev.filter((t) => t.id !== current.id));
      } else if (cell) {
        setTokens((prev) => {
          const occupied = prev.some((t) => t.col === cell.col && t.row === cell.row && t.id !== current.id);
          // Occupied by a different piece — reject the move and leave it
          // where it was, rather than letting two pieces share one hex.
          if (occupied) return prev;
          return prev.map((t) => (t.id === current.id ? { ...t, col: cell.col, row: cell.row } : t));
        });
      } else {
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

  // Board pieces aren't inside any scrolling container, so they can
  // start dragging immediately — no long-press needed, unlike the
  // palette below.
  const startDragExisting = (token: PlacedToken, e: ReactPointerEvent) => {
    e.preventDefault();
    if (dragStateRef.current || pendingRef.current) return;
    const state: DragState = {
      kind: "existing",
      id: token.id,
      heroId: token.heroId,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
    dragStateRef.current = state;
    setDragRender(state);
  };

  const startPressPalette = (heroId: string, e: ReactPointerEvent) => {
    if (dragStateRef.current || pendingRef.current) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const timer = setTimeout(() => {
      pendingRef.current = null;
      const state: DragState = { kind: "new", id: heroId, heroId, startX, startY, x: startX, y: startY, moved: false };
      dragStateRef.current = state;
      setDragRender(state);
    }, LONG_PRESS_MS);
    pendingRef.current = { kind: "new", id: heroId, heroId, startX, startY, timer };
  };

  const draggingHeroId = dragRender?.heroId ?? null;
  const draggingExistingId = dragRender?.kind === "existing" ? dragRender.id : null;

  return (
    <div className="goa-board-inner">
      <div className="goa-board-toolbar">
        <button type="button" className="goa-board-clear-btn" onClick={() => setShowGrid((v) => !v)}>
          {showGrid ? "Hide Grid" : "Show Grid"}
        </button>
        <button type="button" className="goa-board-clear-btn" onClick={() => setTokens([])}>
          Clear Board
        </button>
      </div>

      <div className="goa-board-wrap" style={{ aspectRatio: `${IMAGE_WIDTH} / ${IMAGE_HEIGHT}` }}>
        {/* The 2px gap from the wrap's own border lives here (inset: 2px
            in CSS) rather than as padding on .goa-board-wrap — the image
            below uses `fill` (position: absolute; inset: 0), which
            aligns to its containing block's padding-box edge regardless
            of that block's own padding value, so padding on the wrap
            wouldn't actually create a visible gap. */}
        <div className="goa-board-frame">
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
                const hero = HEROES.find((h) => h.id === t.heroId);
                if (!hero) return null;
                const { x, y } = hexCenter(t.col, t.row);
                return (
                  <div
                    key={t.id}
                    className="goa-board-token"
                    style={{ left: `${(x / BOARD_WIDTH) * 100}%`, top: `${(y / BOARD_HEIGHT) * 100}%` }}
                    onPointerDown={(e) => startDragExisting(t, e)}
                  >
                    <Image src={hero.icon} alt={hero.name} width={18} height={18} className="goa-board-token-img" />
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <p className="goa-board-hint">Press and hold a hero below to drag them onto the board. Tap a placed hero to remove them.</p>

      <div className="goa-board-palette">
        {HEROES.map((hero) => (
          <button
            key={hero.id}
            type="button"
            className={`goa-board-palette-item ${draggingHeroId === hero.id && dragRender?.kind === "new" ? "active" : ""}`}
            onPointerDown={(e) => startPressPalette(hero.id, e)}
          >
            <Image src={hero.icon} alt={hero.name} width={32} height={32} />
          </button>
        ))}
      </div>

      {dragRender &&
        (() => {
          const hero = HEROES.find((h) => h.id === dragRender.heroId);
          if (!hero) return null;
          return (
            <div className="goa-board-drag-ghost" style={{ left: dragRender.x, top: dragRender.y }}>
              <Image src={hero.icon} alt={hero.name} width={36} height={36} />
            </div>
          );
        })()}
    </div>
  );
}
