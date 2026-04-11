/**
 * Concurrent User Stress Test
 * Run: npx tsx src/scripts/stress-test-concurrent.ts
 *
 * Simulates 15 concurrent users hitting key endpoints.
 * Requires the dev server to be running on localhost:3000.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENT_USERS = 15;

// We'll test against the public-facing API endpoints
// These don't require auth for GET (most return 401 which still tests server capacity)
const ENDPOINTS = [
  { name: "Pool Dashboard", method: "GET", path: "/api/pools" },
  { name: "Leaderboard", method: "GET", path: "/api/leaderboard?season=2026" },
  { name: "Draft Results", method: "GET", path: "/api/draft/results?season=2026" },
];

interface Result {
  endpoint: string;
  status: number;
  ms: number;
  error?: string;
}

async function hitEndpoint(name: string, method: string, path: string): Promise<Result> {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      signal: AbortSignal.timeout(10000),
    });
    const ms = performance.now() - start;
    return { endpoint: name, status: res.status, ms };
  } catch (err: any) {
    const ms = performance.now() - start;
    return { endpoint: name, status: 0, ms, error: err.message };
  }
}

async function runStressTest() {
  console.log("=== Concurrent User Stress Test ===\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Concurrent users: ${CONCURRENT_USERS}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // First check if server is up
  try {
    await fetch(`${BASE_URL}/api/leaderboard?season=2026`, { signal: AbortSignal.timeout(5000) });
  } catch {
    console.error("ERROR: Dev server not reachable at " + BASE_URL);
    console.error("Start the dev server first: npm run dev");
    process.exit(1);
  }

  const allResults: Result[] = [];

  for (const ep of ENDPOINTS) {
    console.log(`\n--- Testing: ${ep.name} (${ep.method} ${ep.path}) ---`);

    // Fire N concurrent requests
    const promises = Array.from({ length: CONCURRENT_USERS }, () =>
      hitEndpoint(ep.name, ep.method, ep.path)
    );

    const results = await Promise.all(promises);
    allResults.push(...results);

    const times = results.map((r) => r.ms);
    const errors = results.filter((r) => r.error || r.status >= 500);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);

    console.log(`  Requests: ${results.length}`);
    console.log(`  Status codes: ${[...new Set(results.map((r) => r.status))].join(", ")}`);
    const sorted = [...times].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(0.95 * sorted.length)] ?? max;
    console.log(`  Avg: ${avg.toFixed(0)}ms | P95: ${p95.toFixed(0)}ms | Min: ${min.toFixed(0)}ms | Max: ${max.toFixed(0)}ms`);
    if (errors.length > 0) {
      console.log(`  ERRORS: ${errors.length} requests failed`);
      errors.slice(0, 3).forEach((e) => console.log(`    - ${e.error || `status ${e.status}`}`));
    }
    if (max > 2000) {
      console.log(`  WARNING: Max response time ${max.toFixed(0)}ms exceeds 2s threshold!`);
    }
  }

  // Summary
  console.log("\n\n=== SUMMARY ===");
  const grouped = new Map<string, Result[]>();
  for (const r of allResults) {
    const arr = grouped.get(r.endpoint) || [];
    arr.push(r);
    grouped.set(r.endpoint, arr);
  }

  console.log("\n| Endpoint          | Avg (ms) | P95 (ms) | Max (ms) | Errors | Status |");
  console.log("|-------------------|----------|----------|----------|--------|--------|");
  for (const [name, results] of grouped) {
    const times = results.map((r) => r.ms);
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p95 = sorted[Math.floor(0.95 * sorted.length)] ?? Math.max(...times);
    const max = Math.max(...times);
    const errors = results.filter((r) => r.error || r.status >= 500).length;
    const status = max > 1500 || errors > 0 ? "WARN" : "OK";
    console.log(
      `| ${name.padEnd(17)} | ${avg.toFixed(0).padStart(8)} | ${p95.toFixed(0).padStart(8)} | ${max.toFixed(0).padStart(8)} | ${String(errors).padStart(6)} | ${status.padStart(6)} |`
    );
  }

  const totalErrors = allResults.filter((r) => r.error || r.status >= 500).length;
  const maxTime = Math.max(...allResults.map((r) => r.ms));
  console.log(
    `\nOverall: ${totalErrors} errors, max response ${maxTime.toFixed(0)}ms — ${totalErrors === 0 && maxTime < 2000 ? "PASS" : "NEEDS ATTENTION"}`
  );
}

runStressTest().catch(console.error);
