import { describe, it, expect } from "vitest";
import { peelTakeaway } from "./peel-takeaway";

/**
 * THE BROKEN THOUGHT, GUARDED (audit 2026-07-20).
 *
 * The peeled takeaway is rendered ALONE, in gold, under the year's core theme — the rest of the
 * `why` is not on that surface. So a bad peel is not a cosmetic defect: it is the only sentence
 * the reader sees, and it can be a beheaded fragment of one the model wrote whole.
 *
 * The transformer lived inside a page, where the vitest suite (server/** + shared/** only) could
 * never reach it, and it had drifted: its appositive guard covered one of the two branches and
 * recognised only asides shorter than 140 characters with no sentence mark inside them.
 *
 * Both failing shapes below were produced by running the OLD function, not imagined.
 */
describe("peelTakeaway never beheads a sentence", () => {
  const shapes: Array<[string, string]> = [
    [
      "a long aside — the old 140-char guard let it through",
      "Jupiter sits in the room of daily work — the client hours, the invoicing, the parts of the craft nobody sees, the standing up early and the staying late when the studio has gone cold — every week of this year.",
    ],
    [
      "an aside containing a sentence mark",
      "Venus in the room of love — she is not subtle about it. she never is — a pattern that repeats all year.",
    ],
    [
      "'— so' INSIDE an aside — the old branch matched the first occurrence anywhere",
      "Saturn sits in the room of your worth — so much of what arrives this year arrives through what you already own — and Ketu loosens the floor beneath it.",
    ],
  ];

  it.each(shapes)("%s", (_name, text) => {
    const { data, takeaway } = peelTakeaway(text);
    // The rule: whatever it decides, nothing may be LOST. Either it declines to peel (and `data`
    // is the whole thing), or data + takeaway together still carry every word.
    const rejoined = (data + " " + takeaway).replace(/\s+/g, " ").trim();
    const original = text.replace(/\s+/g, " ").trim();
    const lostWords = original.split(" ").filter((w) => !rejoined.includes(w.replace(/[—]/g, "")));
    expect(lostWords, `these words vanished from the reader's view: ${lostWords.join(" ")}`).toEqual([]);
    // and specifically: the takeaway must never START mid-sentence with a lowercase fragment
    if (takeaway) expect(takeaway[0], `takeaway begins mid-sentence: "${takeaway}"`).toMatch(/[A-Z"'(]/);
  });

  it("still peels a genuine closing clause — the guard is not simply 'never peel'", () => {
    // CONTROL. Without this, deleting the whole function body would pass the suite above.
    const closing = "Mars rules both the 3rd and the 10th this year — Both rooms keep handing you the same question.";
    const { data, takeaway } = peelTakeaway(closing);
    expect(takeaway).toBe("Both rooms keep handing you the same question.");
    expect(data).toBe("Mars rules both the 3rd and the 10th this year");

    // and the "— so" connector form, which the page relies on
    const so = peelTakeaway("Venus owns both your money and your love — so they rise and fall together.");
    expect(so.takeaway).toBe("they rise and fall together.");
  });

  it("declines a MULTI-dash string even when a mid-aside tail looks like a new sentence", () => {
    // Directly guards `dashes.length !== 1`: with more than one dash we decline outright, BEFORE the
    // clause-start test. Here the aside happens to continue with a capitalised word, so if the
    // multi-dash guard is loosened the peeler cuts at the FIRST dash and the clause-start rule
    // wrongly waves the capitalised tail through — beheading the sentence. (The conservative rule
    // alone declines lowercase tails, so only this capital-tail shape keeps the guard honest.)
    const t = "His whole long year turns on the tenth and its heavy lord — Then a long aside runs on here — and it closes.";
    const { data, takeaway } = peelTakeaway(t);
    expect(takeaway).toBe("");
    expect(data).toBe(t);
  });

  it("declines a single trailing dash whose tail CONTINUES the clause (audit 2026-07-22)", () => {
    // The old FRAGMENT_STARTS denylist peeled by default and could not enumerate every
    // continuation word. A single trailing dash introducing a lowercase participle or a compound
    // predicate slipped through and was shown ALONE in gold — a beheaded fragment. Both shapes
    // below were produced by running the OLD function; they must now DECLINE.
    const participle =
      "Jupiter sits in the room of your worth, his hand reaching back — pulling the old belief loose.";
    expect(peelTakeaway(participle).takeaway).toBe("");
    expect(peelTakeaway(participle).data).toBe(participle);

    const compoundPredicate =
      "Saturn settles into the room of daily work and stays a long while — holds you to the craft floor.";
    expect(peelTakeaway(compoundPredicate).takeaway).toBe("");

    const finiteVerb =
      "Venus turns toward the room of partnership this whole year — asks what you are willing to give.";
    expect(peelTakeaway(finiteVerb).takeaway).toBe("");
  });

  it("declines on the app's own GOLD example rather than cutting inside its appositive", () => {
    // Verbatim from prompts.ts's whyNow.why gold sample — an appositive-bearing sentence that
    // must survive whole. (It contains several em dashes, so the rule declines: no takeaway.)
    const gold =
      "The timing is two players handing off. Jupiter, your mahadasha (the long, years-long cycle), sits in the room of your worth, his hand reaching back to your home and roots and to your partnerships. And Ketu, your antardasha (the current sub-period), is down in that same foundation — your home and roots — quietly pulling up the floorboards, which is why the old 'not enough' is coming loose right now.";
    const { data, takeaway } = peelTakeaway(gold);
    expect(takeaway).toBe("");
    expect(data).toBe(gold);
  });
});
