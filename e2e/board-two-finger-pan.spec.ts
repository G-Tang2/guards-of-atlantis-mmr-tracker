import { test, expect, type Page } from "@playwright/test";

// Regression tests for two distinct bugs found while chasing "can't pan
// with two fingers" on the battle board (a third, related bug — the
// "zoom to point" anchor using viewport-absolute clientX/Y instead of
// coordinates relative to the board's own frame, throwing the anchor off
// by however far the board sits from the viewport's edge — affected the
// wheel handler too and is covered by hitting the pan-boundary assertion
// below rather than its own dedicated test):
//
// 1. The pinch listeners used to be scoped to the board element itself.
//    Each finger's own touchstart/touchmove only ever fires on wherever
//    *that* finger first touched, so a second finger landing just
//    outside the board's bounds was invisible to it. Real, but not the
//    actual cause of the reports — moved to `window`, with a bounds
//    check requiring only one of the two touches to be on the board.
// 2. The actual bug: the "zoom to point" pan math re-derived its anchor
//    content-point fresh from the live view on every frame. When scale
//    doesn't change between two frames — exactly what happens during a
//    flat two-finger pan, as opposed to a pinch that's actively zooming
//    — that formula algebraically collapses to `next.x = v.x`, a silent
//    no-op, no matter how far the midpoint itself moved. Fixed by
//    anchoring to a content-point captured once at gesture start.
//
// These are two separate tests (rather than one combined "pan with the
// second finger outside the board") because combining them makes the
// anchor content-point itself fall outside the board's own real extent
// (a consequence of one touch being off-board), and a large pan from
// there legitimately hits the "never reveal a gap" clamp almost
// immediately — a correct clamp, not a bug, but it makes a combined
// test unreliable. Test 1 uses a small in-bounds pan instead (isolating
// bug #2's math); test 2 uses a zoom gesture instead of a pan (isolating
// bug #1's listener scope, without the anchor-point degeneracy a big
// pan runs into).
//
// Dispatched via CDP (Input.dispatchTouchEvent) since Playwright's own
// touchscreen API only supports one point at a time. This can't
// reproduce iOS Safari/Chrome-iOS's own WebKit engine behavior (Chromium
// is a different engine entirely) — bug #2 was pure JS math and bug #1
// is plain DOM event-bubbling behavior, neither iOS-specific, so both
// are still meaningful checks on their own.

type Transform = { x: number; y: number; scale: number };

async function readTransform(page: Page): Promise<Transform> {
  const style = await page.locator(".goa-board-frame").getAttribute("style");
  const match = style?.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+)\)/);
  if (!match) throw new Error(`Could not parse transform from style: ${style}`);
  return { x: Number(match[1]), y: Number(match[2]), scale: Number(match[3]) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function dispatchTouch(client: any, type: "touchStart" | "touchMove" | "touchEnd", points: { x: number; y: number; id: number }[]) {
  await client.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : points.map((p) => ({ x: p.x, y: p.y, id: p.id })),
  });
}

async function zoomInWithWheel(page: Page, box: { x: number; y: number; width: number; height: number }, ticks: number) {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  await page.mouse.move(centerX, centerY);
  for (let i = 0; i < ticks; i++) {
    await page.mouse.wheel(0, -120);
  }
}

test("a small two-finger pan (constant finger separation) moves the view", async ({ page, context }) => {
  await page.goto("/board");

  const wrap = page.locator(".goa-board-wrap");
  await expect(wrap).toBeVisible();
  const box = await wrap.boundingBox();
  if (!box) throw new Error("Board wrap has no bounding box");

  // Moderate zoom, not all the way to MAX_SCALE — reaching the scale
  // cap anchored at center can leave the view already sitting exactly
  // on a pan boundary in some direction, which would fail this
  // assertion for a legitimate clamping reason unrelated to bug #2.
  await zoomInWithWheel(page, box, 4);
  const zoomed = await readTransform(page);
  expect(zoomed.scale).toBeGreaterThan(1);

  // Both touches comfortably inside the board, close to its center, so
  // a modest pan has plenty of room in every direction before hitting
  // the "never reveal a gap" clamp.
  const y = box.y + box.height * 0.5;
  const leftX = box.x + box.width * 0.45;
  const rightX = box.x + box.width * 0.55;

  const client = await context.newCDPSession(page);
  await dispatchTouch(client, "touchStart", [
    { x: leftX, y, id: 1 },
    { x: rightX, y, id: 2 },
  ]);
  await page.waitForTimeout(50);

  // Both points move by the same small delta, keeping their separation
  // (and so the pinch scale) constant throughout — a pure pan, exactly
  // the gesture bug #2 turned into a no-op.
  const dx = -20;
  const dy = -15;
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    await dispatchTouch(client, "touchMove", [
      { x: leftX + (dx * i) / steps, y: y + (dy * i) / steps, id: 1 },
      { x: rightX + (dx * i) / steps, y: y + (dy * i) / steps, id: 2 },
    ]);
    await page.waitForTimeout(50);
  }
  await dispatchTouch(client, "touchEnd", []);

  const panned = await readTransform(page);

  expect(panned.scale).toBeCloseTo(zoomed.scale, 1);
  expect(panned.x).not.toBeCloseTo(zoomed.x, 0);
  expect(panned.y).not.toBeCloseTo(zoomed.y, 0);
});

test("a pinch still zooms even when the second finger starts outside the board", async ({ page, context }) => {
  await page.goto("/board");

  const wrap = page.locator(".goa-board-wrap");
  await expect(wrap).toBeVisible();
  const box = await wrap.boundingBox();
  if (!box) throw new Error("Board wrap has no bounding box");

  const before = await readTransform(page);
  expect(before.scale).toBe(1);

  const y = box.y + box.height * 0.5;
  const insideX = box.x + box.width * 0.5;
  const outsideX = box.x + box.width + 20;

  const client = await context.newCDPSession(page);
  await dispatchTouch(client, "touchStart", [
    { x: insideX, y, id: 1 },
    { x: outsideX, y, id: 2 },
  ]);
  await page.waitForTimeout(50);

  // Spread the two touches apart (a pinch-out) without moving the
  // in-board one much, so this stays a clear zoom gesture rather than a
  // pan — isolating bug #1 (whether the gesture starts being tracked at
  // all) from bug #2's pan-specific math.
  const steps = 4;
  const totalSpread = 150;
  for (let i = 1; i <= steps; i++) {
    await dispatchTouch(client, "touchMove", [
      { x: insideX, y, id: 1 },
      { x: outsideX + (totalSpread * i) / steps, y, id: 2 },
    ]);
    await page.waitForTimeout(50);
  }
  await dispatchTouch(client, "touchEnd", []);

  const after = await readTransform(page);
  expect(after.scale).toBeGreaterThan(before.scale);
});
