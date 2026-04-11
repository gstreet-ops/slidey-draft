/**
 * ESPN API Resilience Test — one-shot diagnostic
 * Run: npx tsx src/scripts/test-espn-resilience.ts
 */

const ESPN_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons";
const SEASON = 2026;

// Same position alias map from espn-api.ts
const POSITION_ALIASES: Record<string, string[]> = {
  cb: ["cb", "db"],
  db: ["db", "cb"],
  edge: ["edge", "de", "olb"],
  de: ["de", "edge"],
  olb: ["olb", "edge", "lb"],
  ot: ["ot", "t", "ol"],
  t: ["t", "ot", "ol"],
  og: ["og", "g", "ol"],
  g: ["g", "og", "ol"],
  ol: ["ol", "ot", "og", "t", "g"],
  dt: ["dt", "dl", "nt"],
  dl: ["dl", "dt"],
  nt: ["nt", "dt", "dl"],
  s: ["s", "fs", "ss", "db"],
  fs: ["fs", "s", "db"],
  ss: ["ss", "s", "db"],
  ilb: ["ilb", "lb", "mlb"],
  mlb: ["mlb", "lb", "ilb"],
  lb: ["lb", "ilb", "mlb", "olb"],
  iol: ["iol", "og", "g", "ol", "c"],
  c: ["c", "ol", "iol"],
  fb: ["fb", "rb"],
  rb: ["rb", "fb"],
  ls: ["ls"],
  p: ["p", "k"],
  k: ["k", "p"],
  wr: ["wr"],
  te: ["te"],
  qb: ["qb"],
};

async function runEspnTest() {
  console.log("=== ESPN API Resilience Test ===\n");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Season: ${SEASON}\n`);

  // 1. Fetch rounds endpoint
  console.log("--- Step 1: Fetch draft rounds ---");
  const roundsUrl = `${ESPN_BASE}/${SEASON}/draft/rounds`;
  let roundsData: any;
  try {
    const res = await fetch(roundsUrl, { signal: AbortSignal.timeout(10000) });
    console.log(`Status: ${res.status}`);
    if (!res.ok) {
      console.log(`WARN: Non-OK response. This is expected if the ${SEASON} draft hasn't started yet.`);
      console.log("\n=== RESULT: ESPN endpoint reachable but no draft data yet ===");
      return;
    }
    roundsData = await res.json();
    console.log(`Response keys: ${Object.keys(roundsData).join(", ")}`);
    console.log(`Items count: ${roundsData.items?.length ?? "N/A"}`);
  } catch (err: any) {
    console.error(`ERROR: ${err.message}`);
    console.log("\n=== RESULT: ESPN endpoint unreachable ===");
    return;
  }

  if (!roundsData?.items?.length) {
    console.log("No round items returned. Draft may not be set up yet.");
    console.log("\n=== RESULT: No draft data available ===");
    return;
  }

  // 2. Resolve round 1
  console.log("\n--- Step 2: Resolve Round 1 picks ---");
  const round1Ref = roundsData.items[0]?.$ref;
  if (!round1Ref) {
    console.log("No $ref for round 1.");
    return;
  }

  let round1Data: any;
  try {
    const res = await fetch(round1Ref, { signal: AbortSignal.timeout(10000) });
    round1Data = await res.json();
    console.log(`Round 1 picks count: ${round1Data.picks?.length ?? 0}`);
  } catch (err: any) {
    console.error(`ERROR resolving round 1: ${err.message}`);
    return;
  }

  const madePicks = (round1Data.picks ?? []).filter(
    (p: any) => p.status?.name === "SELECTION_MADE" && p.athlete?.$ref
  );
  console.log(`Made picks (SELECTION_MADE with athlete): ${madePicks.length}`);

  if (madePicks.length === 0) {
    console.log("No completed picks yet. Draft hasn't started or is in progress.");
    console.log("\n=== RESULT: ESPN data accessible, 0 picks made ===");
    return;
  }

  // 3. Resolve a few athletes and check positions
  console.log("\n--- Step 3: Check athlete positions ---");
  const positionsFound = new Set<string>();
  const unmappedPositions: string[] = [];
  const sampleSize = Math.min(madePicks.length, 10);

  for (let i = 0; i < sampleSize; i++) {
    try {
      const athleteRes = await fetch(madePicks[i].athlete.$ref, {
        signal: AbortSignal.timeout(10000),
      });
      const athlete = await athleteRes.json();
      const pos = athlete.position?.abbreviation || "UNKNOWN";
      positionsFound.add(pos);

      const posLower = pos.toLowerCase();
      if (posLower !== "unknown" && !POSITION_ALIASES[posLower]) {
        unmappedPositions.push(pos);
      }

      console.log(
        `  Pick ${madePicks[i].pick ?? madePicks[i].overall}: ${athlete.fullName || athlete.displayName} — ${pos}`
      );
    } catch (err: any) {
      console.log(`  Pick ${i + 1}: FAILED to resolve athlete — ${err.message}`);
    }
  }

  console.log(`\nPositions seen: ${[...positionsFound].join(", ")}`);
  if (unmappedPositions.length > 0) {
    console.log(`WARNING — Unmapped positions: ${unmappedPositions.join(", ")}`);
  } else {
    console.log("All positions have mappings.");
  }

  // 4. Test malformed response handling
  console.log("\n--- Step 4: Malformed response simulation ---");
  const testCases = [
    { name: "null picks", data: { picks: null } },
    { name: "empty picks", data: { picks: [] } },
    { name: "pick missing athlete", data: { picks: [{ pick: 1, status: { name: "SELECTION_MADE" } }] } },
    { name: "pick missing status", data: { picks: [{ pick: 1, athlete: { $ref: "x" } }] } },
  ];

  for (const tc of testCases) {
    const filtered = (tc.data.picks ?? []).filter(
      (p: any) => p.status?.name === "SELECTION_MADE" && p.athlete?.$ref
    );
    console.log(`  ${tc.name}: ${filtered.length} valid picks (expected 0) — ${filtered.length === 0 ? "PASS" : "FAIL"}`);
  }

  console.log(`\n=== RESULT: ${madePicks.length} picks resolved, ${unmappedPositions.length} unmapped positions ===`);
}

runEspnTest().catch(console.error);
