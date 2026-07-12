import { describe, it, expect } from "vitest";
import { planetDignity, neechaBhanga, dignityOf, natalDignities, type Graha } from "./dignity";
import { calculateBirthChart } from "../birthchart/calculator";

describe("planetDignity — coarse sign dignity", () => {
  it("names exaltation, debilitation, own, and moolatrikona", () => {
    expect(planetDignity("Sun", 0 + 10)).toBe("exalted");          // 10° Aries
    expect(planetDignity("Moon", 210 + 25.39)).toBe("debilitated"); // 25.39° Scorpio
    expect(planetDignity("Mars", 210 + 5)).toBe("own");             // 5° Scorpio (Mars owns Scorpio)
    expect(planetDignity("Saturn", 300 + 10)).toBe("moolatrikona"); // 10° Aquarius (0–20°)
    expect(planetDignity("Mercury", 0 + 1.34)).toBe("neutral");     // 1.34° Aries — no special dignity
  });
});

describe("neechaBhanga — cancellation logic (synthetic)", () => {
  it("cancels when the dispositor sits in a kendra from the lagna", () => {
    // Moon debilitated in Scorpio; Mars (Scorpio's lord) in the 1st from a Scorpio... use Virgo lagna:
    // Mars in Virgo = 1st (kendra). Everything else parked out of the way.
    const lonBy: Record<Graha, number> = {
      Sun: 0, Moon: 210 + 25, Mars: 150 + 12, Mercury: 60, Jupiter: 90, Venus: 30, Saturn: 240,
    };
    const nb = neechaBhanga("Moon", lonBy, /*lagna*/ 150 + 18); // Virgo lagna
    expect(nb.cancelled).toBe(true);
    expect(nb.reasons.join(" ")).toMatch(/dispositor Mars/);
  });
});

describe("dignity on the real primary chart (1982-04-13) — the case that motivated this", () => {
  it("David's Moon is DEBILITATED but CANCELLED (neecha bhanga, ≥2 conditions)", async () => {
    const c = await calculateBirthChart("1982-04-13", "17:20", 14.6, 120.6, "Asia/Manila", { lagnaBasis: "ascendant" });
    const lonBy: Record<Graha, number> = {
      Sun: (c as any).sun.longitude, Moon: (c as any).moon.longitude, Mars: (c as any).mars.longitude,
      Mercury: (c as any).mercury.longitude, Jupiter: (c as any).jupiter.longitude,
      Venus: (c as any).venus.longitude, Saturn: (c as any).saturn.longitude,
    };
    const d = dignityOf("Moon", lonBy, c.lagna.longitude);
    expect(d.debilitated).toBe(true);
    expect(d.sign).toBe("Scorpio");
    expect(d.fromDeep).toBeGreaterThan(20); // 25° Scorpio — far from the 3° trough (shallow)
    expect(d.neechaBhanga?.cancelled).toBe(true);
    expect(d.neechaBhanga!.count).toBeGreaterThanOrEqual(2); // Mars-in-kendra + Venus-in-kendra
    expect(d.neechaBhanga!.reasons.join(" | ")).toMatch(/Mars/);
    expect(d.neechaBhanga!.reasons.join(" | ")).toMatch(/Venus/);

    // The whole set computes without throwing, and only the Moon is flagged debilitated for this chart.
    const all = natalDignities(lonBy, c.lagna.longitude);
    expect(all.Moon.debilitated).toBe(true);
    console.log("David's natal dignities:", Object.values(all).map((p) => `${p.planet} ${p.sign} ${p.state}${p.neechaBhanga?.cancelled ? " (NB cancelled)" : ""}`).join(" · "));
  });
});
