import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPoolsForUser } from "@/lib/queries";
import { getPoolSettings } from "@/lib/pool-settings";
import { getEnabledFeatures, type FeatureKey } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

type SectionDef = { id: string; label: string; always?: true; feature?: FeatureKey };

const allSections: SectionDef[] = [
  { id: "mock-draft", label: "Mock Draft", feature: "mockDraft" },
  { id: "live-predictions", label: "Live Predictions", feature: "livePredictions" },
  { id: "trivia", label: "Trivia", feature: "trivia" },
  { id: "prop-bets", label: "Prop Bets", feature: "propBets" },
  { id: "combined", label: "Combined Score", always: true },
  { id: "examples", label: "Examples", always: true },
  { id: "commissioner", label: "Commissioner", always: true },
  { id: "team-scoring", label: "Team Scoring", always: true },
];

export default async function ScoringPage() {
  const session = await auth();

  let enabledFeatures: Set<FeatureKey> | null = null;
  let poolName: string | null = null;
  if (session?.user?.id) {
    const userPools = await getPoolsForUser(session.user.id);
    if (userPools.length > 0) {
      const settings = getPoolSettings(userPools[0].settings);
      enabledFeatures = getEnabledFeatures(settings);
      poolName = userPools[0].poolName;
    }
  }

  const mockOn = enabledFeatures === null || enabledFeatures.has("mockDraft");
  const liveOn = enabledFeatures === null || enabledFeatures.has("livePredictions");
  const triviaOn = enabledFeatures === null || enabledFeatures.has("trivia");
  const propBetsOn = enabledFeatures === null || enabledFeatures.has("propBets");

  const shouldShow = (s: SectionDef) => {
    if (s.always) return true;
    if (enabledFeatures === null) return true;
    return s.feature ? enabledFeatures.has(s.feature) : false;
  };
  const sections = allSections.filter(shouldShow);
  const visibleIds = new Set(sections.map((s) => s.id));

  const enabledTracks = [
    mockOn && "Mock Draft",
    liveOn && "Live Predictions",
    triviaOn && "Trivia",
    propBetsOn && "Prop Bets",
  ].filter(Boolean) as string[];

  const noFeatures =
    enabledFeatures !== null && !mockOn && !liveOn && !triviaOn && !propBetsOn;

  const subtitle = (() => {
    if (noFeatures) return "Your commissioner hasn't enabled any scoring features yet.";
    if (enabledFeatures === null) {
      return "How points are earned — mock drafts, live predictions, trivia, and prop bets.";
    }
    if (enabledTracks.length === 1) return `${enabledTracks[0]} only — one track drives your pool rank.`;
    const last = enabledTracks[enabledTracks.length - 1];
    const rest = enabledTracks.slice(0, -1).join(", ");
    return `How ${poolName ?? "your pool"} scores — ${rest} and ${last}.`;
  })();

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex flex-col">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/guide" className="text-sm text-white/50 hover:text-white/60 transition">
          &larr; Back to How to Play
        </Link>

        <h1
          className="mt-4 text-3xl font-bold text-white tracking-wide sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          HOW SCORING WORKS
        </h1>
        <p className="mt-2 text-sm text-white/50">{subtitle}</p>

        {enabledFeatures === null && session?.user && (
          <p className="mt-2 text-xs text-white/50 italic">
            Join a pool to see your pool&apos;s specific scoring configuration.
          </p>
        )}

        {noFeatures ? (
          <div className="mt-8 rounded-xl border border-white/[0.12] bg-white/8 p-8 text-center">
            <p className="text-sm text-white/70">
              Your commissioner hasn&apos;t enabled any scoring features yet. Check back when your pool is set up.
            </p>
          </div>
        ) : (
          <>
            {/* Quick nav */}
            <nav className="mt-6 flex flex-wrap gap-2">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/60 hover:border-[var(--lions-blue)] hover:text-white transition"
                >
                  {s.label}
                </a>
              ))}
            </nav>

            <div className="mt-8 space-y-6 [&_section]:rounded-xl [&_section]:bg-gray-900/60 [&_section]:border [&_section]:border-white/10 [&_section]:p-5 [&_section]:sm:p-8 [&_section>p]:mt-3 [&_section>p]:text-sm [&_section>p]:leading-relaxed [&_section>p]:text-white/60">

              {/* ── Mock Draft Scoring ── */}
              {visibleIds.has("mock-draft") && (
                <section id="mock-draft">
                  <SectionHeading>Mock Draft Scoring</SectionHeading>
                  <p>
                    Your 32-pick mock draft is scored against the actual results after each real pick is announced. Tiers stack — you can earn multiple bonuses on the same pick:
                  </p>

                  <div className="mt-4 space-y-1.5">
                    <ScoreRow color="text-blue-500" pts={3} label="Player Called" desc="You predicted a player who was drafted in Round 1 (any slot)" />
                    <ScoreRow color="text-yellow-600" pts="+2" label="Close Range" desc="Stacks with Player Called — player drafted within 3 picks of your slot" />
                    <ScoreRow color="text-orange-500" pts="+1" label="Far Range" desc="Stacks with Player Called — player drafted within 4-7 picks" />
                    <ScoreRow color="text-green-600" pts="+5" label="Exact Slot" desc="Stacks with Player Called — player at the exact pick you predicted" />
                    <ScoreRow color="text-purple-500" pts={1} label="Position Match" desc="Wrong player, but correct position for that slot (does NOT stack with Player Called)" />
                  </div>

                  <Callout>
                    Mock scoring is <strong>BONUS ONLY</strong>. If you don&apos;t submit a mock draft, your mock bonus is 0 — not negative. You can still compete on other tracks alone.
                  </Callout>

                  <SubHeading>Worked Example</SubHeading>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-white/50 uppercase tracking-wider">
                          <th className="pb-2 pr-3">Pick</th>
                          <th className="pb-2 pr-3">You Predicted</th>
                          <th className="pb-2 pr-3">Actual</th>
                          <th className="pb-2 pr-3">Breakdown</th>
                          <th className="pb-2 text-right">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/70">
                        <tr className="border-t border-white/5">
                          <td className="py-2 pr-3 text-white/50">#1</td>
                          <td className="py-2 pr-3">Fernando Mendoza, QB</td>
                          <td className="py-2 pr-3">Fernando Mendoza, QB</td>
                          <td className="py-2 pr-3 text-xs text-white/50">Player Called (3) + Close (2) + Exact (5)</td>
                          <td className="py-2 text-right font-bold text-green-400">10</td>
                        </tr>
                        <tr className="border-t border-white/5">
                          <td className="py-2 pr-3 text-white/50">#5</td>
                          <td className="py-2 pr-3">Sonny Styles, LB</td>
                          <td className="py-2 pr-3">Sonny Styles at #3</td>
                          <td className="py-2 pr-3 text-xs text-white/50">Player Called (3) + Close (2)</td>
                          <td className="py-2 text-right font-bold text-yellow-400">5</td>
                        </tr>
                        <tr className="border-t border-white/5">
                          <td className="py-2 pr-3 text-white/50">#8</td>
                          <td className="py-2 pr-3">Makai Lemon, WR</td>
                          <td className="py-2 pr-3">Carnell Tate, WR</td>
                          <td className="py-2 pr-3 text-xs text-white/50">Position Match (1)</td>
                          <td className="py-2 text-right font-bold text-purple-400">1</td>
                        </tr>
                        <tr className="border-t border-white/5">
                          <td className="py-2 pr-3 text-white/50">#12</td>
                          <td className="py-2 pr-3">Spencer Fano, OT</td>
                          <td className="py-2 pr-3">Caleb Downs, S</td>
                          <td className="py-2 pr-3 text-xs text-white/50">Wrong player, wrong position</td>
                          <td className="py-2 text-right font-bold text-red-400">0</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/20">
                          <td colSpan={4} className="py-2 pr-3 text-right text-xs text-white/50 uppercase">Total mock bonus (4 picks)</td>
                          <td className="py-2 text-right font-bold text-white">16</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              )}

              {/* ── Live Predictions ── */}
              {visibleIds.has("live-predictions") && (
                <section id="live-predictions">
                  <SectionHeading>Live Predictions</SectionHeading>
                  <p>
                    During the draft, each pick goes &quot;on the clock.&quot; You predict which player will be selected before the pick is announced. The prediction window uses the real NFL draft clock — no artificial timer.
                  </p>

                  <div className="mt-4 space-y-1.5">
                    <ScoreRow color="text-green-600" pts={10} label="Correct Prediction" desc="You named the exact player who was selected" />
                    <ScoreRow color="text-red-400" pts={0} label="Wrong / No Prediction" desc="Wrong player, or you didn't submit a prediction" />
                  </div>

                  <p>One prediction per pick — once you lock it in, it&apos;s final.</p>

                  <SubHeading>Worked Example</SubHeading>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-white/50 uppercase tracking-wider">
                          <th className="pb-2 pr-3">Pick</th>
                          <th className="pb-2 pr-3">Your Prediction</th>
                          <th className="pb-2 pr-3">Actual</th>
                          <th className="pb-2 pr-3">Result</th>
                          <th className="pb-2 text-right">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/70">
                        <tr className="border-t border-white/5">
                          <td className="py-2 pr-3 text-white/50">#1</td>
                          <td className="py-2 pr-3">Fernando Mendoza</td>
                          <td className="py-2 pr-3">Fernando Mendoza</td>
                          <td className="py-2 pr-3 text-green-400">Correct!</td>
                          <td className="py-2 text-right font-bold text-green-400">+10</td>
                        </tr>
                        <tr className="border-t border-white/5">
                          <td className="py-2 pr-3 text-white/50">#2</td>
                          <td className="py-2 pr-3">Jeremiyah Love</td>
                          <td className="py-2 pr-3">Arvell Reese</td>
                          <td className="py-2 pr-3 text-red-400">Wrong</td>
                          <td className="py-2 text-right font-bold text-red-400">0</td>
                        </tr>
                        <tr className="border-t border-white/5">
                          <td className="py-2 pr-3 text-white/50">#3</td>
                          <td className="py-2 pr-3 text-white/40">— (didn&apos;t predict)</td>
                          <td className="py-2 pr-3">Jeremiyah Love</td>
                          <td className="py-2 pr-3 text-white/40">Missed</td>
                          <td className="py-2 text-right font-bold text-red-400">0</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/20">
                          <td colSpan={4} className="py-2 pr-3 text-right text-xs text-white/50 uppercase">Live total</td>
                          <td className="py-2 text-right font-bold text-white">10</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              )}

              {/* ── Trivia ── */}
              {visibleIds.has("trivia") && (
                <section id="trivia">
                  <SectionHeading>Trivia</SectionHeading>
                  <p>
                    After each pick is announced, a trivia question appears. Questions cover NFL history, draft trivia, prospect knowledge, and team trivia. Answer before the timer runs out — one answer per question.
                  </p>
                  <p>Points depend on question difficulty:</p>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center gap-3 rounded-lg bg-white/8 px-4 py-3">
                      <span className="text-lg font-bold w-12 text-center text-green-400">+3</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">Easy</p>
                          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">EASY</span>
                        </div>
                        <p className="text-xs text-white/50">&quot;How many rounds are in the NFL Draft?&quot;</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-white/8 px-4 py-3">
                      <span className="text-lg font-bold w-12 text-center text-yellow-400">+5</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">Medium</p>
                          <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-400">MEDIUM</span>
                        </div>
                        <p className="text-xs text-white/50">&quot;Which team has the most #1 overall picks in draft history?&quot;</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-white/8 px-4 py-3">
                      <span className="text-lg font-bold w-12 text-center text-red-400">+10</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">Hard</p>
                          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">HARD</span>
                        </div>
                        <p className="text-xs text-white/50">&quot;Who was the last player drafted in the first round from a non-Power 5 school to make the Pro Bowl in their rookie year?&quot;</p>
                      </div>
                    </div>
                  </div>

                  <p>Wrong answers earn 0 points — no penalty. Questions are random and vary by category.</p>

                  <Callout>
                    Trivia fills the dead time between picks. Round 1 picks can take 5-10 minutes each — trivia keeps everyone engaged while waiting.
                  </Callout>
                </section>
              )}

              {/* ── Prop Bets ── */}
              {visibleIds.has("prop-bets") && (
                <section id="prop-bets">
                  <SectionHeading>Prop Bet Scoring</SectionHeading>
                  <p>
                    Prop bets are side predictions about draft outcomes — who goes first at a position, trade activity, fun predictions. Each prop lists its own point value (typically 3-20 points).
                  </p>

                  <div className="mt-4 space-y-1.5">
                    <ScoreRow color="text-green-600" pts="3-20" label="Correct Prop" desc="Your answer matches the resolved outcome — points match the prop's listed value" />
                    <ScoreRow color="text-red-400" pts={0} label="Wrong / No Pick" desc="Wrong answer, or you didn't submit a pick before the prop was locked" />
                  </div>

                  <p>
                    Props are resolved by your commissioner after the relevant draft event occurs. Points are added to your combined pool score.
                  </p>
                </section>
              )}

              {/* ── Combined Score ── */}
              <section id="combined">
                <SectionHeading>Combined Score</SectionHeading>
                {enabledTracks.length === 1 ? (
                  <p>
                    Your pool only scores one track, so your combined score is simply your{" "}
                    <span className="text-white font-semibold">{enabledTracks[0]}</span> total.
                  </p>
                ) : (
                  <>
                    <p>Your pool score combines these tracks:</p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
                      {mockOn && (
                        <ScorePill className="border-[var(--lions-blue)]/30 bg-blue-500/10 text-blue-400">
                          Mock Draft Bonus
                        </ScorePill>
                      )}
                      {mockOn && (liveOn || triviaOn || propBetsOn) && <PlusSign />}
                      {liveOn && (
                        <ScorePill className="border-green-500/30 bg-green-500/10 text-green-400">
                          Live Predictions
                        </ScorePill>
                      )}
                      {liveOn && (triviaOn || propBetsOn) && <PlusSign />}
                      {triviaOn && (
                        <ScorePill className="border-purple-500/30 bg-purple-500/10 text-purple-400">
                          Trivia
                        </ScorePill>
                      )}
                      {triviaOn && propBetsOn && <PlusSign />}
                      {propBetsOn && (
                        <ScorePill className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                          Prop Bets
                        </ScorePill>
                      )}
                      <span className="text-white/40 font-bold text-lg">=</span>
                      <ScorePill className="border-white/20 bg-white/10 text-white">
                        Combined Score
                      </ScorePill>
                    </div>
                  </>
                )}

                <p>
                  {enabledTracks.length === 1
                    ? "Your pool ranking is based entirely on this total. Rankings update live as the draft progresses. Both individual standings and team standings (if your commissioner set up teams) use the same total."
                    : "The combined score determines your pool ranking. Rankings update live as each pick is announced. Both individual standings and team standings (if your commissioner set up teams) use the same combined score."}
                </p>

                <Callout>
                  All scoring and rankings are within your pool only — there is no global leaderboard. Each pool has its own standings.
                </Callout>
              </section>

              {/* ── Full Worked Example ── */}
              <section id="examples">
                <SectionHeading>Putting It All Together</SectionHeading>
                <p>Here&apos;s what a typical scoring picture looks like after the first 5 picks:</p>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-white/50 uppercase tracking-wider">
                        <th className="pb-2 pr-3">Track</th>
                        <th className="pb-2 pr-3">What Happened</th>
                        <th className="pb-2 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/70">
                      {mockOn && (
                        <tr className="border-t border-white/5">
                          <td className="py-2 pr-3"><span className="text-blue-400 font-semibold">Mock Bonus</span></td>
                          <td className="py-2 pr-3">2 players called, 1 exact slot, 1 position match</td>
                          <td className="py-2 text-right font-bold">19</td>
                        </tr>
                      )}
                      {liveOn && (
                        <tr className="border-t border-white/5">
                          <td className="py-2 pr-3"><span className="text-green-400 font-semibold">Live Predictions</span></td>
                          <td className="py-2 pr-3">Called pick #1 and #4 correctly (2 × 10)</td>
                          <td className="py-2 text-right font-bold">20</td>
                        </tr>
                      )}
                      {triviaOn && (
                        <tr className="border-t border-white/5">
                          <td className="py-2 pr-3"><span className="text-purple-400 font-semibold">Trivia</span></td>
                          <td className="py-2 pr-3">3 correct: 1 easy (3) + 1 medium (5) + 1 hard (10)</td>
                          <td className="py-2 text-right font-bold">18</td>
                        </tr>
                      )}
                      {propBetsOn && (
                        <tr className="border-t border-white/5">
                          <td className="py-2 pr-3"><span className="text-amber-400 font-semibold">Prop Bets</span></td>
                          <td className="py-2 pr-3">2 correct props (5 + 10)</td>
                          <td className="py-2 text-right font-bold">15</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/20">
                        <td colSpan={2} className="py-2 pr-3 text-right text-xs text-white/50 uppercase">Combined Score</td>
                        <td className="py-2 text-right text-lg font-bold text-white">
                          {(mockOn ? 19 : 0) + (liveOn ? 20 : 0) + (triviaOn ? 18 : 0) + (propBetsOn ? 15 : 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {enabledTracks.length > 1 && (
                  <div className="mt-4 rounded-lg bg-white/8 border border-white/[0.12] p-4">
                    <p className="text-sm text-white/60">
                      Your rival showed up with strong mock scouting but missed most live opportunities. Showing up on draft night across all enabled tracks is how you win.
                    </p>
                  </div>
                )}
              </section>

              {/* ── Commissioner Controls ── */}
              <section id="commissioner">
                <SectionHeading>Commissioner Controls</SectionHeading>

                <SubHeading>Standard Scoring (Default)</SubHeading>
                <p>
                  Most pools use Standard Scoring — the official point values. Standard pools get a <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-400">Standard Scoring</span> badge.
                </p>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-white/50 uppercase tracking-wider">
                        <th className="pb-2 pr-3">Track</th>
                        <th className="pb-2 pr-3">Tier</th>
                        <th className="pb-2 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/70">
                      {mockOn && (
                        <>
                          <tr className="border-t border-white/5"><td className="py-1.5 pr-3 text-blue-400">Mock</td><td className="py-1.5 pr-3">Player Called</td><td className="py-1.5 text-right font-bold">3</td></tr>
                          <tr className="border-t border-white/5"><td className="py-1.5 pr-3 text-blue-400">Mock</td><td className="py-1.5 pr-3">Close Range (±3 picks)</td><td className="py-1.5 text-right font-bold">+2</td></tr>
                          <tr className="border-t border-white/5"><td className="py-1.5 pr-3 text-blue-400">Mock</td><td className="py-1.5 pr-3">Far Range (±7 picks)</td><td className="py-1.5 text-right font-bold">+1</td></tr>
                          <tr className="border-t border-white/5"><td className="py-1.5 pr-3 text-blue-400">Mock</td><td className="py-1.5 pr-3">Exact Slot</td><td className="py-1.5 text-right font-bold">+5</td></tr>
                          <tr className="border-t border-white/5"><td className="py-1.5 pr-3 text-blue-400">Mock</td><td className="py-1.5 pr-3">Position Match</td><td className="py-1.5 text-right font-bold">1</td></tr>
                        </>
                      )}
                      {liveOn && (
                        <tr className="border-t border-white/5"><td className="py-1.5 pr-3 text-green-400">Live</td><td className="py-1.5 pr-3">Correct Prediction</td><td className="py-1.5 text-right font-bold">10</td></tr>
                      )}
                      {triviaOn && (
                        <>
                          <tr className="border-t border-white/5"><td className="py-1.5 pr-3 text-purple-400">Trivia</td><td className="py-1.5 pr-3">Easy</td><td className="py-1.5 text-right font-bold">3</td></tr>
                          <tr className="border-t border-white/5"><td className="py-1.5 pr-3 text-purple-400">Trivia</td><td className="py-1.5 pr-3">Medium</td><td className="py-1.5 text-right font-bold">5</td></tr>
                          <tr className="border-t border-white/5"><td className="py-1.5 pr-3 text-purple-400">Trivia</td><td className="py-1.5 pr-3">Hard</td><td className="py-1.5 text-right font-bold">10</td></tr>
                        </>
                      )}
                      {propBetsOn && (
                        <tr className="border-t border-white/5"><td className="py-1.5 pr-3 text-amber-400">Prop</td><td className="py-1.5 pr-3">Correct (per-prop value)</td><td className="py-1.5 text-right font-bold">3-20</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <SubHeading>Custom Scoring</SubHeading>
                <p>
                  Commissioners can switch to Custom Scoring to set their own point values. Custom pools show a <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">Custom Rules</span> badge and use their own scale — great for experimenting or tailoring the experience to your group.
                </p>
                <p>Commissioners can also toggle entire scoring tracks on or off and choose which rounds count.</p>
              </section>

              {/* ── Team Scoring ── */}
              <section id="team-scoring">
                <SectionHeading>Team Scoring</SectionHeading>
                <p>
                  When your commissioner creates teams, your individual score feeds into your team&apos;s total. There&apos;s no extra scoring — teams simply combine what each member earns across enabled tracks.
                </p>

                <SubHeading>Worked Example</SubHeading>
                <p>Team: <strong className="text-white">&apos;The Draft Kings&apos;</strong> (3 members)</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-white/50 uppercase tracking-wider">
                        <th className="pb-2 pr-3">Member</th>
                        {mockOn && <th className="pb-2 pr-3">Mock Bonus</th>}
                        {liveOn && <th className="pb-2 pr-3">Live Picks</th>}
                        {triviaOn && <th className="pb-2 pr-3">Trivia</th>}
                        {propBetsOn && <th className="pb-2 pr-3">Props</th>}
                        <th className="pb-2 text-right">Combined</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/70">
                      <TeamRow name="Alex" mock={18} live={40} trivia={21} props={10} mockOn={mockOn} liveOn={liveOn} triviaOn={triviaOn} propBetsOn={propBetsOn} />
                      <TeamRow name="Jordan" mock={12} live={50} trivia={16} props={5} mockOn={mockOn} liveOn={liveOn} triviaOn={triviaOn} propBetsOn={propBetsOn} />
                      <TeamRow name="Sam" mock={24} live={30} trivia={28} props={15} mockOn={mockOn} liveOn={liveOn} triviaOn={triviaOn} propBetsOn={propBetsOn} />
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/20">
                        <td className="py-2 pr-3 font-bold text-white">Team Total</td>
                        {mockOn && <td className="py-2 pr-3 font-bold text-blue-400">54</td>}
                        {liveOn && <td className="py-2 pr-3 font-bold text-green-400">120</td>}
                        {triviaOn && <td className="py-2 pr-3 font-bold text-purple-400">65</td>}
                        {propBetsOn && <td className="py-2 pr-3 font-bold text-amber-400">30</td>}
                        <td className="py-2 text-right text-lg font-bold text-white">
                          {(mockOn ? 54 : 0) + (liveOn ? 120 : 0) + (triviaOn ? 65 : 0) + (propBetsOn ? 30 : 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <Callout>
                  Not on a team? If your commissioner hasn&apos;t set up teams, you&apos;ll only see the Individual leaderboard. Your scores still count — teams are an optional layer on top.
                </Callout>
              </section>
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-white/[0.12] bg-white/8 p-8 text-center">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            READY TO DRAFT?
          </h2>
          <p className="mt-2 text-sm text-white/50">
            {mockOn ? "Build your mock draft and compete with friends." : "Head to your pool and get ready for draft night."}
          </p>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={session?.user ? (mockOn ? "/my-board" : propBetsOn ? "/props" : "/live") : "/login"}
              className="rounded-lg bg-[var(--lions-blue)] px-8 py-3 text-sm font-bold text-white hover:bg-[var(--lions-blue)]/80 transition"
            >
              {session?.user
                ? mockOn
                  ? "Go to My Draft"
                  : propBetsOn
                  ? "Make Your Prop Bets"
                  : "See You on Draft Night"
                : "Sign In & Draft"}
            </Link>
            {mockOn && (
              <Link
                href="/picks"
                className="rounded-lg border border-white/20 px-8 py-3 text-sm font-semibold text-white/70 hover:border-white/40 hover:text-white transition"
              >
                View Mock Drafts
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable components ──

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xl font-bold text-white tracking-wide sm:text-2xl"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-8 mb-2 text-sm font-bold uppercase tracking-wider text-[var(--lions-blue)]">{children}</h3>;
}

function ScoreRow({ color, pts, label, desc }: { color: string; pts: number | string; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/8 px-4 py-3">
      <span className={`text-lg font-bold w-12 text-center ${color}`}>
        {typeof pts === "number" ? `+${pts}` : pts}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-white/50">{desc}</p>
      </div>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-lg border border-[var(--lions-blue)]/30 bg-[var(--lions-blue)]/10 px-4 py-3">
      <p className="text-sm text-white/70">{children}</p>
    </div>
  );
}

function ScorePill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`rounded-lg border px-4 py-2 text-sm font-bold ${className}`}>
      {children}
    </span>
  );
}

function PlusSign() {
  return <span className="text-white/40 font-bold text-lg">+</span>;
}

function TeamRow({
  name,
  mock,
  live,
  trivia,
  props,
  mockOn,
  liveOn,
  triviaOn,
  propBetsOn,
}: {
  name: string;
  mock: number;
  live: number;
  trivia: number;
  props: number;
  mockOn: boolean;
  liveOn: boolean;
  triviaOn: boolean;
  propBetsOn: boolean;
}) {
  const combined =
    (mockOn ? mock : 0) + (liveOn ? live : 0) + (triviaOn ? trivia : 0) + (propBetsOn ? props : 0);
  return (
    <tr className="border-t border-white/5">
      <td className="py-2 pr-3">{name}</td>
      {mockOn && <td className="py-2 pr-3 text-blue-400">{mock}</td>}
      {liveOn && <td className="py-2 pr-3 text-green-400">{live}</td>}
      {triviaOn && <td className="py-2 pr-3 text-purple-400">{trivia}</td>}
      {propBetsOn && <td className="py-2 pr-3 text-amber-400">{props}</td>}
      <td className="py-2 text-right font-bold">{combined}</td>
    </tr>
  );
}
