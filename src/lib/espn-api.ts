const ESPN_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons";
const TIMEOUT_MS = 10_000;

export type EspnPick = {
  pickNumber: number;
  teamRef: string;
  athleteRef: string;
  athleteName: string;
  athletePosition: string;
  athleteSchool: string;
  espnAthleteId: string;
};

export type EspnAthlete = {
  id: string;
  fullName: string;
  position: string;
  school: string;
  rank: number;
};

async function espnFetch<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);
    if (!res.ok) {
      console.error(`[ESPN API] ${res.status} from ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[ESPN API] Error fetching ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i, "")
    .trim();
}

const POSITION_ALIASES: Record<string, string[]> = {
  "cb": ["cb", "db"],
  "db": ["db", "cb"],
  "edge": ["edge", "de", "olb"],
  "de": ["de", "edge"],
  "olb": ["olb", "edge", "lb"],
  "ot": ["ot", "t", "ol"],
  "t": ["t", "ot", "ol"],
  "og": ["og", "g", "ol"],
  "g": ["g", "og", "ol"],
  "ol": ["ol", "ot", "og", "t", "g"],
  "dt": ["dt", "dl", "nt"],
  "dl": ["dl", "dt"],
  "nt": ["nt", "dt", "dl"],
  "s": ["s", "fs", "ss", "db"],
  "fs": ["fs", "s", "db"],
  "ss": ["ss", "s", "db"],
  "ilb": ["ilb", "lb", "mlb"],
  "mlb": ["mlb", "lb", "ilb"],
  "lb": ["lb", "ilb", "mlb", "olb"],
};

export function positionMatches(espnPos: string, ourPos: string): boolean {
  const e = espnPos.toLowerCase();
  const o = ourPos.toLowerCase();
  if (e === o) return true;
  return POSITION_ALIASES[e]?.includes(o) || POSITION_ALIASES[o]?.includes(e) || false;
}

async function resolveRef(url: string): Promise<any | null> {
  return espnFetch(url);
}

async function batchResolveRefs(urls: string[], concurrency = 5): Promise<(any | null)[]> {
  const results: (any | null)[] = new Array(urls.length).fill(null);
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(url => resolveRef(url)));
    batchResults.forEach((r, j) => { results[i + j] = r; });
  }
  return results;
}

export async function fetchDraftPicks(season: number, round: number = 1): Promise<EspnPick[]> {
  const url = `${ESPN_BASE}/${season}/draft/rounds`;
  const data = await espnFetch<{ items?: any[] }>(url);
  if (!data?.items) return [];

  const roundIndex = round - 1;
  const roundItem = data.items[roundIndex];
  if (!roundItem) return [];

  const roundData = roundItem.$ref ? await resolveRef(roundItem.$ref) : roundItem;
  if (!roundData?.picks) return [];

  // Filter to made selections with athlete refs
  const madePicks = roundData.picks.filter(
    (p: any) => p.status?.name === "SELECTION_MADE" && p.athlete?.$ref
  );

  if (madePicks.length === 0) return [];

  // Batch resolve all athlete refs
  const athleteRefs = madePicks.map((p: any) => p.athlete.$ref);
  const athletes = await batchResolveRefs(athleteRefs);

  const picks: EspnPick[] = [];
  for (let i = 0; i < madePicks.length; i++) {
    const pickData = madePicks[i];
    const athlete = athletes[i];

    const pickNumber = pickData.pick ?? pickData.overall;
    if (!pickNumber || !athlete) continue;

    const athleteName = athlete.fullName || athlete.displayName || `${athlete.firstName} ${athlete.lastName}` || "";
    if (!athleteName) continue;

    picks.push({
      pickNumber,
      teamRef: pickData.team?.$ref || "",
      athleteRef: pickData.athlete?.$ref || "",
      athleteName,
      athletePosition: athlete.position?.abbreviation || "",
      athleteSchool: athlete.college?.name || athlete.college?.shortName || "",
      espnAthleteId: String(athlete.id || ""),
    });
  }

  return picks;
}

export async function fetchDraftAthletes(season: number, limit: number = 100): Promise<EspnAthlete[]> {
  const url = `${ESPN_BASE}/${season}/draft/athletes?limit=${limit}`;
  const data = await espnFetch<{ items?: any[] }>(url);
  if (!data?.items) return [];

  const athletes: EspnAthlete[] = [];
  let rankCounter = 0;

  for (const item of data.items) {
    try {
      const athleteData = item.$ref ? await resolveRef(item.$ref) : item;
      if (!athleteData) continue;

      rankCounter++;
      athletes.push({
        id: String(athleteData.id || ""),
        fullName: athleteData.fullName || athleteData.displayName || "",
        position: athleteData.position?.abbreviation || "",
        school: athleteData.college?.name || athleteData.college?.shortName || "",
        rank: athleteData.rank ?? rankCounter,
      });
    } catch (err) {
      console.error(`[ESPN API] Error parsing athlete item:`, err);
      continue;
    }
  }

  return athletes;
}
