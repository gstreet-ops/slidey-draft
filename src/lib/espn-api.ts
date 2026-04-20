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
  schoolLogoUrl: string | null;
  rank: number;
};

// ── ESPN API response types ──────────────────────
interface EspnRef {
  $ref?: string;
}

interface EspnPickData {
  pick?: number;
  overall?: number;
  status?: { name: string };
  athlete?: EspnRef;
  team?: EspnRef;
}

interface EspnAthleteData {
  id?: string | number;
  fullName?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  position?: { abbreviation?: string };
  college?: { name?: string; shortName?: string };
  rank?: number;
}

interface EspnRoundData {
  picks?: EspnPickData[];
}

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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'\u2019`]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "")
    .replace(/\s+/g, " ")
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
  "iol": ["iol", "og", "g", "ol", "c"],
  "c": ["c", "ol", "iol"],
  "fb": ["fb", "rb"],
  "rb": ["rb", "fb"],
  "ls": ["ls"],
  "p": ["p", "k"],
  "k": ["k", "p"],
  "wr": ["wr"],
  "te": ["te"],
  "qb": ["qb"],
};

export function positionMatches(espnPos: string, ourPos: string): boolean {
  const e = espnPos.toLowerCase();
  const o = ourPos.toLowerCase();
  if (e === o) return true;
  return POSITION_ALIASES[e]?.includes(o) || POSITION_ALIASES[o]?.includes(e) || false;
}

async function resolveRef(url: string): Promise<Record<string, unknown> | null> {
  return espnFetch<Record<string, unknown>>(url);
}

async function batchResolveRefs(urls: string[], concurrency = 5): Promise<(Record<string, unknown> | null)[]> {
  const results: (Record<string, unknown> | null)[] = new Array(urls.length).fill(null);
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(url => resolveRef(url)));
    batchResults.forEach((r, j) => { results[i + j] = r; });
  }
  return results;
}

export async function fetchDraftPicks(season: number, round: number = 1): Promise<EspnPick[]> {
  const url = `${ESPN_BASE}/${season}/draft/rounds`;
  const data = await espnFetch<{ items?: EspnRef[] }>(url);
  if (!data?.items) return [];

  const roundIndex = round - 1;
  const roundItem = data.items[roundIndex];
  if (!roundItem) return [];

  const roundData = (roundItem.$ref ? await resolveRef(roundItem.$ref) : roundItem) as EspnRoundData | null;
  if (!roundData?.picks) return [];

  // Filter to made selections with athlete refs
  const madePicks = roundData.picks.filter(
    (p) => p.status?.name === "SELECTION_MADE" && p.athlete?.$ref
  );

  if (madePicks.length === 0) return [];

  // Batch resolve all athlete refs
  const athleteRefs = madePicks.map((p) => p.athlete!.$ref!);
  const athletes = await batchResolveRefs(athleteRefs);

  const espnPicks: EspnPick[] = [];
  for (let i = 0; i < madePicks.length; i++) {
    const pickData = madePicks[i];
    const athlete = athletes[i] as EspnAthleteData | null;

    const pickNumber = pickData.pick ?? pickData.overall;
    if (!pickNumber || !athlete) continue;

    const athleteName = athlete.fullName || athlete.displayName || `${athlete.firstName} ${athlete.lastName}` || "";
    if (!athleteName) continue;

    espnPicks.push({
      pickNumber,
      teamRef: pickData.team?.$ref || "",
      athleteRef: pickData.athlete?.$ref || "",
      athleteName,
      athletePosition: athlete.position?.abbreviation || "",
      athleteSchool: athlete.college?.name || athlete.college?.shortName || "",
      espnAthleteId: String(athlete.id || ""),
    });
  }

  return espnPicks;
}

interface EspnPagedResponse {
  count?: number;
  pageIndex?: number;
  pageSize?: number;
  pageCount?: number;
  items?: (EspnRef & EspnAthleteData)[];
}

interface EspnCollegeData {
  name?: string;
  shortName?: string;
  logos?: { href?: string }[];
}

/**
 * Fetch ranked draft athletes from ESPN, paginating as needed.
 * Rank is derived from the 1-based position in the list (ESPN returns best-available order).
 * Each athlete's `college` is a $ref; resolved here to populate school + logo.
 */
export async function fetchDraftAthletes(
  season: number,
  maxResults: number = 250
): Promise<EspnAthlete[]> {
  const pageSize = 100;
  const athletes: EspnAthlete[] = [];
  const collegeCache = new Map<string, EspnCollegeData | null>();

  let page = 1;
  let pageCount = 1;
  while (athletes.length < maxResults && page <= pageCount) {
    const url = `${ESPN_BASE}/${season}/draft/athletes?limit=${pageSize}&page=${page}`;
    const data = await espnFetch<EspnPagedResponse>(url);
    if (!data?.items) break;
    pageCount = data.pageCount ?? 1;

    const itemRefs = data.items.map((it) => it.$ref).filter((r): r is string => !!r);
    const resolved = await batchResolveRefs(itemRefs);

    for (let i = 0; i < resolved.length; i++) {
      if (athletes.length >= maxResults) break;
      const athleteData = resolved[i] as EspnAthleteData | null;
      if (!athleteData) continue;

      const collegeRef = (athleteData.college as EspnRef | undefined)?.$ref;
      let college: EspnCollegeData | null = null;
      if (collegeRef) {
        if (collegeCache.has(collegeRef)) {
          college = collegeCache.get(collegeRef) ?? null;
        } else {
          college = (await resolveRef(collegeRef)) as EspnCollegeData | null;
          collegeCache.set(collegeRef, college);
        }
      } else if (athleteData.college) {
        const inline = athleteData.college as EspnCollegeData;
        college = { name: inline.name, shortName: inline.shortName };
      }

      const fullName = athleteData.fullName || athleteData.displayName ||
        [athleteData.firstName, athleteData.lastName].filter(Boolean).join(" ");
      if (!fullName) continue;

      athletes.push({
        id: String(athleteData.id ?? ""),
        fullName,
        position: athleteData.position?.abbreviation || "",
        school: college?.name || college?.shortName || "",
        schoolLogoUrl: college?.logos?.[0]?.href || null,
        rank: athletes.length + 1,
      });
    }

    page++;
  }

  return athletes;
}
