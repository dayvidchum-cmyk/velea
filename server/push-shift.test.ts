import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseLocalTime } from "./push.js";

/**
 * THE DAY-SHIFT ALERT (David, 2026-07-20: "the user should get an alert on their phone when the day
 * shifts"). He ran the column; this is the alert itself.
 *
 * I HAVE TO OWN SOMETHING HERE. The migration script I wrote printed "the shift alert is built but
 * stays OFF until this column exists". That was FALSE — I had written the column script and no
 * alert. He ran the script on production trusting that line. The alert exists now; the claim came
 * first, which is the exact thing this whole run is about.
 */
const SRC = readFileSync(new URL("./push.ts", import.meta.url), "utf8");

describe("parseLocalTime", () => {
  it("reads the panchang's own format", () => {
    expect(parseLocalTime("3:42 PM")).toBe(15 * 60 + 42);
    expect(parseLocalTime("12:00 AM")).toBe(0);
    expect(parseLocalTime("12:30 PM")).toBe(12 * 60 + 30);
    expect(parseLocalTime("6:05 AM")).toBe(6 * 60 + 5);
  });

  it("returns null rather than guessing", () => {
    // A guessed time rings the wrong hour of someone's day. Skip, never guess — the same contract
    // localClock already keeps for a malformed timezone.
    for (const bad of [null, undefined, "", "later", "25:00 PM", "3:75 PM", "15:42"]) {
      expect(parseLocalTime(bad as any), String(bad)).toBeNull();
    }
  });
});

describe("the alert's safety properties", () => {
  it("claims the row BEFORE sending, like the bell", () => {
    const fn = SRC.slice(SRC.indexOf("export async function dayShiftTick"));
    const body = fn.slice(0, fn.indexOf("\nexport async function morningBellTick"));
    const claimAt = body.indexOf("lastTurnPush: clock.date");
    const sendAt = body.indexOf("sendPushToUser");
    expect(claimAt).toBeGreaterThan(-1);
    expect(sendAt).toBeGreaterThan(claimAt);   // stamp first, ring second
    expect(body).toMatch(/affectedRows[\s\S]{0,60}=== 0\) continue/);
  });

  it("uses its OWN dedupe column, never the bell's", () => {
    const fn = SRC.slice(SRC.indexOf("export async function dayShiftTick"));
    const body = fn.slice(0, fn.indexOf("\nexport async function morningBellTick"));
    expect(body).toContain("lastTurnPush");
    expect(body).not.toContain("lastMorningPush");
  });

  it("refuses to ring late — a missed turn stays missed", () => {
    // A server down at 3:42 must not ring at 9pm about a shift that happened hours ago.
    expect(SRC).toMatch(/TURN_WINDOW_MIN = \d+/);
    const fn = SRC.slice(SRC.indexOf("export async function dayShiftTick"));
    expect(fn).toMatch(/since < 0 \|\| since > TURN_WINDOW_MIN\) continue/);
  });

  it("skips a user with no clock instead of guessing one", () => {
    const fn = SRC.slice(SRC.indexOf("export async function dayShiftTick"));
    expect(fn).toMatch(/if \(!clock\) continue/);
  });

  it("survives a database without the column — the bell must not go down with it", () => {
    const fn = SRC.slice(SRC.indexOf("export async function dayShiftTick"));
    expect(fn).toMatch(/catch \{[\s\S]{0,220}return;/);
  });

  it("is actually scheduled, and cannot delay the morning bell", () => {
    expect(SRC).toMatch(/morningBellTick\(\)[\s\S]{0,200}dayShiftTick\(\)/);
    expect(SRC).toMatch(/\[push\] shift tick failed/);
  });
});
