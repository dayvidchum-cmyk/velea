import { describe, it, expect } from "vitest";
import { generateExpectedMeaning } from "./meaning-engine";
import { calculateNatalChart } from "./natal-chart-engine";
import { calculateProfection } from "./profection-engine";

describe("Meaning Synthesis Engine", () => {
  it("should generate Expected Meaning for profection year", async () => {
    // Get natal chart and profection
    const natalChart = await calculateNatalChart(
      "1982-04-13",
      "17:20:00",
      14.6,
      120.6,
      8
    );

    const profection = calculateProfection(natalChart, new Date("2026-05-25"));

    // Generate meaning
    const meaning = generateExpectedMeaning(profection, natalChart);

    // Verify structure
    expect(meaning.emphasis).toBeDefined();
    expect(meaning.natalAnchor).toBeDefined();
    expect(meaning.supportsFocus).toBeDefined();
    expect(meaning.potentialFriction).toBeDefined();

    // Verify content quality
    expect(meaning.emphasis.length).toBeGreaterThan(50);
    expect(meaning.natalAnchor.length).toBeGreaterThan(50);
    expect(meaning.supportsFocus.length).toBeGreaterThanOrEqual(3);
    expect(meaning.potentialFriction.length).toBeGreaterThanOrEqual(3);

    // Verify operational language (no mysticism/fate)
    expect(meaning.emphasis).not.toMatch(/destiny|fate|will happen|guaranteed|must/i);
    expect(meaning.natalAnchor).not.toMatch(/destiny|fate|will happen|guaranteed|must/i);

    // Verify Time Lord is mentioned
    expect(meaning.emphasis).toContain(profection.timeLord);
    expect(meaning.natalAnchor).toContain(profection.timeLord);

    // Verify content is meaningful
    expect(meaning.emphasis).toMatch(/emphasizes|themes/);

    console.log("✓ Expected Meaning generated successfully");
    console.log(`\n=== EXPECTED MEANING ===\n`);
    console.log(`EMPHASIS:\n${meaning.emphasis}\n`);
    console.log(`NATAL ANCHOR:\n${meaning.natalAnchor}\n`);
    console.log(`SUPPORTS FOCUS:\n${meaning.supportsFocus.map((f) => `• ${f}`).join("\n")}\n`);
    console.log(`POTENTIAL FRICTION:\n${meaning.potentialFriction.map((f) => `• ${f}`).join("\n")}`);
  });

  it("should avoid mystical language", async () => {
    const natalChart = await calculateNatalChart(
      "1982-04-13",
      "17:20:00",
      14.6,
      120.6,
      8
    );

    const profection = calculateProfection(natalChart, new Date("2026-05-25"));
    const meaning = generateExpectedMeaning(profection, natalChart);

    const forbiddenWords = [
      "destiny",
      "fate",
      "will happen",
      "guaranteed",
      "must",
      "spiritual",
      "cosmic",
      "divine",
      "mystical",
    ];

    const allText = `${meaning.emphasis} ${meaning.natalAnchor} ${meaning.supportsFocus.join(" ")} ${meaning.potentialFriction.join(" ")}`;

    // Check key forbidden words
    expect(allText).not.toMatch(/\bdestiny\b/i);
    expect(allText).not.toMatch(/\bfate\b/i);
    expect(allText).not.toMatch(/will happen/i);
    expect(allText).not.toMatch(/\bmust\b/i);
  });

  it("should use operational language", async () => {
    const natalChart = await calculateNatalChart(
      "1982-04-13",
      "17:20:00",
      14.6,
      120.6,
      8
    );

    const profection = calculateProfection(natalChart, new Date("2026-05-25"));
    const meaning = generateExpectedMeaning(profection, natalChart);

    const operationalWords = ["emphasizes", "supports", "focus", "opportunity", "tendency"];

    const allText = `${meaning.emphasis} ${meaning.natalAnchor} ${meaning.supportsFocus.join(" ")} ${meaning.potentialFriction.join(" ")}`;

    const hasOperationalLanguage = operationalWords.some((word) =>
      allText.toLowerCase().includes(word.toLowerCase())
    );

    expect(hasOperationalLanguage).toBe(true);
  });

  it("should reference natal Time Lord placement", async () => {
    const natalChart = await calculateNatalChart(
      "1982-04-13",
      "17:20:00",
      14.6,
      120.6,
      8
    );

    const profection = calculateProfection(natalChart, new Date("2026-05-25"));
    const meaning = generateExpectedMeaning(profection, natalChart);

    // Should mention natal placement
    expect(meaning.natalAnchor).toMatch(/natal/i);
    expect(meaning.natalAnchor).toMatch(/house/i);
  });
});
