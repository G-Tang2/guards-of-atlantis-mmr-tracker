// Pure geometry + layout for the interactive battle board (app/board) —
// no React/DOM here, so it's cheap to unit test and reason about
// independent of rendering/drag concerns.
//
// The real board (see public/board/across_the_river.webp) is 22
// (horizontal) x 19.5 (vertical) hexes — flat-top hexagons in "offset
// columns" (odd-q) layout, see Red Blob Games' hex grid reference for
// the standard formulas this follows. The ".5" isn't a per-column row
// count (every column has the same 19 rows) — it's the natural
// consequence of the odd-column offset below: an odd column's last hex
// sits half a hex-height further down than an even column's last hex,
// so the *board's* overall vertical extent works out to 19.5 hex-heights
// even though every individual column is 19 hexes tall (verified via
// computeBounds below: 19 rows/column -> ~19.5 * HEX_HEIGHT overall).
export const BOARD_COLS = 22;
export const BOARD_ROWS = 19;
export const HEX_SIZE = 27;

// The source photo's own pixel dimensions — its aspect ratio (not the
// grid's own board width/height below, which comes out slightly taller
// than wide from the odd-column offset) is what the on-page board
// container is sized to, so the image is never cropped to fit a
// mismatched box. The SVG overlay is stretched (non-uniformly scaled)
// to match that same box instead — see the "none" preserveAspectRatio
// in components/HexBoard.tsx — trading perfectly regular hexes for
// guaranteed full coverage with no image cropping.
export const IMAGE_WIDTH = 900;
export const IMAGE_HEIGHT = 900;

const HEX_WIDTH = HEX_SIZE * 1.5;
const HEX_HEIGHT = HEX_SIZE * Math.sqrt(3);

// Every cell on a BOARD_COLS x BOARD_ROWS board — a plain, uniform grid
// (see this module's own comment on why that still produces a
// 19.5-hex-tall board despite every column having the same row count).
// Kept as a free-standing export for call sites that only care about
// the default board's own topology; createHexGrid below builds its own
// per its `cols`/`rows`, since a map can use a different grid size.
export const ALL_CELLS: { col: number; row: number }[] = buildCells(BOARD_COLS, BOARD_ROWS);

function buildCells(cols: number, rows: number): { col: number; row: number }[] {
  const cells: { col: number; row: number }[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      cells.push({ col, row });
    }
  }
  return cells;
}

function rawHexCenter(col: number, row: number): { x: number; y: number } {
  const x = HEX_SIZE + col * HEX_WIDTH;
  const y = HEX_HEIGHT / 2 + row * HEX_HEIGHT + (col % 2 === 1 ? HEX_HEIGHT / 2 : 0);
  return { x, y };
}

export type HexGrid = {
  cols: number;
  rows: number;
  allCells: { col: number; row: number }[];
  boardWidth: number;
  boardHeight: number;
  hexCenter(col: number, row: number): { x: number; y: number };
  hexPoints(cx: number, cy: number, size?: number): string;
  nearestCell(x: number, y: number): { col: number; row: number } | null;
};

// Builds a full hex grid layout sized to `cols` x `rows` — used to give
// a map its own grid size (see MapDef's gridCols/gridRows in
// components/HexBoard.tsx) without duplicating any of the layout math
// per map. A map's own grid *angle* is a separate, purely visual
// concern — see coverScaleForRotation below for why it's applied as a
// CSS transform on the rendered layer instead of baked into this
// coordinate math.
export function createHexGrid(cols: number = BOARD_COLS, rows: number = BOARD_ROWS): HexGrid {
  const cells = cols === BOARD_COLS && rows === BOARD_ROWS ? ALL_CELLS : buildCells(cols, rows);

  // Bounds computed once from every hex's actual corners, then shifted
  // so the grid's own top-left corner lands on (0, 0).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { col, row } of cells) {
    const { x: cx, y: cy } = rawHexCenter(col, row);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      const px = cx + HEX_SIZE * Math.cos(angle);
      const py = cy + HEX_SIZE * Math.sin(angle);
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
  }
  const offsetX = -minX;
  const offsetY = -minY;

  function hexCenter(col: number, row: number): { x: number; y: number } {
    const c = rawHexCenter(col, row);
    return { x: c.x + offsetX, y: c.y + offsetY };
  }

  function hexPoints(cx: number, cy: number, size: number = HEX_SIZE): string {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      pts.push(`${(cx + size * Math.cos(angle)).toFixed(2)},${(cy + size * Math.sin(angle)).toFixed(2)}`);
    }
    return pts.join(" ");
  }

  // Finds the cell whose center is closest to (x, y) in this grid's own
  // board-space — used to snap a dropped piece to the nearest hex. Null
  // when nothing is close enough to be a reasonable snap (e.g. dropped
  // just inside the wrapping element's own unavoidable corner padding,
  // past every real hex).
  function nearestCell(x: number, y: number): { col: number; row: number } | null {
    let best: { col: number; row: number } | null = null;
    let bestDist = Infinity;
    for (const { col, row } of cells) {
      const c = hexCenter(col, row);
      const dist = Math.hypot(c.x - x, c.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = { col, row };
      }
    }
    return best && bestDist <= HEX_SIZE * 1.3 ? best : null;
  }

  return {
    cols,
    rows,
    allCells: cells,
    boardWidth: maxX - minX,
    boardHeight: maxY - minY,
    hexCenter,
    hexPoints,
    nearestCell,
  };
}

// The original, unrotated grid — kept as free-standing exports for call
// sites (and this module's own tests) that don't care about per-map
// grid size.
const defaultGrid = createHexGrid();
export const BOARD_WIDTH = defaultGrid.boardWidth;
export const BOARD_HEIGHT = defaultGrid.boardHeight;
export const hexCenter = defaultGrid.hexCenter;
export const hexPoints = defaultGrid.hexPoints;
export const nearestCell = defaultGrid.nearestCell;

// A map can angle its grid to match its own terrain (see MapDef's
// gridRotationDeg in components/HexBoard.tsx), applied as a plain CSS
// `rotate()` on the rendered grid+token layer rather than baked into
// the coordinate math above. Baking rotation into hexCenter/hexPoints
// was tried first and reverted: since the grid-space is stretched
// non-uniformly onto a fixed square frame (preserveAspectRatio="none"),
// re-anchoring a *rotated* grid's bounding box to that same frame left
// its corners uncovered — a rotated shape's axis-aligned bounding box is
// always bigger than the shape itself, so stretching that bigger box to
// fill the frame pulls the actual hexes back away from the frame's own
// corners, leaving gaps of bare background there.
//
// Rotating the already-square, already-fully-covering rendered layer in
// place has the opposite problem instead — the ROTATED layer's own
// footprint becomes smaller than the frame it must still fill (same
// "rotated rectangle vs. its bounding box" geometry, inverted) — fixed
// by scaling the layer up first by the standard rotate-to-cover factor
// this computes, so it still fully covers the frame post-rotation;
// `.goa-board-wrap`'s own `overflow: hidden` (see globals.css) clips
// whatever now spills past the frame's edges.
export function coverScaleForRotation(angleDeg: number, aspect: number = 1): number {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  // A `aspect` (width/height) by 1 rectangle, scaled by k and rotated by
  // angleDeg about its center, must still contain the unrotated
  // `aspect` by 1 frame — i.e. k*aspect >= aspect*cos + sin and
  // k >= aspect*sin + cos.
  return Math.max(cos + sin / aspect, cos + sin * aspect);
}
