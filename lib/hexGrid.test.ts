import { describe, expect, it } from "vitest";
import { hexCenter, nearestCell, ALL_CELLS, BOARD_COLS, BOARD_ROWS, BOARD_WIDTH, BOARD_HEIGHT, HEX_SIZE } from "./hexGrid";

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
