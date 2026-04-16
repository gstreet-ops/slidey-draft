// Client-safe pool settings — no server-only imports (auth, db, cookies).
// Server helpers live in pool-helpers.ts and re-export everything here.

export const DEFAULT_POOL_SETTINGS = {
  rounds: [1],
  mockDraftBonus: true,
  livePredictions: true,
  trivia: true,
  watchParty: true,
  entryDeadline: null as string | null,
  maxMembers: null as number | null,
  scoringMode: "standard" as "standard" | "custom",
  mockPointValues: {
    playerCalled: 3,
    rangeClose: 2,
    rangeFar: 1,
    exactSlot: 5,
    positionMatch: 1,
  },
  livePointValues: {
    correctPlayer: 10,
  },
  triviaPointValues: {
    easy: 3,
    medium: 5,
    hard: 10,
  },
  triviaTimerSeconds: 30,
  triviaMode: "auto" as "auto" | "manual",
};

export type PoolSettings = typeof DEFAULT_POOL_SETTINGS;

/** Standard scoring defaults — used when scoringMode is "standard" */
export const STANDARD_SCORING = {
  mockPointValues: { ...DEFAULT_POOL_SETTINGS.mockPointValues },
  livePointValues: { ...DEFAULT_POOL_SETTINGS.livePointValues },
  triviaPointValues: { ...DEFAULT_POOL_SETTINGS.triviaPointValues },
} as const;

export function getPoolSettings(raw: unknown): PoolSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_POOL_SETTINGS };
  const merged = { ...DEFAULT_POOL_SETTINGS, ...(raw as Record<string, unknown>) } as PoolSettings;
  // Ensure triviaPointValues has the new tiered shape
  if (!merged.triviaPointValues || typeof merged.triviaPointValues !== "object" || !("easy" in merged.triviaPointValues)) {
    merged.triviaPointValues = { ...DEFAULT_POOL_SETTINGS.triviaPointValues };
  }
  // Default scoringMode to standard if missing
  if (!merged.scoringMode) merged.scoringMode = "standard";
  return merged;
}

/** Get effective scoring values — standard mode uses hardcoded defaults */
export function getEffectiveScoring(settings: PoolSettings) {
  if (settings.scoringMode === "standard") {
    return STANDARD_SCORING;
  }
  return {
    mockPointValues: settings.mockPointValues,
    livePointValues: settings.livePointValues,
    triviaPointValues: settings.triviaPointValues,
  };
}
