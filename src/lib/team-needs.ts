// Position-fuzzy matching for team needs

const POSITION_ALIASES: Record<string, string[]> = {
  OT: ["T", "OT"],
  OG: ["G", "OG", "C"],
  DL: ["DT", "DE", "DL", "NT"],
  EDGE: ["DE", "EDGE", "OLB"],
  DB: ["CB", "S", "FS", "SS"],
  LB: ["ILB", "OLB", "LB"],
  CB: ["CB"],
  S: ["S", "FS", "SS"],
  QB: ["QB"],
  RB: ["RB", "FB"],
  WR: ["WR"],
  TE: ["TE"],
};

function positionMatchesNeed(playerPosition: string, need: string): boolean {
  const pos = playerPosition.toUpperCase();
  const n = need.toUpperCase();

  if (pos === n) return true;

  // Check if player position falls under the need's alias group
  const needAliases = POSITION_ALIASES[n];
  if (needAliases && needAliases.includes(pos)) return true;

  // Check reverse: if the need falls under the player position's alias group
  const posAliases = POSITION_ALIASES[pos];
  if (posAliases && posAliases.includes(n)) return true;

  return false;
}

export type NeedMatchTier = "top" | "match" | "off";

export type NeedMatch = {
  tier: NeedMatchTier;
  needIndex: number | null;
  matchedNeed: string | null;
};

/**
 * Check how a player position matches team needs.
 * - "top": matches top 2 needs (indices 0-1)
 * - "match": matches needs 3+ (indices 2+)
 * - "off": doesn't match any need
 * When teamNeeds is empty/null, returns tier "match" with no index — there's nothing to match against.
 */
export function checkNeedMatch(
  playerPosition: string,
  teamNeeds: string[] | null | undefined
): NeedMatch {
  if (!teamNeeds || teamNeeds.length === 0) {
    return { tier: "match", needIndex: null, matchedNeed: null };
  }

  for (let i = 0; i < teamNeeds.length; i++) {
    if (positionMatchesNeed(playerPosition, teamNeeds[i])) {
      return {
        tier: i < 2 ? "top" : "match",
        needIndex: i,
        matchedNeed: teamNeeds[i],
      };
    }
  }
  return { tier: "off", needIndex: null, matchedNeed: null };
}

/**
 * Check if a player position matches any of the team needs.
 */
export function matchesAnyNeed(
  playerPosition: string,
  teamNeeds: string[] | null | undefined
): boolean {
  if (!teamNeeds) return false;
  return teamNeeds.some((need) => positionMatchesNeed(playerPosition, need));
}
