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

async function resolveRef(url: string): Promise<any | null> {
  return espnFetch(url);
}

export async function fetchDraftPicks(season: number, round: number = 1): Promise<EspnPick[]> {
  const url = `${ESPN_BASE}/${season}/draft/rounds/${round}/picks?limit=50`;
  const data = await espnFetch<{ items?: any[]; count?: number }>(url);
  if (!data?.items) return [];

  const picks: EspnPick[] = [];
  for (const item of data.items) {
    try {
      const pickData = item.$ref ? await resolveRef(item.$ref) : item;
      if (!pickData) continue;

      const pickNumber = pickData.pick ?? pickData.overall;
      if (!pickNumber) continue;

      let athleteName = "";
      let athletePosition = "";
      let athleteSchool = "";
      let espnAthleteId = "";

      if (pickData.athlete?.$ref) {
        const athlete = await resolveRef(pickData.athlete.$ref);
        if (athlete) {
          athleteName = athlete.fullName || athlete.displayName || "";
          athletePosition = athlete.position?.abbreviation || "";
          athleteSchool = athlete.college?.name || athlete.college?.shortName || "";
          espnAthleteId = String(athlete.id || "");
        }
      } else if (pickData.athlete) {
        athleteName = pickData.athlete.fullName || pickData.athlete.displayName || "";
        athletePosition = pickData.athlete.position?.abbreviation || "";
        espnAthleteId = String(pickData.athlete.id || "");
      }

      if (!athleteName) continue;

      picks.push({
        pickNumber,
        teamRef: pickData.team?.$ref || "",
        athleteRef: pickData.athlete?.$ref || "",
        athleteName,
        athletePosition,
        athleteSchool,
        espnAthleteId,
      });
    } catch (err) {
      console.error(`[ESPN API] Error parsing pick item:`, err);
      continue;
    }
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
