/**
 * Time Lord Influence Engine (Experimental / Advisory Layer)
 *
 * PURPOSE: Generate Best Uses Today and Avoid Today based on the interaction
 * between the current day's final mode, qualifier, and the annual Time Lord chain.
 *
 * IMPORTANT: This is a DIAGNOSTIC / ADVISORY layer only.
 * It does NOT change the final mode. The mode engine remains authoritative.
 *
 * Architecture:
 *   1. Receive: finalMode, qualifier, timeLord, natalSign, natalNakshatra, natalHouse
 *   2. Look up planet archetype (what Venus/Mercury/etc. governs)
 *   3. Intersect with mode (what Restraint/Build/Selective/Action calls for)
 *   4. Intersect with qualifier (how the mode expresses itself today)
 *   5. Return: timeLordLabel, bestUses, avoidToday, reasoning
 */

import type { TaskMode } from "../../shared/types.js";
import { getQualifierStyle } from "./qualifier-styles.js";

// ─── Planet Archetypes ────────────────────────────────────────────────────────
// Each planet governs a domain of activity. These are the raw materials
// that the Time Lord brings into focus for the year.

interface PlanetArchetype {
  label: string;
  domains: string[];       // What this planet governs (activity domains)
  supportedModes: TaskMode[]; // Modes where this planet naturally thrives
  resistedModes: TaskMode[];  // Modes where this planet creates friction
  qualifiers: Record<string, string[]>; // Extra best-uses per qualifier keyword
}

const PLANET_ARCHETYPES: Record<string, PlanetArchetype> = {
  Sun: {
    label: "Sun Year",
    domains: ["leadership", "identity", "authority", "visibility", "recognition", "vitality", "father figures", "government"],
    supportedModes: ["Action", "Build"],
    resistedModes: ["Restraint"],
    qualifiers: {
      productive: ["consolidating authority", "defining your role", "clarifying your identity"],
      assertive: ["stepping into leadership", "public visibility", "taking ownership"],
      discerning: ["evaluating who deserves your energy", "selective visibility"],
    },
  },
  Moon: {
    label: "Moon Year",
    domains: ["emotional intelligence", "habits", "home", "nurturing", "public perception", "cycles", "mother figures", "memory"],
    supportedModes: ["Restraint", "Selective"],
    resistedModes: ["Action"],
    qualifiers: {
      productive: ["emotional processing", "home and family work", "habit refinement"],
      receptive: ["listening deeply", "nurturing existing relationships", "rest and recovery"],
      discerning: ["choosing which emotional patterns to keep", "selective social engagement"],
    },
  },
  Mars: {
    label: "Mars Year",
    domains: ["initiative", "physical energy", "competition", "courage", "conflict", "technical skill", "brothers", "real estate"],
    supportedModes: ["Action", "Build"],
    resistedModes: ["Restraint", "Selective"],
    qualifiers: {
      productive: ["directed technical work", "physical training", "competitive preparation"],
      assertive: ["initiating projects", "direct confrontation of obstacles", "physical output"],
      focused: ["precision work", "skill sharpening", "strategic planning"],
    },
  },
  Mercury: {
    label: "Mercury Year",
    domains: ["communication", "writing", "analysis", "learning", "commerce", "networking", "siblings & close circle", "short travel", "documentation"],
    supportedModes: ["Build", "Selective"],
    resistedModes: [],
    qualifiers: {
      productive: ["writing", "documentation", "system design", "process mapping"],
      analytical: ["research", "data analysis", "problem-solving", "learning new skills"],
      discerning: ["editing", "refining communication", "selective networking"],
    },
  },
  Jupiter: {
    label: "Jupiter Year",
    domains: ["expansion", "wisdom", "teaching", "philosophy", "law", "higher education", "long travel", "abundance", "mentors"],
    supportedModes: ["Action", "Build", "Selective"],
    resistedModes: [],
    qualifiers: {
      productive: ["education", "teaching", "publishing", "expanding knowledge base"],
      expansive: ["new ventures", "long-term planning", "seeking mentors", "travel"],
      discerning: ["choosing which opportunities to pursue", "philosophical refinement"],
    },
  },
  Venus: {
    label: "Venus Year",
    domains: ["relationships", "aesthetics", "creative work", "design", "skill refinement", "pleasure", "finance", "women", "art", "beauty"],
    supportedModes: ["Build", "Selective", "Restraint"],
    resistedModes: [],
    qualifiers: {
      productive: ["system building", "process refinement", "design work", "skill development", "documentation"],
      discerning: ["evaluating relationships", "refining aesthetics", "selective social engagement"],
      assertive: ["creative output", "relationship work", "financial planning"],
      receptive: ["appreciating beauty", "deepening existing relationships", "artistic refinement"],
    },
  },
  Saturn: {
    label: "Saturn Year",
    domains: ["discipline", "structure", "long-term work", "karma", "delays", "boundaries", "elderly", "service", "responsibility"],
    supportedModes: ["Restraint", "Build"],
    resistedModes: ["Action"],
    qualifiers: {
      productive: ["structural work", "long-term project advancement", "establishing systems", "eliminating waste"],
      disciplined: ["consistent daily practice", "boundary setting", "responsibility fulfillment"],
      discerning: ["deciding what structures to keep or discard", "strategic patience"],
    },
  },
  Rahu: {
    label: "Rahu Year",
    domains: ["ambition", "obsession", "foreign connections", "technology", "unconventional paths", "sudden changes", "material desire"],
    supportedModes: ["Action", "Build"],
    resistedModes: ["Restraint"],
    qualifiers: {
      productive: ["technology work", "unconventional approaches", "ambitious planning"],
      assertive: ["bold moves", "foreign or unusual connections", "breaking patterns"],
      discerning: ["evaluating which ambitions are worth pursuing", "distinguishing desire from need"],
    },
  },
  Ketu: {
    label: "Ketu Year",
    domains: ["spirituality", "detachment", "past-life skills", "research", "isolation", "moksha", "dissolution", "hidden knowledge"],
    supportedModes: ["Restraint", "Selective"],
    resistedModes: ["Action"],
    qualifiers: {
      productive: ["research", "spiritual practice", "accessing innate skills", "solitary deep work"],
      receptive: ["meditation", "detachment from outcomes", "inner work"],
      discerning: ["releasing what no longer serves", "spiritual discernment"],
    },
  },
};

// ─── Mode × Planet Best Uses Matrix ──────────────────────────────────────────
// What each planet recommends doing in each mode

const MODE_PLANET_BEST_USES: Record<TaskMode, Record<string, string[]>> = {
  Restraint: {
    Sun: ["Consolidate authority quietly", "Clarify your role without seeking recognition", "Protect your reputation", "Internal leadership work"],
    Moon: ["Emotional processing", "Home and family care", "Habit refinement", "Rest and recovery", "Nurturing existing bonds"],
    Mars: ["Directed technical skill work", "Physical maintenance", "Defensive preparation", "Precision tasks"],
    Mercury: ["Documentation", "Editing and refining communication", "Research", "Process mapping", "Internal analysis"],
    Jupiter: ["Study and learning", "Philosophical reflection", "Mentorship (receiving)", "Long-term planning"],
    Venus: ["System building", "Process refinement", "Design work", "Education", "Documentation", "Skill development", "Existing project advancement"],
    Saturn: ["Structural maintenance", "Long-term project work", "Establishing boundaries", "Eliminating waste", "Consistent daily practice"],
    Rahu: ["Technology refinement", "Research into unconventional approaches", "Quiet ambitious planning"],
    Ketu: ["Spiritual practice", "Research", "Solitary deep work", "Accessing innate skills", "Inner work"],
  },
  Selective: {
    Sun: ["Selective visibility", "Evaluating who deserves your authority", "Targeted recognition efforts"],
    Moon: ["Choosing which emotional patterns to keep", "Selective social engagement", "Deepening key relationships"],
    Mars: ["Strategic planning", "Skill sharpening", "Selective competitive engagement"],
    Mercury: ["Editing", "Refining communication", "Selective networking", "Targeted learning"],
    Jupiter: ["Choosing which opportunities to pursue", "Selective expansion", "Deepening existing knowledge"],
    Venus: ["Evaluating relationships", "Refining aesthetics", "Selective creative output", "Financial evaluation"],
    Saturn: ["Deciding what structures to keep or discard", "Strategic patience", "Selective responsibility"],
    Rahu: ["Evaluating which ambitions are worth pursuing", "Distinguishing desire from need"],
    Ketu: ["Releasing what no longer serves", "Spiritual discernment", "Selective detachment"],
  },
  Build: {
    Sun: ["Building your public profile", "Establishing authority", "Consistent visible output"],
    Moon: ["Building emotional resilience", "Establishing home routines", "Consistent nurturing"],
    Mars: ["Initiating projects", "Physical training", "Building technical skills", "Competitive preparation"],
    Mercury: ["Writing", "Documentation", "System design", "Building communication channels", "Learning new skills"],
    Jupiter: ["Education", "Teaching", "Publishing", "Building knowledge base", "Expanding networks"],
    Venus: ["Creative project development", "Skill building", "Relationship deepening", "Aesthetic refinement", "Financial growth"],
    Saturn: ["Structural work", "Long-term project advancement", "Building systems", "Consistent daily practice"],
    Rahu: ["Technology projects", "Ambitious building", "Unconventional ventures", "Foreign connections"],
    Ketu: ["Building on innate skills", "Research projects", "Spiritual practice development"],
  },
  Action: {
    Sun: ["Public leadership", "Taking ownership", "Stepping into authority", "High-visibility initiatives"],
    Moon: ["Emotional expression", "Public-facing nurturing work", "Community engagement"],
    Mars: ["Initiating bold moves", "Physical output", "Direct confrontation of obstacles", "Competitive action"],
    Mercury: ["Launching communications", "Networking aggressively", "Publishing", "Commerce"],
    Jupiter: ["New ventures", "Long-term planning", "Seeking mentors", "Travel", "Teaching"],
    Venus: ["Creative launches", "Relationship initiatives", "Financial action", "Public aesthetic work"],
    Saturn: ["Executing long-planned structures", "Taking responsibility publicly", "Major commitments"],
    Rahu: ["Bold unconventional moves", "Technology launches", "Foreign initiatives", "Breaking patterns"],
    Ketu: ["Acting on spiritual insights", "Research publication", "Using innate skills publicly"],
  },
};

// ─── Mode × Planet Avoid Today Matrix ────────────────────────────────────────

const MODE_PLANET_AVOID: Record<TaskMode, Record<string, string[]>> = {
  Restraint: {
    Sun: ["New launches", "Public announcements", "Seeking recognition", "Overextending authority"],
    Moon: ["Emotional reactivity", "Overcommitting to others", "Ignoring rest needs"],
    Mars: ["Aggressive confrontation", "Impulsive action", "Overexertion", "Starting new conflicts"],
    Mercury: ["Overcommitting to communication", "Spreading information too widely", "Impulsive decisions"],
    Jupiter: ["Overexpansion", "New commitments", "Premature launches", "Overconfidence"],
    Venus: ["New launches", "Public announcements", "Major commitments", "Reactive decision making"],
    Saturn: ["Rushing", "Cutting corners on structure", "Ignoring boundaries", "Overcommitting"],
    Rahu: ["Impulsive ambition", "Chasing new desires", "Overreaching", "Reactive changes"],
    Ketu: ["Forcing outcomes", "Ignoring spiritual signals", "Overattachment to results"],
  },
  Selective: {
    Sun: ["Overexposure", "Seeking broad recognition", "Diluting authority"],
    Moon: ["Emotional overcommitment", "Spreading nurturing too thin", "Ignoring intuition"],
    Mars: ["Broad confrontation", "Unfocused action", "Overexertion"],
    Mercury: ["Information overload", "Unfocused networking", "Spreading too thin"],
    Jupiter: ["Overexpansion", "Saying yes to everything", "Premature commitment"],
    Venus: ["Overcommitting socially", "Chasing new relationships", "Impulsive financial decisions"],
    Saturn: ["Rigidity", "Refusing to adapt structure", "Overcommitting to old patterns"],
    Rahu: ["Chasing every opportunity", "Unfocused ambition", "Reactive changes"],
    Ketu: ["Forced detachment", "Ignoring practical needs", "Excessive isolation"],
  },
  Build: {
    Sun: ["Seeking premature recognition", "Overexposure before ready", "Authority conflicts"],
    Moon: ["Emotional instability", "Neglecting home base", "Overcommitting emotionally"],
    Mars: ["Reckless action", "Skipping preparation", "Unnecessary conflicts"],
    Mercury: ["Scattered communication", "Overcommitting to too many projects", "Shallow learning"],
    Jupiter: ["Overexpansion beyond capacity", "Premature teaching", "Overconfidence"],
    Venus: ["Neglecting existing relationships", "Chasing new aesthetics without finishing current work", "Impulsive spending"],
    Saturn: ["Rushing structure", "Cutting corners", "Ignoring long-term implications"],
    Rahu: ["Reckless ambition", "Overreaching", "Chasing novelty over substance"],
    Ketu: ["Excessive detachment from the project", "Ignoring practical requirements"],
  },
  Action: {
    Sun: ["Ego-driven decisions", "Overexposure", "Authority conflicts"],
    Moon: ["Emotional reactivity driving decisions", "Overcommitting emotionally", "Neglecting rest"],
    Mars: ["Recklessness", "Unnecessary aggression", "Burning out"],
    Mercury: ["Information overload", "Overcommitting to communication", "Scattered focus"],
    Jupiter: ["Overexpansion", "Overconfidence", "Premature commitment to too many things"],
    Venus: ["Neglecting relationships in pursuit of action", "Impulsive financial decisions", "Overcommitting socially"],
    Saturn: ["Ignoring structure in pursuit of speed", "Cutting corners", "Overcommitting"],
    Rahu: ["Reckless ambition", "Overreaching", "Chasing every new opportunity"],
    Ketu: ["Excessive detachment", "Ignoring practical action needs", "Forced spirituality"],
  },
};

// ─── Natal House Modifiers ────────────────────────────────────────────────────
// The natal house of the Time Lord adds a thematic layer to the best uses

const NATAL_HOUSE_CONTEXT: Record<number, { theme: string; bestUseAddition: string[] }> = {
  1: { theme: "self and identity", bestUseAddition: ["personal development", "identity work", "self-presentation"] },
  2: { theme: "resources and values", bestUseAddition: ["financial management", "skill monetization", "resource allocation"] },
  3: { theme: "communication, siblings & close circle", bestUseAddition: ["writing", "short-form communication", "local connections"] },
  4: { theme: "home and foundation", bestUseAddition: ["home environment work", "foundational stability", "family matters"] },
  5: { theme: "creativity and expression", bestUseAddition: ["creative projects", "self-expression", "speculative work"] },
  6: { theme: "service and refinement", bestUseAddition: ["service work", "health routines", "skill refinement", "process improvement"] },
  7: { theme: "partnerships and contracts", bestUseAddition: ["relationship work", "contracts", "partnership evaluation"] },
  8: { theme: "transformation and depth", bestUseAddition: ["deep research", "transformation work", "financial restructuring"] },
  9: { theme: "philosophy and expansion", bestUseAddition: ["higher learning", "philosophical work", "long-term vision"] },
  10: { theme: "career and public role", bestUseAddition: ["career advancement", "public-facing work", "professional development"] },
  11: { theme: "networks and goals", bestUseAddition: ["community building", "goal setting", "network cultivation"] },
  12: { theme: "solitude and release", bestUseAddition: ["solitary work", "spiritual practice", "releasing old patterns"] },
};

// ─── Recommended Behavior ───────────────────────────────────────────────────
// Derived from qualifier styles — see qualifier-styles.ts.
// The flat RECOMMENDED_BEHAVIOR map is kept as a fallback only.

const RECOMMENDED_BEHAVIOR_FALLBACK: Record<TaskMode, string> = {
  Restraint: "Correct, review, repair, and stabilize existing structures.",
  Build:     "Create, refine, and strengthen long-term assets.",
  Selective: "Choose carefully and advance existing relationships or opportunities.",
  Action:    "Move outward, publish, launch, and increase visibility.",
};

// ─── Main Generator ───────────────────────────────────────────────────────────

export interface TimeLordInfluenceInput {
  finalMode: TaskMode;
  qualifier: string;
  timeLord: string;
  natalSign: string;
  natalNakshatra: string | null;
  natalHouse: number;
  activatedHouse: number;
  activatedSign: string;
}

export interface TimeLordInfluenceOutput {
  timeLordLabel: string;
  operationalChain: string;
  recommendedBehavior: string;
  bestUses: string[];
  avoidToday: string[];
  reasoning: string;
  natalContext: string;
}

export function generateTimeLordInfluence(input: TimeLordInfluenceInput): TimeLordInfluenceOutput {
  const {
    finalMode,
    qualifier,
    timeLord,
    natalSign,
    natalNakshatra,
    natalHouse,
    activatedHouse,
    activatedSign,
  } = input;

  const archetype = PLANET_ARCHETYPES[timeLord] ?? PLANET_ARCHETYPES["Mercury"];
  const modeKey = finalMode in MODE_PLANET_BEST_USES ? finalMode : "Selective";

  // Base best uses from mode × planet matrix
  const baseBestUses = MODE_PLANET_BEST_USES[modeKey][timeLord] ?? archetype.domains.slice(0, 5);
  const baseAvoid = MODE_PLANET_AVOID[modeKey][timeLord] ?? ["Overextending", "Reactive decisions"];

  // Add natal house context to best uses
  const natalHouseCtx = NATAL_HOUSE_CONTEXT[natalHouse] ?? NATAL_HOUSE_CONTEXT[6];
  const houseAdditions = natalHouseCtx.bestUseAddition;

  // Merge and deduplicate best uses (cap at 7)
  const allBestUses = [...baseBestUses, ...houseAdditions];
  const bestUses = Array.from(new Set(allBestUses)).slice(0, 7);

  // ── Qualifier style layer ──────────────────────────────────────────────────
  // The qualifier determines HOW the base mode expresses itself today.
  // It overrides the flat mode-only recommendedBehavior and enriches best-uses/avoid.
  const qualStyle = getQualifierStyle(qualifier, finalMode);

  // Merge qualifier best-use additions (deduplicated, cap at 8)
  const allBestUsesWithQualifier = [...bestUses, ...qualStyle.bestUseAdditions];
  const bestUsesWithQualifier = Array.from(new Set(allBestUsesWithQualifier)).slice(0, 8);

  // Merge qualifier avoid additions (deduplicated, cap at 6)
  const allAvoidWithQualifier = [...baseAvoid, ...qualStyle.avoidAdditions];
  const avoidWithQualifier = Array.from(new Set(allAvoidWithQualifier)).slice(0, 6);

  // Build operational chain label
  const operationalChain = `${activatedHouse}th House → ${activatedSign} → ${timeLord} → ${natalSign}${natalNakshatra ? ` (${natalNakshatra})` : ""} → ${natalHouse}th House`;

  // Build reasoning string — now includes qualifier decision style
  const modeAlignment = archetype.supportedModes.includes(finalMode)
    ? `${timeLord} naturally supports ${finalMode} mode`
    : archetype.resistedModes.includes(finalMode)
    ? `${timeLord} creates some friction with ${finalMode} mode — focus on ${timeLord}'s domains within the mode's constraints`
    : `${timeLord} is neutral with ${finalMode} mode`;

  const reasoning = `${modeAlignment}. Natal ${timeLord} in ${natalSign} (${natalHouseCtx.theme}) channels the year's energy through ${natalHouseCtx.theme}. Decision style today: ${qualStyle.decisionStyle}`;

  const natalContext = `Natal ${timeLord} in ${natalSign}${natalNakshatra ? `, ${natalNakshatra}` : ""} — ${natalHouse}th house (${natalHouseCtx.theme})`;

  return {
    timeLordLabel: archetype.label,
    operationalChain,
    // Qualifier-aware recommended behavior (not flat mode-only)
    recommendedBehavior: qualStyle.recommendedBehavior,
    bestUses: bestUsesWithQualifier,
    avoidToday: avoidWithQualifier,
    reasoning,
    natalContext,
  };
}
