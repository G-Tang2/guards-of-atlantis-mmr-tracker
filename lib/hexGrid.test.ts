import { describe, expect, it } from "vitest";
import {
  hexCenter,
  nearestCell,
  ALL_CELLS,
  BOARD_COLS,
  BOARD_ROWS,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  HEX_SIZE,
  createHexGrid,
  coverScaleForRotation,
} from "./hexGrid";

describe("ALL_CELLS", () => {
  it("is a plain, uniform BOARD_COLS x BOARD_ROWS grid", () => {
    expect(ALL_CELLS).toHaveLength(BOARD_COLS * BOARD_ROWS);
  });
});

describe("hexCenter / board bounds", () => {
  it("keeps every cell center within the computed board bounds", () => {
    for (const { col, row } of ALL_CELLS) {
      const { x, y } = hexCenter(col, row);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(BOARD_WIDTH);
      expect(y).toBeLessThanOrEqual(BOARD_HEIGHT);
    }
  });

  it("increases x with column and offsets odd columns down half a row", () => {
    const a = hexCenter(0, 0);
    const b = hexCenter(1, 0);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.y).toBeGreaterThan(a.y);
  });

  it("works out to a 19.5-hex-tall board despite every column having the same 19 rows", () => {
    // The board is described as "22 x 19.5" — every column really does
    // have the same BOARD_ROWS (19) count; the ".5" is the odd-column
    // half-hex offset pushing the *board's* overall bottom edge down
    // past what the even columns alone would reach.
    const HEX_HEIGHT = HEX_SIZE * Math.sqrt(3);
    expect(BOARD_HEIGHT / HEX_HEIGHT).toBeCloseTo(19.5, 1);
  });
});

describe("nearestCell", () => {
  it("finds the exact cell when given its own center", () => {
    const target = hexCenter(10, 12);
    expect(nearestCell(target.x, target.y)).toEqual({ col: 10, row: 12 });
  });

  it("returns null far outside the grid", () => {
    expect(nearestCell(-500, -500)).toBeNull();
  });
});

describe("createHexGrid()", () => {
  it("matches the default free-standing exports exactly", () => {
    const grid = createHexGrid();
    expect(grid.boardWidth).toBeCloseTo(BOARD_WIDTH, 5);
    expect(grid.boardHeight).toBeCloseTo(BOARD_HEIGHT, 5);
    for (const { col, row } of ALL_CELLS) {
      const expected = hexCenter(col, row);
      const actual = grid.hexCenter(col, row);
      expect(actual.x).toBeCloseTo(expected.x, 5);
      expect(actual.y).toBeCloseTo(expected.y, 5);
    }
  });
});

describe("coverScaleForRotation", () => {
  it("is 1 at 0deg — no extra scale needed when there's no rotation", () => {
    expect(coverScaleForRotation(0)).toBeCloseTo(1, 10);
  });

  it("matches the standard |cos| + |sin| factor for a square frame", () => {
    const rad = (15 * Math.PI) / 180;
    expect(coverScaleForRotation(15, 1)).toBeCloseTo(Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)), 10);
  });

  it("is symmetric in rotation direction and in the 90deg period", () => {
    expect(coverScaleForRotation(15)).toBeCloseTo(coverScaleForRotation(-15), 10);
    expect(coverScaleForRotation(20)).toBeCloseTo(coverScaleForRotation(70), 10);
  });

  it("is always at least 1 — never shrinks the covering layer", () => {
    for (let deg = -180; deg <= 180; deg += 5) {
      expect(coverScaleForRotation(deg)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("createHexGrid with a custom size (Forgotten Island: 20 x 18)", () => {
  const grid = createHexGrid(20, 18);

  it("builds exactly cols x rows cells, not the default board's 22 x 19", () => {
    expect(grid.allCells).toHaveLength(20 * 18);
    expect(grid.cols).toBe(20);
    expect(grid.rows).toBe(18);
  });

  it("keeps the tiling intact at its own size — every cell's own center is still the nearest match to itself", () => {
    for (const { col, row } of grid.allCells) {
      const c = grid.hexCenter(col, row);
      expect(grid.nearestCell(c.x, c.y)).toEqual({ col, row });
    }
  });

  it("re-anchors bounds to (0, 0) for its own smaller board", () => {
    for (const { col, row } of grid.allCells) {
      const { x, y } = grid.hexCenter(col, row);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(grid.boardWidth);
      expect(y).toBeLessThanOrEqual(grid.boardHeight);
    }
  });
});
