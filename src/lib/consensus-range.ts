// Consensus draft range computation
// Combines algorithmic range from rank/grade with user mock aggregation

type PlayerInput = {
  id: string;
  rank: number | null;
  grade: number | null;
  position: string;
};

type MockPickData = {
  playerId: string;
  pickNumber: number;
};

type ConsensusRange = {
  low: number;   // earliest (best case)
  high: number;  // latest (worst case)
  mid: number;   // most likely
};

function positionVariance(position: string): number {
  const pos = position.toUpperCase();
  if (pos === "QB") return 5;
  if (pos === "OT" || pos === "EDGE") return 3;
  return 4;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function algorithmicRange(player: PlayerInput): ConsensusRange | null {
  if (!player.rank) return null;

  const center = player.rank;
  const variance = positionVariance(player.position);

  // Grade adjustment: high grades pull the range earlier
  let gradeShift = 0;
  if (player.grade) {
    const expectedGrade = 97 - (center - 1) * 1.5;
    const delta = player.grade - expectedGrade;
    gradeShift = Math.round(delta / 5); // every 5 grade points = 1 pick shift
  }

  const adjustedCenter = center - gradeShift;
  const low = clamp(adjustedCenter - variance, 1, 64);
  const high = clamp(adjustedCenter + variance, 1, 64);
  const mid = clamp(adjustedCenter, 1, 64);

  return { low, high, mid };
}

function userMockRange(mockPicks: number[]): ConsensusRange {
  const sorted = [...mockPicks].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const mid = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  return { low, high, mid };
}

export function computeConsensusRange(
  player: PlayerInput,
  userMockPicks?: number[]
): ConsensusRange | null {
  const algo = algorithmicRange(player);
  if (!algo) return null;

  if (userMockPicks && userMockPicks.length >= 3) {
    const mock = userMockRange(userMockPicks);
    // 70% user mock, 30% algorithmic
    return {
      low: clamp(Math.round(mock.low * 0.7 + algo.low * 0.3), 1, 64),
      high: clamp(Math.round(mock.high * 0.7 + algo.high * 0.3), 1, 64),
      mid: clamp(Math.round(mock.mid * 0.7 + algo.mid * 0.3), 1, 64),
    };
  }

  return algo;
}

export function computeAllRanges(
  players: PlayerInput[],
  allMockPicks: MockPickData[]
): Map<string, ConsensusRange> {
  // Group mock picks by player
  const mockMap = new Map<string, number[]>();
  for (const pick of allMockPicks) {
    if (!mockMap.has(pick.playerId)) mockMap.set(pick.playerId, []);
    mockMap.get(pick.playerId)!.push(pick.pickNumber);
  }

  const result = new Map<string, ConsensusRange>();
  for (const player of players) {
    const mockPicks = mockMap.get(player.id);
    const range = computeConsensusRange(player, mockPicks);
    if (range) result.set(player.id, range);
  }
  return result;
}
