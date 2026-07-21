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

  it("a tender day speaks David's line; the canon supports/avoids survive underneath", () => {
    const d = dayFilter({ ...base, nakshatra: "Anuradha", tithiNumber: 7 });
    expect(d.headline).toBe("Tend people and craft with soft hands"); // the blessed matrix
    expect(d.sentence).toMatch(/^Love, mending, the making of beautiful work\. A day of gentle connections\./);
    expect(d.supports.join(" ")).toMatch(/love|friendship|art/);
    expect(d.avoid.join(" ")).toMatch(/confrontation|cutting/);
  });

  it("rikta empties every nature except the cutting ones (remedy chosen here; David's July 12 ruling was the no-self-contradiction rule it serves)", () => {
    // varaLord Sun, deliberately: `base` is Jupiter, and Thursday + Revati + tithi 4 is one of
    // Raman's own Siddha pairings, so on that vara this day now SPEAKS (David's option-2 ruling,
    // 2026-07-20) and the fixture would be testing the wrong thing. Sunday's grid does not list
    // Revati and Sunday is not in the weekday-tithi list, so this day forms no yoga.
    const soft = dayFilter({ ...base, varaLord: "Sun", nakshatra: "Revati", tithiNumber: 4 });
    expect(soft.siddhaYoga, "fixture must form NO yoga, or it is not testing the empty rule").toBeNull();
    expect(soft.amritaSiddhi).toBe(false);
    expect(soft.supports).toEqual([]);
    expect(soft.vetoes.join(" ")).toMatch(/runs on empty/);
    // The old sentence advertised "cutting and severing acts only" while the tender
    // nature's avoid said keep away from cutting — one breath, both directions.
    expect(soft.sentence).not.toMatch(/severing/);
    expect(soft.sentence).toMatch(/start nothing.*let it pass quietly/i);
    const sharp = dayFilter({ ...base, nakshatra: "Mula", tithiNumber: 4 });
    expect(sharp.supports.join(" ")).toMatch(/surgery|uprooting|severing/); // per-star now (Mula): his own cutting words
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
  it("an empty current under a GOOD star promises the receptive win (David's line)", () => {
    const good = { quality: "good" as const, taraNum: 6, cycle: 1, favorable: true }; // Sadhaka
    const d = dayFilter({ ...base, nakshatra: "Revati", tithiNumber: 4, tara: good });
    expect(d.sentence).toMatch(/a win is possible\. No forceful pushing\. Let it come; don't chase it\./);
    const plain = dayFilter({ ...base, nakshatra: "Revati", tithiNumber: 4 });
    expect(plain.sentence).toMatch(/start nothing.*let it pass quietly/i);
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
  it("the sharp-day sentence compresses supports to his register; the canon list survives underneath", () => {
    const d = dayFilter({ varaLord: "Mercury", vishti: false, tara: null, nakshatra: "Ashlesha", tithiNumber: 2 });
    expect(d.sentence).toMatch(/^A day for decisive cuts and clean, deliberate endings/);
    expect(d.sentence).not.toMatch(/surgery/);
    expect(d.supports.join(" ")).toMatch(/investigation and problem solving|psychology|occult work/); // per-star now (Ashlesha)
  });

  it("the sharp-day sentence speaks his words, not the book's item-list", () => {
    const d = dayFilter({ varaLord: "Mercury", vishti: false, tara: null, nakshatra: "Ashlesha", tithiNumber: 2 });
    expect(d.sentence).toMatch(/Don't start anything new\. Today is not a day where something is completed\./);
    expect(d.sentence).not.toMatch(/weddings/);
    expect(d.avoid.join(" ")).toMatch(/weddings/); // the detail data keeps the book's items
  });
});

describe("David's fixed-day supportsPool (the 2026-07-18 Rosetta lines)", () => {
  const FIXED = { varaLord: "Saturn", vishti: false, tara: null, nakshatra: "Uttara Phalguni", tithiNumber: 5 };
  const POOL_STARTS = [
    /^Foundations must be carefully constructed/,
    /^The foundations that hold are the ones that were made with love, and precision\./,
  ];

  it("a seeded fixed day speaks one of his lines, never the canned item-list", () => {
    const d = dayFilter({ ...FIXED, dateSeed: "2026-07-18" });
    expect(POOL_STARTS.some((re) => re.test(d.sentence))).toBe(true);
    expect(d.sentence).not.toMatch(/^It supports/);
    expect(d.sentence).not.toMatch(/Keep away from travel/);
  });

  it("the rotation is date-stable and turns across days", () => {
    const a1 = dayFilter({ ...FIXED, dateSeed: "2026-07-18" }).sentence;
    const a2 = dayFilter({ ...FIXED, dateSeed: "2026-07-18" }).sentence;
    expect(a1).toBe(a2); // same date, same line — stable all day
    const week = ["2026-07-18", "2026-07-19", "2026-07-20", "2026-07-21", "2026-07-22"]
      .map((dateSeed) => dayFilter({ ...FIXED, dateSeed }).sentence);
    expect(new Set(week).size).toBeGreaterThan(1); // different faces across days
  });

  it("no seed still speaks his words (first line), and a supports list survives underneath", () => {
    const d = dayFilter({ ...FIXED });
    expect(d.sentence).toMatch(/^Foundations must be carefully constructed/);
    // This asserted the NATURE's wording ("commitments meant to last"). Uttara Phalguni is one of
    // the seven stars David gave specific supports for (2026-07-20), so it now carries HIS list —
    // "long-term commitments", patronage, contracts. The test's intent is unchanged: a real supports
    // list still rides under his sentence.
    expect(d.supports.join(" ")).toMatch(/long-term commitments/);
    expect(d.supports.join(" ")).toMatch(/contracts and legal agreements/);
    expect(d.avoid.join(" ")).toMatch(/travel/);
  });

  it("the canon nature still owns what the day AVOIDS, and the classification itself", () => {
    // This control used to be "a fixed star he did NOT specify keeps the canon wording", with Rohini
    // as the example. He has since given supports for all 27, so no unspecified star is left and
    // that control is obsolete. Replacing it rather than deleting it, because what it guarded is
    // still real: the per-star supports must not have swallowed the cited table whole. The canon
    // still decides the NATURE, and still supplies the AVOID list.
    const d = dayFilter({ ...FIXED, nakshatra: "Rohini" });
    expect(d.supports.join(" ")).toMatch(/wealth and gain/);   // his per-star list
    expect(d.avoid.join(" ")).toMatch(/travel/);               // the canon's fixed-nature avoid
    expect(d.nature).toBe("fixed");                            // the canon's classification
  });
});

describe("Mercury's arc: neither begin nor end, and the beginnings become the audit", () => {
  // David caught this live on 2026-07-20, on his own read, three days out from a direct station:
  // the field note said "land the heavy pieces before it", the closing question asked what he
  // would finish "if you stopped waiting for the perfect moment to announce it", and the day's
  // supports carried "important elections" and "good work begun with intent". His ruling:
  //   "do not begin or end anything until it has passed. There are no such things as deadlines."
  //   "rx plus the shades. Because you will be forced to fix it eventually. It will break."
  //   "this can be simplified to auditing 'important elections'…"
  // The prompt had said "don't launch" for a long time. The PAYLOAD kept handing over beginnings.
  const DAY = { nakshatra: "Chitra", tithiNumber: 7, varaLord: "Moon", vishti: false, dateSeed: "2026-07-20" } as const;

  it("withholds beginnings AND endings, and turns them into audit items", () => {
    const clear = dayFilter({ ...DAY, mercuryRx: false } as any);
    const rx = dayFilter({ ...DAY, mercuryRx: true } as any);

    // ANCHOR — the fixture must actually carry the beginning, or this proves nothing.
    expect(clear.supports, "fixture lost the electional string").toContain("important elections");
    expect(clear.audit, "a clear day must audit nothing").toEqual([]);

    expect(rx.supports).not.toContain("important elections");
    expect(rx.audit, "the beginning was deleted instead of turned around").toContain("important elections");
    expect(rx.vetoes.some((v) => /nothing begins and nothing ends/.test(v))).toBe(true);
  });

  it("keeps the craft — a retrograde day is not an empty day", () => {
    // His own words for the day this was found on: "Go practice your songs. Use your fingers."
    const rx = dayFilter({ ...DAY, mercuryRx: true } as any);
    for (const kept of ["design", "architecture", "making things", "work"]) {
      expect(rx.supports, `the retrograde ate the craft: ${kept}`).toContain(kept);
    }
    expect(rx.supports.length).toBeGreaterThan(3);
  });

  it("'good work begun with intent' SURVIVES the retrograde — it is not an initiation", () => {
    // David corrected my first classification: "it's not saying launch the thing there. It's just
    // saying make deliberate choices in the thing that you will be speaking from in the future."
    // Deliberateness is exactly what a review period asks for, so it must not be filtered out.
    const rx = dayFilter({ ...DAY, mercuryRx: true } as any);
    expect(rx.supports).toContain("good work begun with intent");
    expect(rx.audit).not.toContain("good work begun with intent");
  });

  it("a special yoga cannot put beginnings back — Raman's own limit", () => {
    // Monday + tithi 7 IS a Siddha weekday-tithi pairing, so this fixture forms the yoga whose
    // supports are the strings in question. The yoga raises the odds; it removes no obstacle.
    const rx = dayFilter({ ...DAY, mercuryRx: true } as any);
    expect(rx.siddhaYoga, "fixture must actually form the yoga").not.toBeNull();
    expect(rx.supports).not.toContain("important elections");
  });

  it("CONTROL — with Mercury clear the day is untouched", () => {
    const clear = dayFilter({ ...DAY, mercuryRx: false } as any);
    const legacy = dayFilter({ ...DAY } as any); // no flag at all — the calendar's old call shape
    expect(clear.supports).toEqual(legacy.supports);
    expect(clear.vetoes).toEqual(legacy.vetoes);
    expect(legacy.audit).toEqual([]);
  });
});
