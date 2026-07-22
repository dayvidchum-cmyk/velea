/**
 * THE STAGE — guards for the camera model.
 *
 * These are the invariants David's architecture rests on, so each is tested with a CONTROL IN
 * BOTH DIRECTIONS: the thing that should fire fires, and a case that should NOT fire doesn't.
 * Most wrong findings in this repo were a broken instrument rather than broken engine code.
 *
 * Pure fixtures — hand-placed longitudes, no ephemeris, no DB. Every expected value below was
 * derived from the classical rules and then CONFIRMED against the engine, never the reverse.
 */
import { describe, it, expect } from "vitest";
import { computeStage, assertOnePrimary, assertMoonIsCamera, type StageInput, type Stage } from "./stage.js";

/**
 * Lagna Aries (index 0), so house === sign index + 1.
 *   Moon    195 deg  Libra      -> house 7   THE CAMERA
 *   Venus    15 deg  Aries      -> house 1   lord of Libra          -> in frame
 *   Sun     200 deg  Libra      -> house 7   standing in Libra      -> in frame (and debilitated)
 *   Saturn  285 deg  Capricorn  -> house 10  10th aspect hits Libra -> in frame
 *   Jupiter  45 deg  Taurus     -> house 2   aspects 5/7/9 = Virgo/Scorpio/Capricorn -> NOT in frame
 *   Mercury 100 deg  Cancer     -> house 4   aspects 7th = Capricorn                 -> NOT in frame
 *   Mars    320 deg  Aquarius   -> house 11  aspects 4/7/8 = Taurus/Leo/Virgo        -> NOT in frame
 */
const BASE: StageInput = {
  transitLon: { Moon: 195, Venus: 15, Sun: 200, Saturn: 285, Jupiter: 45, Mercury: 100, Mars: 320, Rahu: 60, Ketu: 240 },
  lagnaSignIdx: 0,
  retrograde: { Rahu: true, Ketu: true },
  dasha: { maha: "Saturn", antar: "Jupiter", pratyantar: "Mars" },
  annualTimeLord: "Venus",
  dayLord: "Mars",
};

const stage = (over: Partial<StageInput> = {}): Stage => computeStage({ ...BASE, ...over });
const named = (s: Stage, n: string) => s.characters.find((c) => c.character === n);

describe("the Moon is the camera, never an actor", () => {
  it("never appears in the cast", () => {
    const s = stage();
    expect(s.characters.map((c) => c.character)).not.toContain("Moon");
    expect(s.camera.body).toBe("Moon");
    expect(() => assertMoonIsCamera(s)).not.toThrow();
  });

  it("the guard actually catches a Moon smuggled into the cast (negative control)", () => {
    const s = stage();
    const broken = { ...s, characters: [...s.characters, { character: "Moon" } as any] };
    expect(() => assertMoonIsCamera(broken)).toThrow(/camera, never an actor/);
  });

  it("throws when there is no Moon longitude — no camera, no stage", () => {
    const { Moon, ...noMoon } = BASE.transitLon;
    expect(() => stage({ transitLon: noMoon })).toThrow(/no camera/);
  });
});

describe("the camera decides the frame", () => {
  it("lights the house the Moon stands in, with canon significations and no house number", () => {
    const c = stage().camera;
    expect(c.location.sign).toBe("Libra");
    expect(c.location.house).toBe(7);
    expect(c.illuminates.theme.length).toBeGreaterThan(0);
    expect(c.illuminates.specifics.length).toBeGreaterThan(0);
    // canon for the 7th: partnership ground, not "house 7"
    expect(c.illuminates.specifics.join(" ")).toMatch(/marriage|partner|spouse/i);
  });

  it("frames the occupant, the lord, and the aspecter — and nobody else", () => {
    const f = stage().camera.inFocus;
    expect(f).toContain("Sun");      // standing in Libra
    expect(f).toContain("Venus");    // rules Libra
    expect(f).toContain("Saturn");   // 10th aspect onto Libra
    // CONTROL: three bodies that reach Libra by no route at all
    expect(f).not.toContain("Jupiter");
    expect(f).not.toContain("Mercury");
    expect(f).not.toContain("Mars");
  });

  it("moves the frame when the Moon moves, with the cast unchanged", () => {
    const a = stage();                                   // Moon in Libra
    const b = stage({ transitLon: { ...BASE.transitLon, Moon: 15 } });   // Moon in Aries
    expect(b.camera.location.house).toBe(1);
    expect(a.camera.location.house).not.toBe(b.camera.location.house);
    // the actors did not move — only what is watched
    expect(a.characters.map((c) => c.character).sort()).toEqual(b.characters.map((c) => c.character).sort());
    expect(named(a, "Saturn")!.location).toEqual(named(b, "Saturn")!.location);
    expect(a.camera.inFocus).not.toEqual(b.camera.inFocus);
  });
});

describe("the Protagonist is given, not ranked", () => {
  it("Primary is the annual Time Lord", () => {
    const s = stage();
    expect(named(s, "Venus")!.narrativeWeight).toBe("Primary");
    expect(s.narrative.narrativeState).toBe("Standard");
  });

  it("exactly one Primary, always", () => {
    const s = stage();
    expect(s.characters.filter((c) => c.narrativeWeight === "Primary")).toHaveLength(1);
    expect(() => assertOnePrimary(s)).not.toThrow();
  });

  it("the one-Primary guard actually catches a second (negative control)", () => {
    const s = stage();
    const broken: Stage = { ...s, characters: s.characters.map((c) => ({ ...c, narrativeWeight: "Primary" as const })) };
    expect(() => assertOnePrimary(broken)).toThrow(/exactly ONE Primary/);
  });

  it("the Mahadasha Lord does NOT take the lead while a Time Lord exists", () => {
    // Saturn is the Book's lord here. Under the old seniority ladder it would have led.
    expect(named(stage(), "Saturn")!.narrativeWeight).not.toBe("Primary");
  });

  it("a Moon profection year is CONVERGENCE, not a recovered exception", () => {
    const s = stage({ annualTimeLord: "Moon" });
    expect(s.narrative.narrativeState).toBe("Convergence");
    expect(s.narrative.chapterLead).toBe("Moon");
    // David's hierarchy step 3: the Scene Lead is the lord of the house the Moon activates.
    expect(s.narrative.sceneLead).toBe("Venus");          // Venus rules Libra, the lit ground
    expect(named(s, "Venus")!.narrativeWeight).toBe("Primary");
    expect(s.narrative.stateNote).toMatch(/same planet|unified/i);
  });

  it("an ordinary year is Standard, with no state note to voice", () => {
    const s = stage();
    expect(s.narrative.narrativeState).toBe("Standard");
    expect(s.narrative.chapterLead).toBe("Venus");
    expect(s.narrative.stateNote).toBeNull();
  });

  it("Convergence with the Moon also ruling the lit ground still yields exactly one Primary", () => {
    // Moon in Cancer: it is the Time Lord AND the lord of the house it activates, so NEITHER
    // lead is castable. The first actor in frame takes Primary rather than the engine throwing.
    const s = stage({ transitLon: { ...BASE.transitLon, Moon: 100 }, annualTimeLord: "Moon" });
    expect(s.narrative.chapterLead).toBe("Moon");
    expect(s.narrative.sceneLead).toBe("Moon");
    expect(s.narrative.narrativeState).toBe("Convergence");
    expect(() => assertOnePrimary(s)).not.toThrow();
    expect(s.characters.filter((c) => c.narrativeWeight === "Primary")).toHaveLength(1);
    expect(named(s, "Mercury")!.inFocus).toBe(true);      // shares Cancer with the camera
  });

});

describe("relationships are resolved, not left for the model to join", () => {
  it("attaches the host's condition to the guest", () => {
    // Mercury retrograde; Jupiter sits in Taurus (host Venus) so use a body hosted BY Mercury.
    // Put Mars in Gemini (60 deg) -> host Mercury, which is retrograde.
    const s = stage({
      transitLon: { ...BASE.transitLon, Mars: 65, Rahu: 130 },
      retrograde: { ...BASE.retrograde, Mercury: true },
    });
    const mars = named(s, "Mars")!;
    expect(mars.host).toBe("Mercury");
    expect(mars.hostCondition).toBe("Retrograde");
    expect(mars.condition).toContain("Operating through revision");
  });

  it("names companions and marks the camera's presence distinctly", () => {
    const sun = named(stage(), "Sun")!;          // Sun shares Libra with the Moon
    expect(sun.companions).toContain("Moon");
    expect(sun.condition).toContain("In today's frame");
    // the Moon is never described as a peer working alongside anyone
    expect(sun.condition.join(" ")).not.toMatch(/alongside Moon|slowed by Moon/);
  });

  it("reports a hard aspect as pressure and a soft one as support", () => {
    const s = stage();
    const all = s.characters.flatMap((c) => c.condition).join(" | ");
    expect(all).toMatch(/Under pressure from|Expression slowed by/);
    expect(all).toMatch(/Supported by|Working alongside|Well hosted/);
  });

  // The aggressor direction (v930). HARD[X] = who X afflicts (canon, stable). A tension must name
  // the malefic that REACHES the victim, never the reverse — the old code always framed
  // "o presses on p" regardless of who was the aggressor (measured 20/103 wrong).
  const HARD_CANON: Record<string, string[]> = {
    Saturn: ["Sun", "Moon", "Mars"], Mars: ["Saturn", "Moon", "Mercury"],
    Sun: ["Saturn"], Rahu: ["Sun", "Moon"], Ketu: ["Sun", "Moon"],
  };

  it("names the TRUE aggressor: Mars presses on Mercury, never Mercury on Mars", () => {
    // Mars (Primary, so iterated first) opposes Mercury. Mars is HARD on Mercury; Mercury is hard
    // on no one. The old code, hitting Mars as the character, wrote "Mercury presses on Mars".
    const s = stage({
      transitLon: { Moon: 90, Mars: 30, Mercury: 210, Sun: 120, Venus: 150, Jupiter: 62, Saturn: 300, Rahu: 255, Ketu: 75 },
      annualTimeLord: "Mars",
    });
    expect(s.tension).not.toBeNull();
    expect(s.tension!.because).toBe("Mars presses on Mercury");
    expect(s.tension!.name).toBe("Mercury under Mars");
    expect(s.tension!.between).toEqual(["Mercury", "Mars"]);
  });

  it("every hard tension frames the victim under a malefic that is genuinely hard on it", () => {
    // Property control across configs: whatever tension is found, the named aggressor must be HARD
    // on the named victim (or they share the ground). A misdirected tension breaks this.
    const configs: Array<Partial<StageInput>> = [
      { transitLon: { ...BASE.transitLon, Mars: 30, Mercury: 210 }, annualTimeLord: "Mars" },
      { transitLon: { ...BASE.transitLon, Saturn: 0, Mars: 180 }, annualTimeLord: "Saturn" },
      { transitLon: { ...BASE.transitLon, Saturn: 0, Sun: 180 }, annualTimeLord: "Sun" },
    ];
    for (const over of configs) {
      const t = stage(over).tension;
      if (!t || !t.because.includes("presses on")) continue;
      const [victim, aggressor] = t.between;
      expect(HARD_CANON[aggressor]?.includes(victim), `misdirected: "${t.name}" / "${t.because}"`).toBe(true);
      expect(t.because).toBe(`${aggressor} presses on ${victim}`);
    }
  });
});

describe("no machinery vocabulary reaches the narrative layer", () => {
  const ZOD = /\b(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/;
  const HOUSE_NUM = /\b(\d+\s*(st|nd|rd|th)\s+house|house\s+\d+)\b/i;

  it("condition lines carry no sign name and no house number", () => {
    const s = stage();
    for (const c of s.characters) {
      for (const line of c.condition) {
        expect(line, `sign name leaked: "${line}"`).not.toMatch(ZOD);
        expect(line, `house number leaked: "${line}"`).not.toMatch(HOUSE_NUM);
      }
    }
  });

  it("the illuminated territory carries no sign name and no house number", () => {
    const { theme, specifics } = stage().camera.illuminates;
    for (const t of [...theme, ...specifics]) {
      expect(t, `leaked: "${t}"`).not.toMatch(ZOD);
      expect(t, `leaked: "${t}"`).not.toMatch(HOUSE_NUM);
    }
  });

  it("the leak checks can actually fail (negative control)", () => {
    expect("Working alongside Saturn in Libra").toMatch(ZOD);
    expect("focus on the 9th house").toMatch(HOUSE_NUM);
    expect("Operating through revision").not.toMatch(ZOD);
  });
});

describe("determinism", () => {
  it("same input, same stage, twice", () => {
    expect(JSON.stringify(stage())).toEqual(JSON.stringify(stage()));
  });

  it("Primary sorts first", () => {
    expect(stage().characters[0].narrativeWeight).toBe("Primary");
  });
});
