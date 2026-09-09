// Pure geometry + layout for the interactive battle board (app/board) —
// no React/DOM here, so it's cheap to unit test and reason about
// independent of rendering/drag concerns.
//
// The real board (see public/board/across-the-river.webp) is 22
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
// grid's own BOARD_WIDTH/BOARD_HEIGHT below, which comes out slightly
// taller than wide from the odd-column offset) is what the on-page
// board container is sized to, so the image is never cropped to fit a
// mismatched box. The SVG overlay is stretched (non-uniformly scaled)
// to match that same box instead — see the "none" preserveAspectRatio
// in components/HexBoard.tsx — trading perfectly regular hexes for
// guaranteed full coverage with no image cropping.
export const IMAGE_WIDTH = 900;
export const IMAGE_HEIGHT = 900;

const HEX_WIDTH = HEX_SIZE * 1.5;
const HEX_HEIGHT = HEX_SIZE * Math.sqrt(3);

export function hexCenter(col: number, row: number): { x: number; y: number } {
  const x = HEX_SIZE + col * HEX_WIDTH;
  const y = HEX_HEIGHT / 2 + row * HEX_HEIGHT + (col % 2 === 1 ? HEX_HEIGHT / 2 : 0);
  return { x, y };
}

export function hexPoints(cx: number, cy: number, size: number = HEX_SIZE): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    pts.push(`${(cx + size * Math.cos(angle)).toFixed(2)},${(cy + size * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(" ");
}

// Every cell on the board — a plain, uniform BOARD_COLS x BOARD_ROWS
// grid (see this module's own comment on why that still produces a
// 19.5-hex-tall board despite every column having the same row count).
export const ALL_CELLS: { col: number; row: number }[] = [];
for (let col = 0; col < BOARD_COLS; col++) {
  for (let row = 0; row < BOARD_ROWS; row++) {
    ALL_CELLS.push({ col, row });
  }
}

// Computed once at module load from every cell's actual center, rather
// than a hand-derived bounding-box formula (easy to get subtly wrong
// once the odd-column vertical offset is factored in).
function computeBounds(): { width: number; height: number } {
  let maxX = 0;
  let maxY = 0;
  for (const { col, row } of ALL_CELLS) {
    const { x, y } = hexCenter(col, row);
    maxX = Math.max(maxX, x + HEX_SIZE);
    maxY = Math.max(maxY, y + HEX_HEIGHT / 2);
  }
  return { width: maxX, height: maxY };
}

const bounds = computeBounds();
export const BOARD_WIDTH = bounds.width;
export const BOARD_HEIGHT = bounds.height;

// Finds the cell whose center is closest to (x, y) in board-space — used
// to snap a dropped piece to the nearest hex. Null when nothing is close
// enough to be a reasonable snap (e.g. dropped just inside the wrapping
// element's own unavoidable corner padding, past every real hex).
export function nearestCell(x: number, y: number): { col: number; row: number } | null {
  let best: { col: number; row: number } | null = null;
  let bestDist = Infinity;
  for (const { col, row } of ALL_CELLS) {
    const c = hexCenter(col, row);
    const dist = Math.hypot(c.x - x, c.y - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = { col, row };
    }
  }
  return best && bestDist <= HEX_SIZE * 1.3 ? best : null;
}
