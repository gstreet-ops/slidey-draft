// Prop resolution logic — pure functions
// These check if a prop can be auto-resolved given current actual results

type ActualResult = {
  pickNumber: number;
  playerId: string;
  playerPosition: string;
  playerName: string;
  teamId: string;
};

type PropData = {
  id: string;
  type: string;
  question: string;
  options: unknown;
  category: string;
};

export type ResolutionResult = {
  canResolve: boolean;
  correctAnswer?: string;
  explanation?: string;
};

const DEFENSIVE_POSITIONS = ['DT', 'DE', 'DL', 'NT', 'EDGE', 'LB', 'ILB', 'OLB', 'CB', 'S', 'FS', 'SS', 'DB'];
const OL_POSITIONS = ['OT', 'OG', 'OL', 'C', 'G', 'T'];

export function tryResolve(prop: PropData, results: ActualResult[]): ResolutionResult {
  if (results.length === 0) return { canResolve: false };

  switch (prop.type) {
    case 'pick_player':
      return resolvePickPlayer(prop, results);
    case 'over_under':
      return resolveOverUnder(prop, results);
    case 'yes_no':
      return resolveYesNo(prop, results);
    case 'pick_number':
      return resolvePickNumber(prop, results);
    default:
      return { canResolve: false };
  }
}

function resolvePickPlayer(prop: PropData, results: ActualResult[]): ResolutionResult {
  const q = prop.question.toLowerCase();

  let targetPositions: string[] = [];
  if (q.includes('first rb')) targetPositions = ['RB', 'FB'];
  else if (q.includes('first wr')) targetPositions = ['WR'];
  else if (q.includes('first qb')) targetPositions = ['QB'];
  else if (q.includes('first te')) targetPositions = ['TE'];
  else if (q.includes('defensive')) targetPositions = DEFENSIVE_POSITIONS;

  if (targetPositions.length === 0) return { canResolve: false };

  const sorted = [...results].sort((a, b) => a.pickNumber - b.pickNumber);
  const first = sorted.find(r => targetPositions.includes(r.playerPosition.toUpperCase()));

  if (first) {
    return {
      canResolve: true,
      correctAnswer: first.playerId,
      explanation: `${first.playerName} at pick #${first.pickNumber}`,
    };
  }

  // Can only definitively say "not found" after all 32 picks
  if (results.length >= 32) {
    return { canResolve: true, correctAnswer: '__none__', explanation: 'No matching player in Round 1' };
  }

  return { canResolve: false };
}

function resolveOverUnder(prop: PropData, results: ActualResult[]): ResolutionResult {
  // Need all 32 picks for over/under
  if (results.length < 32) return { canResolve: false };

  const opts = prop.options as { line: number } | null;
  if (!opts?.line) return { canResolve: false };

  const q = prop.question.toLowerCase();
  let count = 0;

  if (q.includes('qbs taken') || q.includes('qbs in round')) {
    count = results.filter(r => r.playerPosition.toUpperCase() === 'QB').length;
  } else if (q.includes('wrs taken') || q.includes('wrs in round')) {
    count = results.filter(r => r.playerPosition.toUpperCase() === 'WR').length;
  } else if (q.includes('offensive linemen') && q.includes('top 15')) {
    count = results.filter(r => r.pickNumber <= 15 && OL_POSITIONS.includes(r.playerPosition.toUpperCase())).length;
  } else if (q.includes('trades')) {
    // Trades can't be auto-resolved from pick data alone
    return { canResolve: false };
  } else {
    return { canResolve: false };
  }

  const answer = count > opts.line ? 'over' : 'under';
  return {
    canResolve: true,
    correctAnswer: answer,
    explanation: `${count} (line was ${opts.line})`,
  };
}

function resolveYesNo(prop: PropData, results: ActualResult[]): ResolutionResult {
  const q = prop.question.toLowerCase();
  const sorted = [...results].sort((a, b) => a.pickNumber - b.pickNumber);

  if (q.includes('wr') && q.includes('top 3')) {
    const top3 = sorted.filter(r => r.pickNumber <= 3);
    if (top3.length < 3) return { canResolve: false }; // not enough picks yet
    const hasWR = top3.some(r => r.playerPosition.toUpperCase() === 'WR');
    return { canResolve: true, correctAnswer: hasWR ? 'yes' : 'no' };
  }

  if (q.includes('back-to-back') && q.includes('same position')) {
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].playerPosition === sorted[i - 1].playerPosition) {
        return { canResolve: true, correctAnswer: 'yes', explanation: `Picks #${sorted[i-1].pickNumber} and #${sorted[i].pickNumber}` };
      }
    }
    if (results.length >= 32) return { canResolve: true, correctAnswer: 'no' };
    return { canResolve: false };
  }

  // Trade props and others can't be auto-resolved
  if (q.includes('trade')) return { canResolve: false };
  if (q.includes('pittsburgh') || q.includes('host city')) return { canResolve: false };

  return { canResolve: false };
}

function resolvePickNumber(_prop: PropData, _results: ActualResult[]): ResolutionResult {
  // Pick number props (trade-related, SEC-related) mostly need manual resolution
  return { canResolve: false };
}

export function scorePropPick(
  propType: string,
  userAnswer: string,
  correctAnswer: string,
  maxPoints: number
): number {
  if (propType === 'pick_number') {
    const userNum = parseInt(userAnswer, 10);
    const correctNum = parseInt(correctAnswer, 10);
    if (isNaN(userNum) || isNaN(correctNum)) return 0;
    const diff = Math.abs(userNum - correctNum);
    if (diff === 0) return maxPoints;
    if (diff <= 2) return Math.floor(maxPoints / 2);
    return 0;
  }

  // All other types: exact match
  return userAnswer === correctAnswer ? maxPoints : 0;
}
