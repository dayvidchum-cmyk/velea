/**
 * QUALIFIER BEHAVIORAL STYLES — Velea Guidance Engine
 *
 * Each qualifier maps to a distinct behavioral style that modifies HOW the
 * base mode expresses itself. These styles are composed with the base mode
 * guidance to produce differentiated output for every qualifier.
 *
 * Architecture:
 *   Base Mode answers: "What kind of work is favored today?"
 *   Qualifier answers: "What style of behavior is favored today?"
 *
 * Every field here is used in guidance generation:
 *   - recommendedBehavior: replaces the flat mode-only sentence
 *   - bestUseAdditions: appended to the mode × planet best-uses list
 *   - avoidAdditions: appended to the mode × planet avoid list
 *   - decisionStyle: how to make decisions today (used in reasoning)
 *   - emphasis: what to prioritize within the mode
 *   - questionForToday: the Daily Decision Question for this qualifier
 */

export interface QualifierStyle {
  /** One authoritative sentence: what to DO today given this mode + qualifier */
  recommendedBehavior: string;
  /** How decisions should be made today */
  decisionStyle: string;
  /** What to emphasize within the mode */
  emphasis: string;
  /** Additional best-use items specific to this qualifier */
  bestUseAdditions: string[];
  /** Additional avoid items specific to this qualifier */
  avoidAdditions: string[];
  /** The Daily Decision Question for this qualifier */
  questionForToday: string;
}

/**
 * Full qualifier style map.
 * Keys match the qualifier strings produced by QUALIFIER_MAP in interpreter.ts.
 */
export const QUALIFIER_STYLES: Record<string, QualifierStyle> = {

  // ─── ACTION qualifiers ──────────────────────────────────────────────────────

  "Full Action": {
    recommendedBehavior: "Move with full force — publish, launch, and claim visible ground without hesitation.",
    decisionStyle: "Act first, refine later. Momentum is the priority.",
    emphasis: "Maximum outward reach and high-visibility output.",
    bestUseAdditions: ["bold public moves", "simultaneous launches", "high-stakes outreach"],
    avoidAdditions: ["second-guessing", "waiting for perfect conditions", "internal-only work"],
    questionForToday: "What is ready to be launched, shared, or made fully visible today?",
  },

  "Directed Action": {
    recommendedBehavior: "Move outward with intention — choose your highest-leverage action and execute it precisely.",
    decisionStyle: "Select one clear target and commit fully before moving to the next.",
    emphasis: "Focused, purposeful output over scattered activity.",
    bestUseAdditions: ["targeted launches", "single-focus outreach", "precision execution"],
    avoidAdditions: ["spreading effort across too many fronts", "reactive action", "unfocused visibility"],
    questionForToday: "What single action, if completed today, would create the most forward movement?",
  },

  "Measured Action": {
    recommendedBehavior: "Move outward but pace yourself — advance visibility while respecting natural limits.",
    decisionStyle: "Check your resources before committing. Sustainable momentum over bursts.",
    emphasis: "Consistent, calibrated output that doesn't deplete reserves.",
    bestUseAdditions: ["steady progress on active initiatives", "measured outreach", "sustainable visibility"],
    avoidAdditions: ["overextension", "burning resources for short-term gain", "reactive launches"],
    questionForToday: "What can be moved forward today without overextending your current capacity?",
  },

  "Contained Action": {
    recommendedBehavior: "Take visible action within defined boundaries — advance what is already in motion without opening new fronts.",
    decisionStyle: "Only act on what is already scoped. Do not start new initiatives today.",
    emphasis: "Completing and advancing existing commitments rather than initiating.",
    bestUseAdditions: ["advancing existing projects", "closing open loops", "contained outreach"],
    avoidAdditions: ["new initiatives", "scope expansion", "impulsive launches"],
    questionForToday: "Which existing commitment can be advanced or completed today?",
  },

  "Precise Action": {
    recommendedBehavior: "Move outward with surgical accuracy — act only where you have clarity and a clear path.",
    decisionStyle: "Evaluate before executing. Precision over speed.",
    emphasis: "High-quality, well-targeted output over volume.",
    bestUseAdditions: ["precision outreach", "targeted launches", "quality-over-quantity execution"],
    avoidAdditions: ["broad campaigns", "acting without clear criteria", "volume-driven approaches"],
    questionForToday: "Where do you have enough clarity to act with precision today?",
  },

  "Selective Action": {
    recommendedBehavior: "Act only where the signal is strongest — choose the one opportunity that genuinely merits full commitment.",
    decisionStyle: "Say no to most things so you can say yes to the right one.",
    emphasis: "Discernment in what gets your action energy today.",
    bestUseAdditions: ["high-signal opportunities only", "selective outreach", "quality commitments"],
    avoidAdditions: ["broad outreach", "acting on weak signals", "spreading action across many targets"],
    questionForToday: "Which opportunity is strong enough to deserve your full action energy today?",
  },

  "Open Action": {
    recommendedBehavior: "Move freely and openly — this is a day for broad visibility, new connections, and expansive outreach.",
    decisionStyle: "Stay open to unexpected opportunities. Follow energy rather than plan.",
    emphasis: "Breadth, openness, and receptivity to new directions.",
    bestUseAdditions: ["new connections", "broad outreach", "exploratory initiatives", "open-ended visibility"],
    avoidAdditions: ["rigid planning", "closing off options prematurely", "over-structuring the day"],
    questionForToday: "What new direction or connection is worth exploring with full openness today?",
  },

  "Grounded Action": {
    recommendedBehavior: "Act from a stable foundation — advance visibility while staying anchored in what is real and proven.",
    decisionStyle: "Root decisions in evidence and existing strength. No speculation.",
    emphasis: "Reliable, grounded output that builds trust over time.",
    bestUseAdditions: ["proven approaches", "trust-building outreach", "evidence-based initiatives"],
    avoidAdditions: ["speculative moves", "untested approaches", "acting without a solid base"],
    questionForToday: "What proven strength can you make more visible or actionable today?",
  },

  // ─── BUILD qualifiers ───────────────────────────────────────────────────────

  "Expansive Build": {
    recommendedBehavior: "Build broadly — this is a day to expand the scope of what you are creating, not just refine it.",
    decisionStyle: "Think bigger. Add capacity, reach, and depth to existing structures.",
    emphasis: "Growth and expansion within the building process.",
    bestUseAdditions: ["expanding project scope", "adding new capabilities", "scaling existing systems"],
    avoidAdditions: ["over-refining small details", "staying too narrow", "refusing to grow the container"],
    questionForToday: "What existing structure could be meaningfully expanded or scaled today?",
  },

  "Productive Build": {
    recommendedBehavior: "Build with consistent output — this is a day for steady, high-volume creation and refinement.",
    decisionStyle: "Prioritize throughput. Move through the work list with discipline.",
    emphasis: "Volume, consistency, and forward progress on multiple fronts.",
    bestUseAdditions: ["batch work", "high-volume creation", "systematic progress", "clearing backlogs"],
    avoidAdditions: ["perfectionism", "getting stuck on one item", "low-output activities"],
    questionForToday: "What body of work can you advance most significantly through consistent effort today?",
  },

  "Corrective Build": {
    recommendedBehavior: "Build by fixing — identify what is broken, incomplete, or misaligned and repair it before adding more.",
    decisionStyle: "Diagnose before building. Fix the foundation before adding floors.",
    emphasis: "Quality and integrity of existing structures over new creation.",
    bestUseAdditions: ["debugging", "fixing structural problems", "quality audits", "correcting course"],
    avoidAdditions: ["adding new features before fixing existing ones", "ignoring known problems", "building on unstable foundations"],
    questionForToday: "What existing structure needs to be corrected or repaired before you build further?",
  },

  "Restrained Build": {
    recommendedBehavior: "Build within strict limits — do less, but do it with higher precision and intentionality.",
    decisionStyle: "Scope down aggressively. One well-built thing beats three half-built things.",
    emphasis: "Depth and quality within a tightly constrained scope.",
    bestUseAdditions: ["deep work on a single project", "high-precision refinement", "finishing what is started"],
    avoidAdditions: ["starting new projects", "scope creep", "spreading build energy too thin"],
    questionForToday: "What single project or structure deserves your deepest, most constrained focus today?",
  },

  "Precise Build": {
    recommendedBehavior: "Build with exactness — every element should be deliberate, accurate, and well-considered.",
    decisionStyle: "Measure twice, build once. Accuracy over speed.",
    emphasis: "Precision craftsmanship and attention to detail.",
    bestUseAdditions: ["detailed technical work", "precision editing", "careful system design", "meticulous refinement"],
    avoidAdditions: ["rushing", "approximate work", "cutting corners on quality"],
    questionForToday: "Where does your work most need precision and exactness today?",
  },

  "Focused Build": {
    recommendedBehavior: "Build with singular focus — choose the most important project and give it your full attention.",
    decisionStyle: "Single-task. Resist the pull of adjacent work.",
    emphasis: "Depth of focus on one priority over breadth across many.",
    bestUseAdditions: ["deep single-project work", "uninterrupted focus blocks", "concentrated development"],
    avoidAdditions: ["multitasking", "context switching", "splitting attention across projects"],
    questionForToday: "Which single project would benefit most from your complete, undivided focus today?",
  },

  "Active Build": {
    recommendedBehavior: "Build with energy and momentum — this is a day for active, engaged creation rather than slow refinement.",
    decisionStyle: "Move through the work with energy. Maintain momentum.",
    emphasis: "Energetic forward progress and active engagement with the work.",
    bestUseAdditions: ["high-energy creation sessions", "momentum-driven work", "active development"],
    avoidAdditions: ["passive or low-energy work", "over-deliberating", "slow-paced refinement"],
    questionForToday: "What can you build today with the most energy and forward momentum?",
  },

  "Steady Build": {
    recommendedBehavior: "Build with patience and consistency — slow, reliable progress compounds into significant results.",
    decisionStyle: "Pace yourself. Consistent daily effort over heroic bursts.",
    emphasis: "Reliability, consistency, and long-term compounding.",
    bestUseAdditions: ["consistent daily practice", "incremental progress", "long-term project advancement"],
    avoidAdditions: ["heroic sprints that deplete reserves", "inconsistent effort", "skipping foundational steps"],
    questionForToday: "What consistent, patient effort today will compound into something significant over time?",
  },

  // ─── SELECTIVE qualifiers ───────────────────────────────────────────────────

  "Expansive Selective": {
    recommendedBehavior: "Select broadly but with intention — this is a day to evaluate a wider field before committing to the best option.",
    decisionStyle: "Cast a wide net in evaluation, then commit to the strongest signal.",
    emphasis: "Broad awareness combined with eventual sharp selection.",
    bestUseAdditions: ["surveying the landscape", "evaluating multiple options", "broad relationship check-ins"],
    avoidAdditions: ["premature commitment", "ignoring options that haven't been considered", "narrow-field selection"],
    questionForToday: "What broader field of opportunity are you ready to survey and select from today?",
  },

  "Assertive Selective": {
    recommendedBehavior: "Select with confidence — make the call you have been deliberating and commit to it.",
    decisionStyle: "Trust your judgment. Stop deliberating and decide.",
    emphasis: "Decisive selection over continued evaluation.",
    bestUseAdditions: ["making pending decisions", "committing to chosen opportunities", "assertive follow-through"],
    avoidAdditions: ["continued deliberation on already-evaluated options", "second-guessing clear signals", "indecision"],
    questionForToday: "What decision have you been deliberating that is ready to be made today?",
  },

  "Cautious Selective": {
    recommendedBehavior: "Select carefully — do not commit until you have enough information. Patience is the right posture.",
    decisionStyle: "Gather more data before deciding. Premature commitment is the risk.",
    emphasis: "Due diligence and careful evaluation before any commitment.",
    bestUseAdditions: ["research before deciding", "information gathering", "careful vetting of options"],
    avoidAdditions: ["premature commitment", "acting on incomplete information", "rushing selection"],
    questionForToday: "What additional information do you need before making the right selection today?",
  },

  "Inward Selective": {
    recommendedBehavior: "Select from within — this is a day to evaluate internal priorities, values, and direction rather than external options.",
    decisionStyle: "Look inward before outward. Clarify what you actually want before selecting.",
    emphasis: "Internal clarity and values-alignment in the selection process.",
    bestUseAdditions: ["values clarification", "internal priority review", "reflection on what matters most"],
    avoidAdditions: ["external-only evaluation", "selecting based on others' expectations", "ignoring internal signals"],
    questionForToday: "What internal priority or value needs to guide your selections today?",
  },

  "Focused Selective": {
    recommendedBehavior: "Select with precision — identify the single most important opportunity and give it your complete attention.",
    decisionStyle: "One clear choice. Everything else waits.",
    emphasis: "Singular focus on the highest-quality opportunity.",
    bestUseAdditions: ["single-opportunity focus", "precision selection", "deep engagement with chosen priority"],
    avoidAdditions: ["splitting attention", "pursuing multiple opportunities simultaneously", "diluting focus"],
    questionForToday: "Which single opportunity deserves your complete, focused attention today?",
  },

  "Discerning Selective": {
    recommendedBehavior: "Select with high standards — only advance what genuinely meets your criteria. Let the rest wait.",
    decisionStyle: "Apply strict criteria. If it doesn't clearly qualify, it doesn't proceed.",
    emphasis: "Quality over quantity in what gets your engagement.",
    bestUseAdditions: ["high-standards evaluation", "quality filtering", "advancing only what truly qualifies"],
    avoidAdditions: ["lowering standards under pressure", "advancing mediocre opportunities", "compromising criteria"],
    questionForToday: "Which opportunity, relationship, or project genuinely meets your highest standards today?",
  },

  "Outward Selective": {
    recommendedBehavior: "Select from the external landscape — evaluate what is coming toward you and choose the best of what is available.",
    decisionStyle: "Be receptive to incoming opportunities. Evaluate what presents itself.",
    emphasis: "Responsiveness to external signals and incoming opportunities.",
    bestUseAdditions: ["responding to incoming opportunities", "evaluating what is presenting itself", "receptive selection"],
    avoidAdditions: ["forcing opportunities that aren't coming naturally", "ignoring inbound signals", "over-initiating"],
    questionForToday: "What is presenting itself to you right now that deserves careful evaluation and selection?",
  },

  "Quiet Selective": {
    recommendedBehavior: "Select in silence — this is a day for careful, private evaluation without external pressure or noise.",
    decisionStyle: "Reduce input before deciding. Quiet deliberation over reactive selection.",
    emphasis: "Stillness, reflection, and unhurried evaluation.",
    bestUseAdditions: ["quiet reflection on options", "private deliberation", "unhurried evaluation"],
    avoidAdditions: ["making decisions under social pressure", "reactive selection", "rushing to choose"],
    questionForToday: "What decision benefits most from quiet, unhurried reflection today?",
  },

  // ─── RESTRAINT qualifiers ───────────────────────────────────────────────────

  "Assertive Restraint": {
    recommendedBehavior: "Contain with confidence — actively choose what to protect, repair, and stabilize rather than passively holding back.",
    decisionStyle: "Restraint is a deliberate act. Decide what to defend and do it with full commitment.",
    emphasis: "Active, intentional containment rather than passive withdrawal.",
    bestUseAdditions: ["actively protecting key assets", "confident boundary-setting", "deliberate stabilization"],
    avoidAdditions: ["passive avoidance", "waiting without intention", "restraint without purpose"],
    questionForToday: "What do you need to actively protect, defend, or stabilize today?",
  },

  "Productive Restraint": {
    recommendedBehavior: "Use restraint productively — channel the contained energy into repair, refinement, and completion of existing work.",
    decisionStyle: "Don't launch outward. Direct all energy into improving what already exists.",
    emphasis: "High-output refinement and repair within a contained scope.",
    bestUseAdditions: ["repair and refinement work", "completing unfinished projects", "productive containment"],
    avoidAdditions: ["new launches", "outward expansion", "starting what can't be finished"],
    questionForToday: "What existing work can be meaningfully repaired, refined, or completed today?",
  },

  "Cautious Restraint": {
    recommendedBehavior: "Hold carefully — this is a day to avoid risk, protect what you have, and wait for clearer conditions.",
    decisionStyle: "When in doubt, don't. Caution is the correct posture.",
    emphasis: "Risk avoidance and protection of existing assets.",
    bestUseAdditions: ["risk assessment", "protecting existing assets", "cautious review of commitments"],
    avoidAdditions: ["any new risk", "commitments under uncertainty", "acting on incomplete information"],
    questionForToday: "What risk or exposure needs to be reduced or protected against today?",
  },

  "Deep Restraint": {
    recommendedBehavior: "Go deep into stillness — this is a day for profound internal work, not surface-level activity.",
    decisionStyle: "Withdraw from the surface. The real work today is internal.",
    emphasis: "Depth of reflection, integration, and internal processing.",
    bestUseAdditions: ["deep reflection", "internal integration", "solitary contemplative work", "processing unresolved matters"],
    avoidAdditions: ["surface-level activity", "social engagement", "outward-facing work", "forcing external results"],
    questionForToday: "What internal matter needs your deepest attention and stillness today?",
  },

  "Discerning Restraint": {
    recommendedBehavior: "Hold back with discernment — choose carefully what to protect and what to release. Not everything deserves containment.",
    decisionStyle: "Apply judgment to what gets your restraint energy. Some things should be let go.",
    emphasis: "Selective application of restraint — protect the right things, release the rest.",
    bestUseAdditions: ["discerning what to keep vs. release", "selective protection", "letting go of what no longer serves"],
    avoidAdditions: ["protecting everything indiscriminately", "refusing to release what should go", "undiscriminating containment"],
    questionForToday: "What deserves to be protected today, and what is ready to be released?",
  },

  "Corrective Restraint": {
    recommendedBehavior: "Restrain in order to correct — pull back from what isn't working and redirect toward what does.",
    decisionStyle: "Diagnose the error before correcting. Restraint is the first step in repair.",
    emphasis: "Correction, course adjustment, and structural repair.",
    bestUseAdditions: ["identifying and correcting errors", "course adjustment", "structural repair", "redirecting misaligned efforts"],
    avoidAdditions: ["continuing what isn't working", "ignoring signals that correction is needed", "forcing broken systems"],
    questionForToday: "What needs to be corrected, redirected, or repaired before you can move forward?",
  },

  "Contained Restraint": {
    recommendedBehavior: "Stay within your current boundaries — do not expand scope, commitments, or exposure today.",
    decisionStyle: "Honor existing limits. The container is the right size.",
    emphasis: "Maintaining current boundaries without shrinking or expanding.",
    bestUseAdditions: ["working within current scope", "honoring existing commitments", "maintaining current structures"],
    avoidAdditions: ["expanding scope", "taking on new commitments", "exceeding current capacity"],
    questionForToday: "What can be accomplished well within your current boundaries and commitments today?",
  },

  "Still Restraint": {
    recommendedBehavior: "Be still — this is a day for minimal action, quiet presence, and allowing things to settle.",
    decisionStyle: "Do less. The most important thing today is what you don't do.",
    emphasis: "Stillness, non-action, and allowing natural processes to complete.",
    bestUseAdditions: ["rest and recovery", "allowing things to settle", "minimal necessary action only"],
    avoidAdditions: ["forcing activity", "filling silence with unnecessary action", "reactive doing"],
    questionForToday: "What would benefit most from stillness and non-intervention today?",
  },
};

/**
 * Look up a qualifier style by exact name.
 * Falls back to a mode-derived default if the qualifier is not found.
 */
export function getQualifierStyle(qualifier: string, fallbackMode: string): QualifierStyle {
  if (QUALIFIER_STYLES[qualifier]) return QUALIFIER_STYLES[qualifier];

  // Fallback: derive a reasonable style from the base mode
  const FALLBACK_BY_MODE: Record<string, QualifierStyle> = {
    Action: {
      recommendedBehavior: "Move outward, publish, launch, and increase visibility.",
      decisionStyle: "Act with intention. Momentum is the priority.",
      emphasis: "Outward movement and visible progress.",
      bestUseAdditions: [],
      avoidAdditions: [],
      questionForToday: "What is ready to be shared, launched, or made visible today?",
    },
    Build: {
      recommendedBehavior: "Create, refine, and strengthen long-term assets.",
      decisionStyle: "Build with purpose. Quality and consistency matter.",
      emphasis: "Steady creation and refinement.",
      bestUseAdditions: [],
      avoidAdditions: [],
      questionForToday: "What existing structure would benefit most from focused development today?",
    },
    Selective: {
      recommendedBehavior: "Choose carefully and advance existing relationships or opportunities.",
      decisionStyle: "Select with discernment. Not everything deserves your attention.",
      emphasis: "Quality selection over broad engagement.",
      bestUseAdditions: [],
      avoidAdditions: [],
      questionForToday: "Which opportunity, relationship, or project deserves your attention today?",
    },
    Restraint: {
      recommendedBehavior: "Correct, review, repair, and stabilize existing structures.",
      decisionStyle: "Hold back. Stabilization is the priority.",
      emphasis: "Repair and containment over expansion.",
      bestUseAdditions: [],
      avoidAdditions: [],
      questionForToday: "What should be stabilized, repaired, protected, or completed before moving forward?",
    },
  };

  return FALLBACK_BY_MODE[fallbackMode] ?? FALLBACK_BY_MODE["Selective"];
}
