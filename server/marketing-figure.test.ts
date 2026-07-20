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

  it("keeps the ring divided into the twenty-seven nakshatras", () => {
    const fig = SRC.match(/<figure class="yantra">([\s\S]*?)<\/figure>/)![1];
    const ticks = [...fig.matchAll(/<line /g)].length;
    // 27 ticks + the square's two diagonals.
    expect(ticks).toBe(29);
  });
});
