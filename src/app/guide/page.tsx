import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPoolsForUser } from "@/lib/queries";
import { getPoolSettings } from "@/lib/pool-settings";
import { getEnabledFeatures, type FeatureKey } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

type SectionDef = { id: string; label: string; always?: true; feature?: FeatureKey };

const allSections: SectionDef[] = [
  { id: "overview", label: "Overview", always: true },
  { id: "mock-draft", label: "Mock Drafts", feature: "mockDraft" },
  { id: "prospects", label: "Scouting", feature: "mockDraft" },
  { id: "live-predictions", label: "Live Predictions", feature: "livePredictions" },
  { id: "trivia", label: "Trivia", feature: "trivia" },
  { id: "prop-bets", label: "Prop Bets", feature: "propBets" },
  { id: "watch-party", label: "Watch Party", feature: "watchParty" },
  { id: "scoring", label: "Scoring", always: true },
  { id: "pools", label: "Pools", always: true },
  { id: "faq", label: "FAQ", always: true },
];

export default async function GuidePage() {
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

  const shouldShow = (s: SectionDef) => {
    if (s.always) return true;
    if (enabledFeatures === null) return true;
    return s.feature ? enabledFeatures.has(s.feature) : false;
  };

  const sections = allSections.filter(shouldShow);
  const visibleSectionIds = new Set(sections.map((s) => s.id));
  const mockDraftOn = enabledFeatures === null || enabledFeatures.has("mockDraft");
  const liveOn = enabledFeatures === null || enabledFeatures.has("livePredictions");
  const triviaOn = enabledFeatures === null || enabledFeatures.has("trivia");
  const propBetsOn = enabledFeatures === null || enabledFeatures.has("propBets");
  const watchPartyOn = enabledFeatures === null || enabledFeatures.has("watchParty");
  const enabledScoringTracks = [
    mockDraftOn && "Mock Draft",
    liveOn && "Live Predictions",
    triviaOn && "Trivia",
    propBetsOn && "Prop Bets",
  ].filter(Boolean) as string[];
  const isMockOnly =
    enabledFeatures !== null &&
    mockDraftOn &&
    !liveOn &&
    !triviaOn &&
    !propBetsOn &&
    !watchPartyOn;
  const subtitle =
    enabledFeatures !== null && poolName
      ? `How ${poolName} works.`
      : "Everything you need to know about Draft Day Challenge.";

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex flex-col">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1
          className="text-3xl font-bold text-white tracking-wide sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          HOW TO PLAY
        </h1>
        <p className="mt-2 text-sm text-white/50">{subtitle}</p>

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
          {/* ── Overview ── */}
          <section id="overview">
            <SectionHeading>Overview</SectionHeading>
            {enabledFeatures === null ? (
              <>
                <p>
                  Draft Day Challenge is a live draft night competition for the 2026 NFL Draft. You build a 32-pick mock draft predicting which players will go to which teams, then compete against friends to see who can predict the real draft most accurately.
                </p>
                <StepList>
                  <Step n={1}>Create your mock draft before the draft starts</Step>
                  <Step n={2}>Join or create a pool to compete with friends</Step>
                  <Step n={3}>Watch the real draft and earn points for correct predictions</Step>
                  <Step n={4}>Win bragging rights on the leaderboard</Step>
                </StepList>
              </>
            ) : (
              <>
                <p>
                  {poolName ? `${poolName} is` : "Your pool is"} running a subset of Draft Day Challenge. Here is what your pool is playing:
                </p>
                <StepList>
                  {mockDraftOn && (
                    <StepIcon icon={"\uD83D\uDCCB"}>
                      <span className="text-white font-semibold">Build your mock draft</span> — predict which players go where in Round 1. Publish your board before draft night to earn mock bonus points.
                    </StepIcon>
                  )}
                  {propBetsOn && (
                    <StepIcon icon={"\uD83C\uDFB2"}>
                      <span className="text-white font-semibold">Make your prop bets</span> — side predictions on draft outcomes for bonus points.
                    </StepIcon>
                  )}
                  {liveOn && (
                    <StepIcon icon={"\u26A1"}>
                      <span className="text-white font-semibold">Predict live picks</span> — on draft night, call each pick before the card is read for 10 points each.
                    </StepIcon>
                  )}
                  {triviaOn && (
                    <StepIcon icon={"\uD83E\uDDE0"}>
                      <span className="text-white font-semibold">Play trivia</span> — answer NFL draft questions between picks for 3-10 bonus points.
                    </StepIcon>
                  )}
                  {watchPartyOn && (
                    <StepIcon icon={"\uD83C\uDFA5"}>
                      <span className="text-white font-semibold">Join the watch party</span> — video call with your pool while the draft unfolds.
                    </StepIcon>
                  )}
                </StepList>
                {isMockOnly && (
                  <Callout>
                    Your pool is running <strong className="text-white">Mock Drafts only</strong>. Build at least one mock draft board and publish it — that board becomes your entry and will be scored when the real draft happens. No live activity required on draft night (but you can still watch along!).
                  </Callout>
                )}
              </>
            )}
          </section>

          {/* ── Mock Draft ── */}
          {visibleSectionIds.has("mock-draft") && (
            <section id="mock-draft">
              <SectionHeading>Your Mock Draft</SectionHeading>
              <p>
                Head to <InlineLink href="/my-board">My Draft</InlineLink> to start building your mock draft. You have 32 picks to fill — one for each first-round selection.
              </p>

              <Callout>
                <strong className="text-white">Mock drafts are scored independently.</strong> Points are awarded based on how closely your predictions match the real draft: exact player + exact slot (10 pts), correct player wrong slot (5 pts), close range (3 pts), position match (1 pt).
              </Callout>

              <Callout>
                <strong className="text-white">Designate your entry:</strong> if you create multiple mock draft boards, your published board is automatically your entry. If you have multiple published boards, the one with the most picks is used.
              </Callout>

              <div className="mt-6 space-y-3">
                <InfoCard title="Making Picks">
                  Click an empty slot on the draft board to activate it. The prospect pool panel will show available players — search by name, position, or school, and use the position filter tabs to narrow your options. Click a player to assign them to that slot.
                </InfoCard>

                <InfoCard title="Researching Prospects">
                  Every prospect has a detailed scouting profile. Click the blue <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--lions-blue)]/20 text-[var(--lions-blue)] text-[10px] font-bold align-middle mx-0.5">i</span> button next to any player to see their full profile — scouting grade, NFL comparison, combine measurables, and a detailed scouting report. You can also click any player name on a completed pick card to review their profile.
                </InfoCard>

                <InfoCard title="Pick Analysis">
                  When a pick slot is active, you can optionally write your reasoning in the analysis box (&quot;Why this pick?&quot;). This shows on the public mock draft when your board is published — a chance to explain your thinking.
                </InfoCard>

                <InfoCard title="Auto-Fill">
                  If you want to fill remaining slots quickly, the auto-fill feature assigns the next best available prospect (by consensus rank) to each empty slot. Auto-filled picks are marked with a &quot;BPA&quot; tag.
                </InfoCard>

                <InfoCard title="Publishing">
                  Once you are happy with your picks, publish your board. Published boards are visible to everyone and will be scored when the real draft begins. You can edit picks until the draft locks.
                </InfoCard>
              </div>
            </section>
          )}

          {/* ── Prospects ── */}
          {visibleSectionIds.has("prospects") && (
            <section id="prospects">
              <SectionHeading>Scouting Prospects</SectionHeading>
              <p>
                Each of the 50 ranked prospects has a detailed profile:
              </p>
              <FeatureGrid>
                <Feature title="Scouting Grade" desc="0-100 rating based on consensus boards (ESPN, PFF, etc.)" />
                <Feature title="Position Rank" desc="How they rank within their position group" />
                <Feature title="NFL Comparison" desc="Current NFL player with a similar skill set" />
                <Feature title="Combine Measurables" desc="40-yard dash, vertical, bench press, broad jump, and more" />
                <Feature title="Scouting Report" desc="Detailed analysis of strengths, weaknesses, and projection" />
                <Feature title="Trait Tags" desc="Quick-glance labels like 'Elite Speed', 'Pro-Ready', 'Pass Rusher'" />
              </FeatureGrid>
            </section>
          )}

          {/* ── Live Predictions ── */}
          {visibleSectionIds.has("live-predictions") && (
            <section id="live-predictions">
              <SectionHeading>Live Predictions</SectionHeading>
              <p>
                When a team goes on the clock during the live draft, you have until the pick is announced to predict which player they will select.
              </p>
              <div className="mt-4 space-y-3">
                <InfoCard title="Where">
                  Head to the <InlineLink href="/live">Live</InlineLink> page on draft night. The prediction panel shows the team on the clock with a player search.
                </InfoCard>
                <InfoCard title="Scoring">
                  Correct prediction = 10 points. There is no partial credit — you either call it or you do not.
                </InfoCard>
                <InfoCard title="Tips">
                  Pay attention to reported trades and insider buzz. The prediction window closes when the pick is officially announced.
                </InfoCard>
              </div>
            </section>
          )}

          {/* ── Trivia ── */}
          {visibleSectionIds.has("trivia") && (
            <section id="trivia">
              <SectionHeading>Trivia</SectionHeading>
              <p>
                Your commissioner queues up trivia questions that fire between picks during the draft. Questions cover NFL history, draft facts, and sometimes pool-specific fun.
              </p>
              <div className="mt-4 space-y-3">
                <InfoCard title="Scoring">
                  Easy questions = 3 points, Medium = 5 points, Hard = 10 points. You must answer before the timer expires.
                </InfoCard>
                <InfoCard title="Tips">
                  Questions fire automatically between picks. Stay on the Live page to catch them. You can answer from mobile too.
                </InfoCard>
              </div>
            </section>
          )}

          {/* ── Prop Bets ── */}
          {visibleSectionIds.has("prop-bets") && (
            <section id="prop-bets">
              <SectionHeading>Prop Bets</SectionHeading>
              <p>
                Prop bets are side predictions about draft outcomes — who will be the first RB taken, will there be a trade in the top 5, how many QBs in round 1, etc.
              </p>
              <div className="mt-4 space-y-3">
                <InfoCard title="Where">
                  Head to the <InlineLink href="/props">Props</InlineLink> page to browse and submit your picks. Your commissioner may also create custom props for your pool.
                </InfoCard>
                <InfoCard title="Scoring">
                  Each prop has a point value (typically 3-10 points). Correct predictions earn those points. Props are resolved after the draft based on actual results.
                </InfoCard>
                <InfoCard title="Changing Your Pick">
                  You can change or clear your pick on any open prop until the commissioner locks them.
                </InfoCard>
              </div>
            </section>
          )}

          {/* ── Watch Party ── */}
          {visibleSectionIds.has("watch-party") && (
            <section id="watch-party">
              <SectionHeading>Watch Party</SectionHeading>
              <p>
                Draft night is best with friends. Your commissioner sets up a video call link (Google Meet, Zoom, etc.) that appears on the Live page during draft night.
              </p>
              <div className="mt-4 space-y-3">
                <InfoCard title="Joining">
                  Look for the green <strong className="text-white">Join Video Call</strong> button at the top of the Live page. Works great with split screen or picture-in-picture.
                </InfoCard>
                <InfoCard title="Live Feed">
                  The in-app Live Feed tracks pick announcements, trivia questions, and leaderboard changes automatically. Use the video call for conversation and the Live Feed to follow the action.
                </InfoCard>
              </div>
            </section>
          )}

          {/* ── Scoring ── */}
          <section id="scoring">
            <SectionHeading>Scoring System</SectionHeading>
            <p>
              {enabledFeatures === null
                ? "There are multiple ways to earn points:"
                : "Your pool scores the following:"}
            </p>

            <div className="mt-4 space-y-3">
              {mockDraftOn && (
                <ScoreCard icon={"\uD83D\uDCCB"} title="Mock Draft" color="text-[var(--lions-blue)]">
                  Earn bonus points for correctly predicting which players get drafted and where. Up to 10 points per pick.
                </ScoreCard>
              )}
              {liveOn && (
                <ScoreCard icon={"\u26A1"} title="Live Predictions" color="text-green-400">
                  Predict each pick in real time during the draft. 10 points for each correct call.
                </ScoreCard>
              )}
              {triviaOn && (
                <ScoreCard icon={"\uD83E\uDDE0"} title="Trivia" color="text-purple-400">
                  Answer draft trivia between picks. 3-10 points based on difficulty.
                </ScoreCard>
              )}
              {propBetsOn && (
                <ScoreCard icon={"\uD83C\uDFB2"} title="Prop Bets" color="text-amber-400">
                  3-10 points per correct prediction depending on the prop.
                </ScoreCard>
              )}
            </div>

            <p className="mt-4">
              {enabledScoringTracks.length === 1
                ? `Your final rank is based entirely on ${enabledScoringTracks[0]} points.`
                : "Your final rank is based on the combined score across all enabled scoring tracks."}
            </p>

            <div className="mt-6">
              <InlineLink href="/scoring">See the full scoring breakdown with examples &rarr;</InlineLink>
            </div>
          </section>

          {/* ── Pools ── */}
          <section id="pools">
            <SectionHeading>Pools &amp; Competitions</SectionHeading>
            <p>
              Pools are private competitions between friends. Create a pool and share the invite link — anyone with the link can join.
            </p>

            <SubHeading>Creating a Pool</SubHeading>
            <p>
              Go to <InlineLink href="/pools/create">Pools &rarr; Create</InlineLink>, name your pool, and share the invite code with friends. You are automatically the commissioner.
            </p>

            <SubHeading>Pool Standings</SubHeading>
            <p>
              {enabledScoringTracks.length === 1
                ? `Pool standings use ${enabledScoringTracks[0]} points:`
                : "Pool standings combine scores from enabled tracks:"}
            </p>
            <ul className="mt-3 space-y-2">
              {mockDraftOn && (
                <BulletCard label="Mock Draft Bonus">
                  — points from your published mock draft (tiered scoring)
                </BulletCard>
              )}
              {liveOn && (
                <BulletCard label="Live Prediction Total">
                  — points from correct real-time picks during the draft
                </BulletCard>
              )}
              {triviaOn && (
                <BulletCard label="Trivia">
                  — bonus points from answering trivia questions between picks (3-10 pts based on difficulty)
                </BulletCard>
              )}
              {propBetsOn && (
                <BulletCard label="Prop Bets">
                  — points from correct side predictions on draft outcomes
                </BulletCard>
              )}
            </ul>
            <p className="mt-2">
              {enabledScoringTracks.length === 1
                ? "Rankings update live as the draft progresses."
                : "The combined score from enabled tracks determines your pool rank. Rankings update live as the draft progresses."}
            </p>
          </section>

          {/* ── FAQ ── */}
          <section id="faq">
            <SectionHeading>FAQ</SectionHeading>

            {mockDraftOn && (
              <Faq q="When does my board lock?">
                Your board locks when the admin enables draft mode, typically right before the first pick is announced. You will see a banner on My Draft indicating the draft is locked.
              </Faq>
            )}

            {mockDraftOn && (
              <Faq q="Can I edit my mock draft after publishing?">
                Yes, you can edit picks until the draft locks. Once locked, your board is final.
              </Faq>
            )}

            {mockDraftOn && (
              <Faq q="What if I do not fill all 32 picks?">
                Unfilled picks score 0 points. Use the auto-fill feature to quickly fill remaining slots with the best available prospects by consensus rank.
              </Faq>
            )}

            {mockDraftOn && (
              <Faq q="What is the 'BPA' tag on some picks?">
                BPA stands for &quot;Best Player Available.&quot; It indicates a pick that was auto-filled based on consensus rankings rather than manually selected.
              </Faq>
            )}

            {triviaOn && (
              <Faq q="How does trivia work?">
                Your commissioner builds a queue of trivia questions that fire automatically between picks. Points depend on difficulty: Easy (3 pts), Medium (5 pts), Hard (10 pts). Questions can cover anything — NFL history, pop culture, inside jokes. Your commissioner can also set a timer (15-60 seconds), no timer, or pause mid-question.
              </Faq>
            )}

            {liveOn && (
              <Faq q="How do live predictions work?">
                During the draft, each pool shows which team is &quot;on the clock.&quot; You pick which player you think they will select before the pick is announced. Correct predictions earn 10 points.
              </Faq>
            )}

            {propBetsOn && (
              <Faq q="How do prop bets work?">
                Browse available props on the <InlineLink href="/props">Props</InlineLink> page, make your predictions, and earn points for correct calls. Your commissioner can also create custom props for your pool.
              </Faq>
            )}

            {isMockOnly && (
              <Faq q="What if my pool only has mock drafts?">
                Publish your mock draft board before the draft starts. Your board will be scored automatically as the real draft unfolds. You do not need to be online during the draft, but watching along is half the fun!
              </Faq>
            )}

            <Faq q="How are ties broken on the leaderboard?">
              Ties are broken by number of exact matches, then by number of correct players.
            </Faq>

            <Faq q="Can I be in multiple pools?">
              Yes, you can join as many pools as you like. Your mock draft is the same across all pools, but your live predictions are per-pool.
            </Faq>

            {mockDraftOn && (
              <Faq q="Where can I see the scouting report for a player?">
                Click the blue info icon next to any player in the prospect pool, or click any player name on a pick card. This opens a detailed profile with their grade, combine numbers, NFL comparison, and full scouting report.
              </Faq>
            )}

            <Faq q="Can the commissioner change which features are on?">
              Yes, your commissioner can enable or disable features from pool settings at any time before the draft.
            </Faq>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-white/[0.12] bg-white/8 p-8 text-center">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            READY TO DRAFT?
          </h2>
          <p className="mt-2 text-sm text-white/50">
            {mockDraftOn
              ? "Build your mock draft and compete with friends."
              : propBetsOn
              ? "Lock in your prop bets and compete with friends."
              : "See you on draft night."}
          </p>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <PrimaryCta session={!!session?.user} mockDraftOn={mockDraftOn} propBetsOn={propBetsOn} />
            {mockDraftOn && (
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

function PrimaryCta({ session, mockDraftOn, propBetsOn }: { session: boolean; mockDraftOn: boolean; propBetsOn: boolean }) {
  let href = "/login";
  let label = "Sign In & Draft";
  if (session) {
    if (mockDraftOn) {
      href = "/my-board";
      label = "Go to My Draft";
    } else if (propBetsOn) {
      href = "/props";
      label = "Make Your Prop Bets";
    } else {
      href = "/live";
      label = "See You on Draft Night";
    }
  }
  return (
    <Link
      href={href}
      className="rounded-lg bg-[var(--lions-blue)] px-8 py-3 text-sm font-bold text-white hover:bg-[var(--lions-blue)]/80 transition"
    >
      {label}
    </Link>
  );
}

// ── Reusable components ──

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/8 border border-white/[0.12] px-5 py-4">
      <p className="text-sm font-bold text-[var(--lions-blue)]">{title}</p>
      <p className="mt-1.5 text-sm text-white/60 leading-relaxed">{children}</p>
    </div>
  );
}

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

function StepList({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 space-y-3">{children}</div>;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start rounded-lg bg-white/8 border border-white/[0.12] px-4 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--lions-blue)] text-xs font-bold text-white">
        {n}
      </span>
      <p className="text-sm text-white/60 pt-0.5">{children}</p>
    </div>
  );
}

function StepIcon({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start rounded-lg bg-white/8 border border-white/[0.12] px-4 py-3">
      <span className="text-xl leading-none pt-0.5 shrink-0">{icon}</span>
      <p className="text-sm text-white/60 pt-0.5">{children}</p>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-[var(--lions-blue)]/30 bg-[var(--lions-blue)]/10 px-4 py-3">
      <p className="text-sm text-white/70 leading-relaxed">{children}</p>
    </div>
  );
}

function ScoreCard({ icon, title, color, children }: { icon: string; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/8 border border-white/[0.12] px-5 py-4 flex items-start gap-3">
      <span className="text-lg shrink-0">{icon}</span>
      <div>
        <p className={`text-sm font-bold ${color}`}>{title}</p>
        <p className="mt-0.5 text-sm text-white/60">{children}</p>
      </div>
    </div>
  );
}

function BulletCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start rounded-lg bg-white/8 border border-white/[0.12] px-4 py-3 text-sm text-white/60">
      <span className="text-white font-semibold shrink-0">{label}</span>
      <span>{children}</span>
    </li>
  );
}

function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[var(--lions-blue)] hover:underline font-medium">
      {children}
    </Link>
  );
}

function FeatureGrid({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg bg-white/8 border border-white/[0.12] px-4 py-3">
      <p className="text-sm font-bold text-[var(--lions-blue)]">{title}</p>
      <p className="mt-0.5 text-xs text-white/60">{desc}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg bg-white/8 border border-white/[0.12] px-4 py-4">
      <p className="text-sm font-semibold text-white">{q}</p>
      <p className="mt-1.5 text-sm text-white/50">{children}</p>
    </div>
  );
}
