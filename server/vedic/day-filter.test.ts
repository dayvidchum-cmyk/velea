import { describe, it, expect } from "vitest";
import { dayFilter, movementOf, NATURE_LABEL } from "./day-filter";

const base = { varaLord: "Jupiter", vishti: false, tara: null };

describe("day filter — the classical tables (David-blessed 2026-07-15)", () => {
  it("classifies every nakshatra into its one nature (spot checks per class)", () => {
    expect(dayFilter({ ...base, nakshatra: "Rohini", tithiNumber: 2 }).nature).toBe("fixed");
    expect(dayFilter({ ...base, nakshatra: "Swati", tithiNumber: 2 }).nature).toBe("movable");
    expect(dayFilter({ ...base, nakshatra: "Pushya", tithiNumber: 2 }).nature).toBe("swift");
    expect(dayFilter({ ...base, nakshatra: "Revati", tithiNumber: 2 }).nature).toBe("tender");
    expect(dayFilter({ ...base, nakshatra: "Mula", tithiNumber: 2 }).nature).toBe("sharp");
    expect(dayFilter({ ...base, nakshatra: "Magha", tithiNumber: 2 }).nature).toBe("fierce");
    expect(dayFilter({ ...base, nakshatra: "Krittika", tithiNumber: 2 }).nature).toBe("mixed");
  });

  it("maps tithis to families in both pakshas (Nanda 1/6/11 · Rikta 4/9/14 · Purna 5/10/15)", () => {
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 1 }).family).toBe("nanda");
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 16 }).family).toBe("nanda"); // Krishna 1st
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 9 }).family).toBe("rikta");
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 24 }).family).toBe("rikta");
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 30 }).family).toBe("purna"); // Amavasya
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 8 }).family).toBe("jaya");
  });

  it("a tender day in a work tithi supports the soft and the useful, avoids the cut", () => {
    const d = dayFilter({ ...base, nakshatra: "Anuradha", tithiNumber: 7 });
    expect(d.headline).toBe("a tender day built for work");
    expect(d.supports.join(" ")).toMatch(/love|friendship|art/);
    expect(d.supports.join(" ")).toMatch(/work|health|constructive/);
    expect(d.avoid.join(" ")).toMatch(/confrontation|cutting/);
    expect(d.sentence).toMatch(/^A tender day/);
    expect(d.sentence).toMatch(/Keep away from/);
  });

  it("rikta empties every nature except the cutting ones (David's July 12: no self-contradiction)", () => {
    const soft = dayFilter({ ...base, nakshatra: "Revati", tithiNumber: 4 });
    expect(soft.supports).toEqual([]);
    expect(soft.vetoes.join(" ")).toMatch(/runs on empty/);
    // The old sentence advertised "cutting and severing acts only" while the tender
    // nature's avoid said keep away from cutting — one breath, both directions.
    expect(soft.sentence).not.toMatch(/severing/);
    expect(soft.sentence).toMatch(/start nothing.*let it pass quietly/i);
    const sharp = dayFilter({ ...base, nakshatra: "Mula", tithiNumber: 4 });
    expect(sharp.supports.join(" ")).toMatch(/decisive cuts|endings/);
  });

  it("vishti strips beginnings without walling the day; Mercury never touches the character", () => {
    const v = dayFilter({ ...base, nakshatra: "Anuradha", tithiNumber: 1, vishti: true });
    expect(v.vetoes.join(" ")).toMatch(/blocks starting/);
    expect(v.supports.join(" ")).not.toMatch(/beginnings/i);
  });

  it("the personal ladder outranks the collective: a full-force loss day is contained", () => {
    const d = dayFilter({
      ...base, nakshatra: "Pushya", tithiNumber: 5, // sweet limbs
      tara: { quality: "bad", taraNum: 7, cycle: 1 },
    });
    expect(d.contained).toBe(true);
    expect(d.sentence).toMatch(/nothing new|keep everything small|let it pass/i);
    // softened rounds do NOT contain
    const soft = dayFilter({ ...base, nakshatra: "Pushya", tithiNumber: 5, tara: { quality: "mixed", taraNum: 7, cycle: 2 } });
    expect(soft.contained).toBe(false);
  });

  it("all seven natures carry labels", () => {
    for (const label of Object.values(NATURE_LABEL)) expect(label).toMatch(/day/);
  });
});

describe("movementOf — the six movements under the SHIPPED rx law (interpreter.ts)", () => {
  const goodTara = { quality: "good" as const, taraNum: 8, cycle: 1, favorable: true };
  const actionDay = () => dayFilter({ ...base, nakshatra: "Swati", tithiNumber: 2 }); // movable + work

  it("Mercury retrograde caps Action at BUILD — never Selective", () => {
    expect(movementOf(actionDay(), goodTara, false)).toBe("action");
    expect(movementOf(actionDay(), goodTara, false, { mercuryRetro: true, chandraFavorable: false })).toBe("build");
  });

  it("a strong Moon (favorable tara AND chandra) punches through off the station core", () => {
    expect(movementOf(actionDay(), goodTara, false, { mercuryRetro: true, chandraFavorable: true })).toBe("action");
    expect(movementOf(actionDay(), goodTara, false, { mercuryRetro: true, chandraFavorable: true, mercuryNearStation: true })).toBe("build");
  });

  it("Mercury never drags a Build day to Selective (David's July 15)", () => {
    const buildDay = dayFilter({ ...base, nakshatra: "Ashlesha", tithiNumber: 2 }); // sharp + work
    const janma = { quality: "mixed" as const, taraNum: 1, cycle: 1, favorable: false };
    expect(movementOf(buildDay, janma, false, { mercuryRetro: true, chandraFavorable: false })).toBe("build");
  });

  it("the ladder still rules: full-force loss = caution, hostile = restraint, crown = golden", () => {
    const c = actionDay();
    expect(movementOf(c, { quality: "bad", taraNum: 7, cycle: 1 }, false)).toBe("caution");
    expect(movementOf(c, { quality: "bad", taraNum: 3, cycle: 1 }, false)).toBe("restraint");
    expect(movementOf(c, goodTara, true)).toBe("golden");
  });

  it("selective comes only from the day itself: a full current or the blocked karana", () => {
    const purna = dayFilter({ ...base, nakshatra: "Swati", tithiNumber: 5 });
    expect(movementOf(purna, goodTara, false)).toBe("selective");
    const vishti = dayFilter({ ...base, nakshatra: "Ashlesha", tithiNumber: 2, vishti: true });
    expect(movementOf(vishti, goodTara, false)).toBe("selective");
  });

  it("the empty tithi rules the movement: Restraint on gentle natures, Selective on cutting ones (David's July 3/12)", () => {
    // July 3's exact shape: movable nature + rikta + good tara — the old rule let the
    // good tara say Action over a "running on empty" sentence.
    const movableRikta = dayFilter({ ...base, nakshatra: "Swati", tithiNumber: 4 });
    expect(movementOf(movableRikta, goodTara, false)).toBe("restraint");
    const tenderRikta = dayFilter({ ...base, nakshatra: "Revati", tithiNumber: 4 });
    expect(movementOf(tenderRikta, goodTara, false)).toBe("restraint");
    // The cutting natures agree with the empty tithi: the sanctioned severing = finish/end something.
    const sharpRikta = dayFilter({ ...base, nakshatra: "Mula", tithiNumber: 4 });
    expect(movementOf(sharpRikta, goodTara, false)).toBe("selective");
    // The ladder still trumps: full-force loss on a rikta day is Caution, crown is Golden.
    expect(movementOf(movableRikta, { quality: "bad", taraNum: 7, cycle: 1 }, false)).toBe("caution");
    expect(movementOf(movableRikta, goodTara, true)).toBe("golden");
  });
});

describe("the personal turn + the handshake (David 2026-07-15, the 7/29 conflict)", () => {
  const base = { varaLord: "Mercury", vishti: false, tara: null as any };
  it("a hostile personal star closes the collective sentence and empties the supported kinds", () => {
    const bad = { quality: "bad" as const, taraNum: 5, cycle: 1, favorable: false };
    const d = dayFilter({ ...base, nakshatra: "Swati", tithiNumber: 2, tara: bad }); // moving day, personally hostile
    expect(d.sentence).toMatch(/The wider world can run with this day — you don't\./);
    expect(d.supportedKinds).toEqual([]);
  });
  it("a clean day supports its own nature's kind; contained days support nothing", () => {
    const d = dayFilter({ ...base, nakshatra: "Swati", tithiNumber: 2 });
    expect(d.supportedKinds).toEqual(["movable"]);
    expect(d.sentence).not.toMatch(/wider world/);
    const contained = dayFilter({ ...base, nakshatra: "Pushya", tithiNumber: 5, tara: { quality: "bad", taraNum: 7, cycle: 1 } });
    expect(contained.supportedKinds).toEqual([]);
  });
  it("an empty tithi keeps only the cutting kinds, and only on cutting natures", () => {
    expect(dayFilter({ ...base, nakshatra: "Revati", tithiNumber: 4 }).supportedKinds).toEqual([]);
    expect(dayFilter({ ...base, nakshatra: "Mula", tithiNumber: 4 }).supportedKinds).toEqual(["sharp"]);
  });
});

describe("the rx-capped sentence (David's July 14: Build word over a GO sentence)", () => {
  it("holds the day in words when Mercury holds it in movement", async () => {
    const { cappedSentence } = await import("./day-filter");
    const swift = cappedSentence("swift", "a quick-wins day with joy in it");
    expect(swift).toMatch(/Mercury holds the launch/);
    expect(swift).toMatch(/revisits, follow-ups, and finishing/);
    const movable = cappedSentence("movable", "a moving day built for work");
    expect(movable).toMatch(/prepare it, pack for it/);
  });
});

describe("David's plain movement line on cutting days (2026-07-15)", () => {
  it("the sharp-day sentence speaks his words, not the book's item-list", () => {
    const d = dayFilter({ varaLord: "Mercury", vishti: false, tara: null, nakshatra: "Ashlesha", tithiNumber: 2 });
    expect(d.sentence).toMatch(/Don't start anything new\. Today is not a day where something is completed\./);
    expect(d.sentence).not.toMatch(/weddings/);
    expect(d.avoid.join(" ")).toMatch(/weddings/); // the detail data keeps the book's items
  });
});
