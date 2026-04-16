// Mock Draft Grading — Pre-draft pick quality evaluation
// Pure functions, no DB dependencies

export type LetterGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

export type PickGrade = {
  letterGrade: LetterGrade;
  numericScore: number;
};

export type CombinedPickGrade = {
  letterGrade: LetterGrade;
  numericScore: number;
  valueGrade: LetterGrade;
  consensusGrade: LetterGrade;
  pickLabel: string;
};

export type MockDraftGrade = {
  letterGrade: LetterGrade;
  numericAverage: number;
  summary: string;
  pickGrades: CombinedPickGrade[];
  steals: number;
  solid: number;
  reaches: number;
  busts: number;
  totalPicks: number;
};

const GRADE_TO_NUMERIC: Record<LetterGrade, number> = {
  'A+': 4.3, 'A': 4.0, 'B+': 3.3, 'B': 3.0,
  'C+': 2.3, 'C': 2.0, 'D': 1.0, 'F': 0,
};

function numericToGrade(score: number): LetterGrade {
  if (score >= 4.15) return 'A+';
  if (score >= 3.65) return 'A';
  if (score >= 3.15) return 'B+';
  if (score >= 2.65) return 'B';
  if (score >= 2.15) return 'C+';
  if (score >= 1.5) return 'C';
  if (score >= 0.5) return 'D';
  return 'F';
}

function pickLabelForGrade(grade: LetterGrade): string {
  switch (grade) {
    case 'A+': return 'STEAL';
    case 'A': return 'Great Value';
    case 'B+': return 'Solid Pick';
    case 'B': return 'Reasonable';
    case 'C+': return 'Slight Reach';
    case 'C': return 'Reach';
    case 'D': return 'Big Reach';
    case 'F': return 'Off the Board';
  }
}

export function gradePickValue(
  pickNumber: number,
  playerGrade: number | null,
  playerRank: number | null
): PickGrade {
  const expectedGrade = 97 - (pickNumber - 1) * 1.5;
  const delta = (playerGrade ?? 70) - expectedGrade;

  let letterGrade: LetterGrade;
  if (delta >= 10) letterGrade = 'A+';
  else if (delta >= 5) letterGrade = 'A';
  else if (delta >= 0) letterGrade = 'B+';
  else if (delta >= -5) letterGrade = 'B';
  else if (delta >= -10) letterGrade = 'C+';
  else if (delta >= -15) letterGrade = 'C';
  else if (delta >= -20) letterGrade = 'D';
  else letterGrade = 'F';

  return { letterGrade, numericScore: GRADE_TO_NUMERIC[letterGrade] };
}

export function gradePickConsensus(
  pickNumber: number,
  playerRank: number | null
): PickGrade {
  if (playerRank === null) {
    return { letterGrade: 'C', numericScore: GRADE_TO_NUMERIC['C'] };
  }

  const rankDelta = pickNumber - playerRank;

  let letterGrade: LetterGrade;
  if (rankDelta >= 5) letterGrade = 'A+';
  else if (rankDelta >= 3) letterGrade = 'A';
  else if (rankDelta >= 0) letterGrade = 'B+';
  else if (rankDelta >= -3) letterGrade = 'B';
  else if (rankDelta >= -7) letterGrade = 'C';
  else if (rankDelta >= -12) letterGrade = 'D';
  else letterGrade = 'F';

  return { letterGrade, numericScore: GRADE_TO_NUMERIC[letterGrade] };
}

export function gradePick(
  pickNumber: number,
  playerGrade: number | null,
  playerRank: number | null
): CombinedPickGrade {
  const value = gradePickValue(pickNumber, playerGrade, playerRank);
  const consensus = gradePickConsensus(pickNumber, playerRank);

  const combinedScore = value.numericScore * 0.4 + consensus.numericScore * 0.6;
  const letterGrade = numericToGrade(combinedScore);

  return {
    letterGrade,
    numericScore: combinedScore,
    valueGrade: value.letterGrade,
    consensusGrade: consensus.letterGrade,
    pickLabel: pickLabelForGrade(letterGrade),
  };
}

export function gradeMockDraft(
  picks: Array<{ pickNumber: number; playerGrade: number | null; playerRank: number | null }>
): MockDraftGrade {
  const pickGrades = picks.map((p) =>
    gradePick(p.pickNumber, p.playerGrade, p.playerRank)
  );

  const totalPicks = pickGrades.length;
  if (totalPicks === 0) {
    return {
      letterGrade: 'C',
      numericAverage: 2.0,
      summary: 'No picks to grade yet',
      pickGrades: [],
      steals: 0, solid: 0, reaches: 0, busts: 0, totalPicks: 0,
    };
  }

  const numericAverage =
    pickGrades.reduce((sum, g) => sum + g.numericScore, 0) / totalPicks;
  const letterGrade = numericToGrade(numericAverage);

  const steals = pickGrades.filter((g) => g.letterGrade === 'A+' || g.letterGrade === 'A').length;
  const solid = pickGrades.filter((g) => g.letterGrade === 'B+' || g.letterGrade === 'B').length;
  const reaches = pickGrades.filter((g) => g.letterGrade === 'C+' || g.letterGrade === 'C').length;
  const busts = pickGrades.filter((g) => g.letterGrade === 'D' || g.letterGrade === 'F').length;

  const hasNoF = !pickGrades.some((g) => g.letterGrade === 'F');

  let summary: string;
  if (numericAverage >= 3.5 && hasNoF) summary = 'Elite draft — you clearly did your homework';
  else if (numericAverage >= 3.0) summary = 'Strong mock — solid value throughout';
  else if (numericAverage >= 2.5) summary = 'Decent draft — a few reaches but competitive';
  else if (numericAverage >= 2.0) summary = 'Mixed bag — some steals offset by big reaches';
  else if (numericAverage >= 1.5) summary = 'Rough draft — too many reaches to be competitive';
  else summary = "Bold strategy... let's see how it plays out";

  return {
    letterGrade,
    numericAverage,
    summary,
    pickGrades,
    steals, solid, reaches, busts, totalPicks,
  };
}
