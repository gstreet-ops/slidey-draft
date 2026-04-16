// Pick Commentary Engine — Template-based analysis notes for mock drafts
// Pure functions, no DB or API dependencies

import type { CombinedPickGrade, MockDraftGrade, LetterGrade } from "./mock-grading";

type PickInfo = {
  pickNumber: number;
  playerName: string;
  playerPosition: string;
  playerGrade: number | null;
  playerRank: number | null;
  playerPositionRank: number | null;
  playerNflComparison: string | null;
  teamName: string;
  teamAbbreviation: string;
};

type BoardContext = {
  picksSoFar: Array<{ position: string; pickNumber: number }>;
  totalPicks: number;
};

// Deterministic "random" from seed
function seededIndex(seed: number, length: number): number {
  const hash = ((seed * 2654435761) >>> 0) % length;
  return hash;
}

function pickSeed(pickNumber: number, playerNameLength: number): number {
  return pickNumber * 31 + playerNameLength * 17;
}

// ── Grade Reaction Templates ──────────────────────────────

const STEAL_TEMPLATES = [
  (p: PickInfo) => `${p.playerName} at #${p.pickNumber}? Most boards have him at #${p.playerRank ?? "??"}. Absolute robbery.`,
  (p: PickInfo) => `If ${p.playerName} actually falls to #${p.pickNumber}, you win the draft right here.`,
  (p: PickInfo) => `${p.playerName} is a top-${p.playerRank ?? "??"} talent at #${p.pickNumber}. This is the kind of pick that wins pools.`,
  (p: PickInfo) => {
    const rankDelta = p.pickNumber - (p.playerRank ?? p.pickNumber);
    return `#${p.playerPositionRank ?? "??"} ${p.playerPosition} on the board, going ${Math.abs(rankDelta)} picks later than consensus. Chef's kiss.`;
  },
];

const GREAT_VALUE_TEMPLATES = [
  (p: PickInfo) => `Smart pick. ${p.playerName} is right in the sweet spot at #${p.pickNumber}.`,
  (p: PickInfo) => `${p.playerName} at #${p.pickNumber} is textbook BPA drafting. Hard to argue with this one.`,
  (p: PickInfo) => `Consensus has ${p.playerName} around #${p.playerRank ?? "??"}. Getting him at #${p.pickNumber} is solid value.`,
];

const SOLID_TEMPLATES = [
  (p: PickInfo) => `${p.playerName} to ${p.teamAbbreviation} at #${p.pickNumber} — chalk, but chalk for a reason.`,
  (p: PickInfo) => `No surprises here. ${p.playerName} is exactly where most boards have him.`,
  (p: PickInfo) => `Safe pick. ${p.playerName} at #${p.pickNumber} won't win you any style points, but it's hard to fault.`,
];

const REASONABLE_TEMPLATES = [
  (p: PickInfo) => `${p.playerName} at #${p.pickNumber} is fine. Not flashy, not a reach. Middle of the road.`,
  (p: PickInfo) => `${p.teamAbbreviation} could do worse than ${p.playerName} here. Solid if unspectacular.`,
  (p: PickInfo) => `This is a perfectly cromulent pick. ${p.playerName} is a reasonable projection at #${p.pickNumber}.`,
];

const SLIGHT_REACH_TEMPLATES = [
  (p: PickInfo) => `Starting to reach a bit. ${p.playerName} is more of a #${p.playerRank ?? "??"} guy on most boards.`,
  (p: PickInfo) => `${p.playerName} at #${p.pickNumber} is a few slots early. Not crazy, but you're paying a premium.`,
  (p: PickInfo) => `You believe in ${p.playerName} more than the consensus does. Could pay off, could cost you.`,
];

const REACH_TEMPLATES = [
  (p: PickInfo) => `${p.playerName} at #${p.pickNumber}? Consensus says #${p.playerRank ?? "??"}. That's a reach.`,
  (p: PickInfo) => `Bold. ${p.playerName} is a Day 2 value at a Day 1 price. Hope you know something we don't.`,
  (p: PickInfo) => `This is a classic "I watched the tape" pick. The numbers say reach.`,
];

const BIG_REACH_TEMPLATES = [
  (p: PickInfo) => `${p.playerName} at #${p.pickNumber} is a significant reach. Most boards don't have him in Round 1.`,
  (p: PickInfo) => `Whoa. ${p.playerName} has a grade of ${p.playerGrade ?? "??"} and you're taking him at #${p.pickNumber}? Brave.`,
  (p: PickInfo) => `This pick will either look genius or be your pool's punchline. No in-between.`,
];

const BUST_TEMPLATES = [
  (p: PickInfo) => `${p.playerName} at #${p.pickNumber}. You're either trolling or you have elite insider info.`,
  (p: PickInfo) => `We're going to pretend we didn't see this one. ${p.playerName} at #${p.pickNumber} is... a choice.`,
  (p: PickInfo) => `This is the kind of pick that makes your pool mates text the group chat immediately.`,
];

const GRADE_TEMPLATES: Record<LetterGrade, Array<(p: PickInfo) => string>> = {
  "A+": STEAL_TEMPLATES,
  A: GREAT_VALUE_TEMPLATES,
  "B+": SOLID_TEMPLATES,
  B: REASONABLE_TEMPLATES,
  "C+": SLIGHT_REACH_TEMPLATES,
  C: REACH_TEMPLATES,
  D: BIG_REACH_TEMPLATES,
  F: BUST_TEMPLATES,
};

// ── Context Observations ──────────────────────────────────

function buildContextObservation(pick: PickInfo, grade: CombinedPickGrade, ctx: BoardContext): string {
  const parts: string[] = [];

  const pos = pick.playerPosition;
  const PREMIUM = ["QB", "EDGE", "OT"];
  const MEME = ["K", "P", "FB"];

  // Position run detection
  const recentWindow = ctx.picksSoFar.slice(-5);
  const recentSamePos = recentWindow.filter((p) => p.position === pos).length;
  const totalAtPosition = ctx.picksSoFar.filter((p) => p.position === pos).length;

  if (recentSamePos >= 2) {
    parts.push(`You're loading up on ${pos}s — ${recentSamePos} in your last ${recentWindow.length} picks.`);
  } else if (totalAtPosition >= 3) {
    parts.push(`That's ${totalAtPosition} ${pos}s on your board. All-in on the position group.`);
  }

  // NFL Comparison callout
  const gradeIsGood = ["A+", "A", "B+", "B"].includes(grade.letterGrade);
  if (pick.playerNflComparison && gradeIsGood) {
    parts.push(`NFL comp: ${pick.playerNflComparison}. If that projection hits, this pick ages very well.`);
  }

  // Position value notes
  if (PREMIUM.includes(pos) && pick.pickNumber > 20) {
    parts.push(`Getting a ${pos} this late in Round 1 is sneaky good value.`);
  }
  if (MEME.includes(pos)) {
    parts.push(`A ${pos} in Round 1. We respect the commitment to the bit.`);
  }

  // First pick on board
  const isFirst = ctx.picksSoFar.length === 0 || (ctx.picksSoFar.length === 1 && ctx.picksSoFar[0].pickNumber === pick.pickNumber);
  const minPick = ctx.picksSoFar.length > 0 ? Math.min(...ctx.picksSoFar.map((p) => p.pickNumber)) : pick.pickNumber;
  if (pick.pickNumber === minPick && ctx.totalPicks <= 1) {
    if (gradeIsGood) {
      parts.push("Strong start to the draft. Sets the tone.");
    } else {
      parts.push("Interesting way to start your draft...");
    }
  }

  // Return at most one observation to keep it short
  return parts.length > 0 ? " " + parts[0] : "";
}

// ── Main Functions ────────────────────────────────────────

export function generatePickCommentary(
  pick: PickInfo,
  grade: CombinedPickGrade,
  boardContext: BoardContext
): string {
  const templates = GRADE_TEMPLATES[grade.letterGrade];
  const seed = pickSeed(pick.pickNumber, pick.playerName.length);
  const idx = seededIndex(seed, templates.length);
  const reaction = templates[idx](pick);
  const context = buildContextObservation(pick, grade, boardContext);
  return reaction + context;
}

export function generateMockSummaryCommentary(
  mockGrade: MockDraftGrade,
  picks: Array<{ position: string }>
): string {
  const observations: string[] = [];

  if (mockGrade.steals >= 3) {
    observations.push(
      `You found ${mockGrade.steals} steals in this draft — that's the kind of value that wins pools.`
    );
  }

  if (mockGrade.busts >= 3) {
    observations.push(
      `${mockGrade.busts} picks graded D or worse. The math is not on your side here.`
    );
  }

  // Position concentration check
  const posCounts = new Map<string, number>();
  for (const p of picks) {
    posCounts.set(p.position, (posCounts.get(p.position) ?? 0) + 1);
  }
  for (const [pos, count] of posCounts) {
    if (count >= 4) {
      observations.push(
        `You went ALL in on ${pos} — ${count} off the board. Hope it's a deep class.`
      );
      break;
    }
  }

  const hasQB = picks.some((p) => p.position === "QB");
  if (!hasQB && picks.length >= 10) {
    observations.push(
      "No QB? Bold strategy in a league where the position is everything."
    );
  }

  // Top 5 elite check
  if (mockGrade.pickGrades.length >= 5) {
    const top5Elite = mockGrade.pickGrades
      .slice(0, 5)
      .every((g) => g.letterGrade === "A+" || g.letterGrade === "A");
    if (top5Elite) {
      observations.push(
        "Your top 5 picks are elite. If the draft breaks your way, this is a league winner."
      );
    }
  }

  if (observations.length >= 2) {
    return observations.slice(0, 2).join(" ");
  }
  if (observations.length === 1) {
    return observations[0];
  }
  return mockGrade.summary;
}

// ── Grade Explanation Helpers ─────────────────────────────

export function valueExplanation(pickNumber: number, playerGrade: number | null): string {
  const expectedGrade = 97 - (pickNumber - 1) * 1.5;
  const actual = playerGrade ?? 70;
  const delta = actual - expectedGrade;
  if (delta >= 5) return `Player grade ${actual} exceeds the expected ${Math.round(expectedGrade)} at this slot`;
  if (delta >= 0) return `Player grade ${actual} matches expectations at this slot`;
  if (delta >= -10) return `Player grade ${actual} is slightly below the expected ${Math.round(expectedGrade)} here`;
  return `Player grade ${actual} is well below the expected ${Math.round(expectedGrade)} at this slot`;
}

export function consensusExplanation(pickNumber: number, playerRank: number | null): string {
  if (playerRank === null) return "Unranked player — consensus value unknown";
  const delta = pickNumber - playerRank;
  if (delta >= 3) return `Ranked #${playerRank}, taken at #${pickNumber} — great value`;
  if (delta >= 0) return `Ranked #${playerRank}, taken at #${pickNumber} — right on target`;
  if (delta >= -5) return `Ranked #${playerRank}, taken ${Math.abs(delta)} picks early`;
  return `Ranked #${playerRank}, taken ${Math.abs(delta)} picks early — significant reach`;
}

export function gradeColorHex(grade: LetterGrade): string {
  switch (grade) {
    case "A+":
    case "A":
      return "#34d399";
    case "B+":
    case "B":
      return "#60a5fa";
    case "C+":
    case "C":
      return "#fbbf24";
    case "D":
      return "#fb923c";
    case "F":
      return "#f87171";
    default:
      return "#6b7280";
  }
}
