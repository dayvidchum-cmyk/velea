import { describe, it, expect } from 'vitest';
import { calculateFinalMode, getNakshatraModifier, getTithiPacing, moonSignToHouse, interactionBaseMode } from './interpreter';

// David's two-lens interaction base mode (2026-07-12). Virgo lagna (5), Scorpio natal Moon (7).
describe('interactionBaseMode — the two-lens precision model', () => {
  const V = 5, S = 7; // lagna Virgo, natal Moon Scorpio
  const quiet = { moonStrong: false, moonWeak: false, outwardRx: false };

  it('blends the two lenses and regresses to the middle when they disagree', () => {
    // Day Moon in Taurus (1): 9th from Virgo (Action) + 7th from Scorpio (Selective) → blend Build.
    const r = interactionBaseMode({ lagnaSignIdx: V, natalMoonSignIdx: S, dayMoonSignIdx: 1, ...quiet });
    expect(r.lagnaLens).toBe('Action');
    expect(r.chandraLens).toBe('Selective');
    expect(r.finalMode).toBe('Build');
  });

  it('a strong Moon floor-raises a contained day but NEVER manufactures Action', () => {
    // Cancer Moon (3): 11th/Action from Virgo, 9th/Action from Scorpio → blend Action. Strong Moon
    // must not push past Action; and on a Build blend it caps at Build.
    const strongOnAction = interactionBaseMode({ lagnaSignIdx: V, natalMoonSignIdx: S, dayMoonSignIdx: 3, moonStrong: true, moonWeak: false, outwardRx: false });
    expect(strongOnAction.finalMode).toBe('Action'); // already both-agree Action; lift can't exceed it
    // Sagittarius Moon (8): 4th/Restraint + 2nd/Flex → blend Selective; strong Moon lifts to Build (cap).
    const strongOnLow = interactionBaseMode({ lagnaSignIdx: V, natalMoonSignIdx: S, dayMoonSignIdx: 8, moonStrong: true, moonWeak: false, outwardRx: false });
    expect(strongOnLow.blend).toBe('Selective');
    expect(strongOnLow.finalMode).toBe('Build');
  });

  it('a weak Moon drags one step down', () => {
    const weak = interactionBaseMode({ lagnaSignIdx: V, natalMoonSignIdx: S, dayMoonSignIdx: 1, moonStrong: false, moonWeak: true, outwardRx: false });
    expect(weak.blend).toBe('Build');
    expect(weak.finalMode).toBe('Selective');
  });

  it('an outward retrograde caps at Build (no new Action) but leaves Build/Selective intact', () => {
    // Cancer Moon → blend Action; rx ceiling knocks it to Build.
    const rx = interactionBaseMode({ lagnaSignIdx: V, natalMoonSignIdx: S, dayMoonSignIdx: 3, moonStrong: false, moonWeak: false, outwardRx: true });
    expect(rx.blend).toBe('Action');
    expect(rx.finalMode).toBe('Build');
  });
});

describe('Mode Engine - calculateFinalMode (rule-based qualifier model)', () => {
  // CORE RULE: House transit = primary mode. Nakshatra and tithi never flip the mode.
  // finalMode === baseMode for all non-Flex modes. Qualifiers capture nuance instead.

  it('June 2, 2026: Restraint stays Restraint — single nakshatra cannot flip', () => {
    // House 4 = Restraint, Purva Ashadha (outward), Krishna Tritiya (inward)
    // nakshatra is outward but tithi is inward → field is Neutral → no flip
    const result = calculateFinalMode('Restraint', 'Purva Ashadha', 'Krishna Tritiya', 'Krishna');
    expect(result.baseMode).toBe('Restraint');
    expect(result.baseScore).toBe(0);
    expect(result.nakshatraModifier).toBe(1);
    expect(result.tithiModifier).toBe(-0.5);
    expect(result.fieldCondition).toBe('Neutral');
    expect(result.finalMode).toBe('Restraint'); // base mode preserved
    // Qualifier should describe assertive expression of Restraint
    expect(result.qualifier).toContain('Restraint');
  });

  it('Restraint stays Restraint with selective nakshatra + waxing tithi (only 2 of 3 layers)', () => {
    // Uttara Ashadha (focused) + Shukla Navami (outward) → field is Neutral → no flip
    const result = calculateFinalMode('Restraint', 'Uttara Ashadha', 'Shukla Navami', 'Shukla');
    expect(result.baseMode).toBe('Restraint');
    expect(result.finalMode).toBe('Restraint'); // base mode preserved
  });

  it('Action stays Action with expansion nakshatra + waxing tithi (already at max)', () => {
    // House 1 = Action, Rohini (outward), Shukla Panchami (outward)
    const result = calculateFinalMode('Action', 'Rohini', 'Shukla Panchami', 'Shukla');
    expect(result.baseMode).toBe('Action');
    expect(result.finalMode).toBe('Action'); // no higher mode exists
    expect(result.fieldCondition).toBe('Open');
  });

  it('Action stays Action with downgrade nakshatra + waning tithi (only 2 of 3 layers)', () => {
    // House 1 = Action, Ashlesha (inward), Krishna Dvitiya (inward)
    // field is NOT Restricted (needs strong restraint tithi too) → no flip
    const result = calculateFinalMode('Action', 'Ashlesha', 'Krishna Dvitiya', 'Krishna');
    expect(result.baseMode).toBe('Action');
    expect(result.nakshatraModifier).toBe(-1);
    expect(result.tithiModifier).toBe(-0.5);
    expect(result.finalMode).toBe('Action'); // base mode preserved (field not Restricted)
  });

  it('Build stays Build even when ALL THREE layers align downward (mode flips removed)', () => {
    // Mula (inward) + Krishna Ekadashi (inward + strong restraint) → field = Restricted
    // Previously this would flip Build → Selective; now baseMode is always preserved
    // to maintain Lagna-based personalization.
    const result = calculateFinalMode('Build', 'Mula', 'Krishna Ekadashi', 'Krishna');
    expect(result.baseMode).toBe('Build');
    expect(result.nakshatraModifier).toBe(-1);
    expect(result.fieldCondition).toBe('Restricted');
    expect(result.finalMode).toBe('Build'); // baseMode preserved — no flip
    expect(result.qualifier).toContain('Build');
  });

  it('Flex resolves to Build with expansion nakshatra + waxing tithi', () => {
    // Flex is intentionally transitional — resolves via rule-based logic
    const result = calculateFinalMode('Flex', 'Pushya', 'Shukla Dvitiya', 'Shukla');
    expect(result.baseMode).toBe('Flex');
    expect(result.finalMode).toBe('Build'); // Flex + upgrade + waxing → Build
  });

  it('Flex resolves to Selective with neutral nakshatra + waning tithi', () => {
    const result = calculateFinalMode('Flex', 'Mrigashira', 'Krishna Dvitiya', 'Krishna');
    expect(result.baseMode).toBe('Flex');
    expect(result.finalMode).toBe('Selective'); // Flex default = Selective
  });

  it('Restraint stays Restraint even with downgrade nakshatra + strong restraint tithi (already at min)', () => {
    // Restraint (0) + Mula (inward) + Krishna Amavasya (strong restraint)
    const result = calculateFinalMode('Restraint', 'Mula', 'Krishna Amavasya', 'Krishna');
    expect(result.finalScore).toBe(0);
    expect(result.finalMode).toBe('Restraint'); // no lower mode exists
  });

  it('qualifier always contains the finalMode name', () => {
    const r1 = calculateFinalMode('Restraint', 'Purva Ashadha', 'Krishna Tritiya', 'Krishna');
    expect(r1.qualifier).toContain('Restraint');
    const r2 = calculateFinalMode('Action', 'Rohini', 'Shukla Panchami', 'Shukla');
    expect(r2.qualifier).toContain('Action');
    const r3 = calculateFinalMode('Build', 'Hasta', 'Shukla Dvitiya', 'Shukla');
    expect(r3.qualifier).toContain('Build');
  });
});

describe('Mode Engine - moonSignToHouse', () => {
  it('should calculate house 4 for Sagittarius from Virgo lagna', () => {
    // Sagittarius index = 8, Virgo index = 5
    // (8 - 5 + 12) % 12 + 1 = 15 % 12 + 1 = 3 + 1 = 4
    expect(moonSignToHouse(8, 'Virgo')).toBe(4);
  });

  it('should calculate house 1 for Virgo from Virgo lagna', () => {
    expect(moonSignToHouse(5, 'Virgo')).toBe(1);
  });

  it('should calculate house 10 for Gemini from Virgo lagna', () => {
    // Gemini index = 2, Virgo index = 5
    // (2 - 5 + 12) % 12 + 1 = 9 % 12 + 1 = 9 + 1 = 10
    expect(moonSignToHouse(2, 'Virgo')).toBe(10);
  });
});

describe('Mode Engine - getNakshatraModifier', () => {
  it('should return correct modifier for Purva Ashadha', () => {
    const mod = getNakshatraModifier('Purva Ashadha');
    expect(mod.name).toBe('Purva Ashadha');
    expect(mod.modifierTags).toContain('momentum-building');
  });

  it('should handle case-insensitive lookup', () => {
    const mod = getNakshatraModifier('purva ashadha');
    expect(mod.name).toBe('Purva Ashadha');
  });

  it('should return fallback for unknown nakshatra', () => {
    const mod = getNakshatraModifier('NonexistentNakshatra');
    expect(mod.name).toBe('NonexistentNakshatra');
    expect(mod.behavioralQuality).toBe('neutral');
  });
});

describe('Mode Engine - getTithiPacing', () => {
  it('should return waxing pacing for Shukla paksha', () => {
    const pacing = getTithiPacing('Panchami', 'Shukla');
    expect(pacing.phase).toBe('waxing');
    expect(pacing.pacingLabel).toBe('Outward');
  });

  it('should return waning pacing for Krishna paksha', () => {
    const pacing = getTithiPacing('Tritiya', 'Krishna');
    expect(pacing.phase).toBe('waning');
    expect(pacing.pacingLabel).toBe('Inward');
  });
});
