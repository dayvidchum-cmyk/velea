/**
 * The yantra in the true ring is a CONSTRUCTION, not a decoration: the square is
 * inscribed in the inner ring, so its four corners sit ON that circle. This test exists
 * because that is exactly what broke — a pass that shrank the square "so it could
 * breathe" left the corners floating inside the ring, and the figure stopped being a
 * chart. Looking at it was not enough; David caught what the eye had approved.
 *
 * Geometry is checkable, so it gets checked.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const SRC = fs.readFileSync(
  path.resolve(import.meta.dirname, "..", "client/public/marketing/system.html"),
  "utf8",
);

/** The <circle> radii inside the yantra figure, largest first. */
function ringRadii(): number[] {
  const fig = SRC.match(/<figure class="yantra">([\s\S]*?)<\/figure>/);
  expect(fig, "the yantra figure is gone from /system").toBeTruthy();
  const rs = [...fig![1].matchAll(/<circle[^>]*\br="([\d.]+)"/g)].map((m) => Number(m[1]));
  expect(rs.length, "expected the ring circles plus the centre dot").toBeGreaterThanOrEqual(3);
  return rs.sort((a, b) => b - a);
}

/** The inscribed square's points, as [x, y] pairs. */
function squarePoints(): number[][] {
  const fig = SRC.match(/<figure class="yantra">([\s\S]*?)<\/figure>/)![1];
  const poly = fig.match(/<polygon points="([^"]+)"/);
  expect(poly, "the square polygon is gone").toBeTruthy();
  const pts = poly![1].trim().split(/\s+/).map((p) => p.split(",").map(Number));
  expect(pts.length, "a square has four corners").toBe(4);
  return pts;
}

describe("the yantra in the true ring", () => {
  it("puts the square's corners ON the inner ring", () => {
    const [, inner] = ringRadii(); // [outer, inner, ...dot]
    const pts = squarePoints();
    const cx = pts.reduce((a, p) => a + p[0], 0) / 4;
    const cy = pts.reduce((a, p) => a + p[1], 0) / 4;
    for (const [x, y] of pts) {
      const d = Math.hypot(x - cx, y - cy);
      // Half a unit of a 400-unit viewBox — rounding in the emitted path, nothing more.
      expect(Math.abs(d - inner), `corner at ${x},${y} sits ${d.toFixed(2)} from centre, inner ring is ${inner}`)
        .toBeLessThan(0.5);
    }
  });

  /** The tick group (the ring) and the gold group (the chart), separately. */
  function groups() {
    const fig = SRC.match(/<figure class="yantra">([\s\S]*?)<\/figure>/)![1];
    const ring = fig.match(/<g stroke="rgba\(243,234,219,0\.5\)"[\s\S]*?<\/g>/)![0];
    const gold = fig.match(/<g fill="none" stroke="#C9A84C"[\s\S]*?<\/g>/)![0];
    const lines = (s: string) =>
      [...s.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)]
        .map((m) => m.slice(1).map(Number));
    return { ring: lines(ring), gold: lines(gold) };
  }

  it("keeps the ring divided into the twenty-seven nakshatras", () => {
    // COUNTED PER GROUP, not as one total (2026-07-20). The old version asserted 29 <line>
    // elements as "27 ticks + 2 diagonals" — and passed on a figure that had 25 ticks and 4
    // diagonals, because 25+4 is also 29. It hid two defects at once: a ring missing two
    // nakshatras while the figure's own title said twenty-seven, and the square's diagonals
    // drawn TWICE — short ones in gold, full-length ones left in the grey tick group, which is
    // why David saw the chart's lines rendered grey.
    // Count TICKS, not lines in the ring group. Counting lines still passed against the broken
    // figure, because 25 real ticks plus the 2 diagonals that had leaked into this group is also
    // 27. Twice now this number has been right for the wrong reason; a tick is a short radial
    // stroke, so that is what gets counted.
    const ticks = groups().ring.filter(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1) < 40);
    expect(ticks).toHaveLength(27);
  });

  it("draws the chart's diagonals in gold, once, corner to corner", () => {
    const { ring, gold } = groups();
    const pts = squarePoints();
    const cx = pts.reduce((a, p) => a + p[0], 0) / 4;
    const cy = pts.reduce((a, p) => a + p[1], 0) / 4;
    const isDiagonal = ([x1, y1, x2, y2]: number[]) => Math.hypot(x2 - x1, y2 - y1) > 200;

    // No chart line may hide in the ring's group — that is what made them grey.
    expect(ring.filter(isDiagonal), "a diagonal is drawn in the ring's grey stroke").toEqual([]);
    expect(gold.filter(isDiagonal), "the two diagonals belong to the gold chart").toHaveLength(2);

    // Corner to corner, not inset: each diagonal's ends sit on the square's corners.
    for (const [x1, y1, x2, y2] of gold.filter(isDiagonal)) {
      for (const [x, y] of [[x1, y1], [x2, y2]]) {
        const onCorner = pts.some(([px, py]) => Math.hypot(px - x, py - y) < 0.5);
        expect(onCorner, `diagonal end ${x},${y} is not on a corner of the square`).toBe(true);
      }
      expect(Math.hypot(x1 - cx, y1 - cy)).toBeGreaterThan(150); // reaches the ring, not inset
    }
  });

  it("starts the ticks ON the inner ring, so nothing crosses the square's corners", () => {
    // The corners sit at 158.96 and the inner ring is 159. The ticks used to run inward to 156
    // — three units INSIDE both — so they cut across the corners and the square read as
    // punching through the circle. It was never the square that overlapped; it was the ring.
    const [, inner] = ringRadii();
    const cx = 200, cy = 190;
    for (const [x1, y1, x2, y2] of groups().ring) {
      const near = Math.min(Math.hypot(x1 - cx, y1 - cy), Math.hypot(x2 - cx, y2 - cy));
      expect(near, `a tick reaches ${near.toFixed(1)} from centre, inside the ${inner} ring`)
        .toBeGreaterThanOrEqual(inner - 0.2);
    }
  });
});
