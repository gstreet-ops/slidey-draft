import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "mock-draft", label: "Your Mock Draft" },
  { id: "prospects", label: "Scouting Prospects" },
  { id: "scoring", label: "Scoring System" },
  { id: "pools", label: "Pools & Competitions" },
  { id: "draft-day", label: "Draft Day" },
  { id: "faq", label: "FAQ" },
];

export default async function GuidePage() {
  const session = await auth();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/picks", label: "All Picks" },
    { href: "/leaderboard", label: "Leaderboard" },
    ...(session?.user
      ? [{ href: "/my-board", label: "My Board" }]
      : [{ href: "/login", label: "Sign In" }]),
  ];

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <MobileNav
        links={navLinks}
        logo={
          <Link href="/" className="text-lg font-bold text-white tracking-wider sm:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
            SLIDEY<span className="text-[var(--lions-blue)]">.COM</span> DRAFT
          </Link>
        }
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <h1
          className="text-3xl font-bold text-white tracking-wide sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          HOW TO PLAY
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Everything you need to know about Slidey Draft.
        </p>

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

        <div className="mt-10 space-y-14">
          {/* ── Overview ── */}
          <section id="overview">
            <SectionHeading>Overview</SectionHeading>
            <p>
              Slidey Draft is a mock draft competition for the 2026 NFL Draft. You build a 32-pick mock draft predicting which players will go to which teams, then compete against friends to see who can predict the real draft most accurately.
            </p>
            <StepList>
              <Step n={1}>Create your mock draft before the draft starts</Step>
              <Step n={2}>Join or create a pool to compete with friends</Step>
              <Step n={3}>Watch the real draft and earn points for correct predictions</Step>
              <Step n={4}>Win bragging rights on the leaderboard</Step>
            </StepList>
          </section>

          {/* ── Mock Draft ── */}
          <section id="mock-draft">
            <SectionHeading>Your Mock Draft</SectionHeading>
            <p>
              Head to <InlineLink href="/my-board">My Board</InlineLink> to start building your mock draft. You have 32 picks to fill — one for each first-round selection.
            </p>

            <SubHeading>Making Picks</SubHeading>
            <p>
              Click an empty slot on the draft board to activate it. The prospect pool panel will show available players — search by name, position, or school, and use the position filter tabs to narrow your options. Click a player to assign them to that slot.
            </p>

            <SubHeading>Researching Prospects</SubHeading>
            <p>
              Every prospect has a detailed scouting profile. Click the blue <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--lions-blue)]/20 text-[var(--lions-blue)] text-[10px] font-bold align-middle mx-0.5">i</span> button next to any player to see their full profile — scouting grade, NFL comparison, combine measurables, and a detailed scouting report. You can also click any player name on a completed pick card to review their profile.
            </p>

            <SubHeading>Pick Analysis</SubHeading>
            <p>
              When a pick slot is active, you can optionally write your reasoning in the analysis box ("Why this pick?"). This shows on the public mock draft when your board is published — a chance to explain your thinking.
            </p>

            <SubHeading>Auto-Fill</SubHeading>
            <p>
              If you want to fill remaining slots quickly, the auto-fill feature assigns the next best available prospect (by consensus rank) to each empty slot. Auto-filled picks are marked with a "BPA" tag.
            </p>

            <SubHeading>Publishing</SubHeading>
            <p>
              Once you are happy with your picks, publish your board. Published boards are visible to everyone and will be scored when the real draft begins. You can edit picks until the draft locks.
            </p>
          </section>

          {/* ── Prospects ── */}
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

          {/* ── Scoring ── */}
          <section id="scoring">
            <SectionHeading>Scoring System</SectionHeading>
            <p>
              When the real NFL Draft happens, your mock draft is scored against the actual results. Points are awarded for each pick based on how close your prediction was.
            </p>

            <SubHeading>Global Leaderboard Scoring</SubHeading>
            <p>Your mock draft is scored pick-by-pick:</p>
            <ScoreTable>
              <ScoreRow type="exact" label="Exact Match" desc="Correct player at the correct pick number" pts={10} />
              <ScoreRow type="close" label="Close" desc="Correct player, within 5 picks of actual slot" pts={5} />
              <ScoreRow type="far" label="Far" desc="Correct player, 6+ picks off from actual slot" pts={3} />
              <ScoreRow type="miss" label="Miss" desc="Player not drafted in Round 1, or wrong entirely" pts={0} />
            </ScoreTable>
            <p className="mt-3">
              For example: if you predicted Travis Hunter at pick #4 and he actually goes at pick #2, that is 2 picks off — a "Close" match worth <span className="font-semibold text-yellow-400">5 points</span>.
            </p>

            <SubHeading>Pool Scoring (Tiered System)</SubHeading>
            <p>
              Pools use a more detailed tiered scoring system for mock drafts:
            </p>
            <ScoreTable>
              <ScoreRow type="exact" label="Exact Slot" desc="Correct player at the correct pick" pts={5} />
              <ScoreRow type="close" label="Player Called + Close" desc="Player drafted, within 3 picks" pts={"3 + 2"} />
              <ScoreRow type="far" label="Player Called + Far" desc="Player drafted, within 4-7 picks" pts={"3 + 1"} />
              <ScoreRow type="miss" label="Position Match" desc="Wrong player but correct position for that slot" pts={1} />
            </ScoreTable>

            <SubHeading>Live Prediction Scoring</SubHeading>
            <p>
              During the draft, pool members can predict each pick in real-time before it is announced. Correct live predictions earn <span className="font-semibold text-green-400">10 points</span> each. Your pool score is the sum of your mock draft bonus + live prediction points.
            </p>
          </section>

          {/* ── Pools ── */}
          <section id="pools">
            <SectionHeading>Pools & Competitions</SectionHeading>
            <p>
              Pools are private competitions between friends. Create a pool and share the invite link — anyone with the link can join.
            </p>

            <SubHeading>Creating a Pool</SubHeading>
            <p>
              Go to <InlineLink href="/pools/create">Pools &rarr; Create</InlineLink>, name your pool, and share the invite code with friends. You are automatically the commissioner.
            </p>

            <SubHeading>Pool Standings</SubHeading>
            <p>
              Pool standings combine two scores:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-white/60">
              <li className="flex gap-2"><span className="text-white/30">&bull;</span><span><span className="text-white font-semibold">Mock Draft Bonus</span> — points from your published mock draft (tiered scoring above)</span></li>
              <li className="flex gap-2"><span className="text-white/30">&bull;</span><span><span className="text-white font-semibold">Live Prediction Total</span> — points from correct real-time picks during the draft</span></li>
            </ul>
            <p className="mt-2">
              The combined score determines your pool rank. Rankings update live as the draft progresses.
            </p>
          </section>

          {/* ── Draft Day ── */}
          <section id="draft-day">
            <SectionHeading>What Happens on Draft Day</SectionHeading>
            <p>
              When the NFL Draft begins, the app shifts into live mode:
            </p>

            <StepList>
              <Step n={1}>
                <span className="text-white font-semibold">Boards lock</span> — you can no longer edit your mock draft
              </Step>
              <Step n={2}>
                <span className="text-white font-semibold">War Room opens</span> — the <InlineLink href="/live">Live</InlineLink> page shows a real-time feed of actual picks, your board vs. reality, and a live leaderboard
              </Step>
              <Step n={3}>
                <span className="text-white font-semibold">Live predictions</span> — if you are in a pool, you can predict each pick before it is announced for bonus points
              </Step>
              <Step n={4}>
                <span className="text-white font-semibold">Scores update in real-time</span> — the leaderboard and pool standings refresh as each pick is announced
              </Step>
              <Step n={5}>
                <span className="text-white font-semibold">Final results</span> — after all 32 picks, the leaderboard is finalized with final scores, accuracy percentages, and a winner
              </Step>
            </StepList>

            <SubHeading>The War Room</SubHeading>
            <p>
              The War Room (<InlineLink href="/live">/live</InlineLink>) is a three-panel view:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-white/60">
              <li className="flex gap-2"><span className="text-white/30">&bull;</span><span><span className="text-white font-semibold">Actual Picks</span> — real-time feed of announced draft picks</span></li>
              <li className="flex gap-2"><span className="text-white/30">&bull;</span><span><span className="text-white font-semibold">Your Board</span> — your mock draft with running score, showing matches and misses</span></li>
              <li className="flex gap-2"><span className="text-white/30">&bull;</span><span><span className="text-white font-semibold">Leaderboard</span> — live rankings with trending arrows showing who is climbing or falling</span></li>
            </ul>
          </section>

          {/* ── FAQ ── */}
          <section id="faq">
            <SectionHeading>FAQ</SectionHeading>

            <Faq q="When does my board lock?">
              Your board locks when the admin enables draft mode, typically right before the first pick is announced. You will see a banner on My Board indicating the draft is locked.
            </Faq>

            <Faq q="Can I edit my mock draft after publishing?">
              Yes, you can edit picks until the draft locks. Once locked, your board is final.
            </Faq>

            <Faq q="What if I do not fill all 32 picks?">
              Unfilled picks score 0 points. Use the auto-fill feature to quickly fill remaining slots with the best available prospects by consensus rank.
            </Faq>

            <Faq q="How are ties broken on the leaderboard?">
              Ties are broken by number of exact matches, then by number of correct players.
            </Faq>

            <Faq q="Can I be in multiple pools?">
              Yes, you can join as many pools as you like. Your mock draft is the same across all pools, but your live predictions are per-pool.
            </Faq>

            <Faq q="What is the 'BPA' tag on some picks?">
              BPA stands for "Best Player Available." It indicates a pick that was auto-filled based on consensus rankings rather than manually selected.
            </Faq>

            <Faq q="How do live predictions work?">
              During the draft, each pool shows which team is "on the clock." You pick which player you think they will select before the pick is announced. Correct predictions earn 10 points.
            </Faq>

            <Faq q="Where can I see the scouting report for a player?">
              Click the blue info icon next to any player in the prospect pool, or click any player name on a pick card. This opens a detailed profile with their grade, combine numbers, NFL comparison, and full scouting report.
            </Faq>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            READY TO DRAFT?
          </h2>
          <p className="mt-2 text-sm text-white/50">Build your mock draft and compete with friends.</p>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={session?.user ? "/my-board" : "/login"}
              className="rounded-lg bg-[var(--lions-blue)] px-8 py-3 text-sm font-bold text-white hover:bg-[var(--lions-blue)]/80 transition"
            >
              {session?.user ? "Go to My Board" : "Sign In & Draft"}
            </Link>
            <Link
              href="/picks"
              className="rounded-lg border border-white/20 px-8 py-3 text-sm font-semibold text-white/70 hover:border-white/40 hover:text-white transition"
            >
              View Mock Drafts
            </Link>
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
  return <h3 className="mt-6 text-sm font-bold uppercase tracking-wider text-[var(--lions-blue)]">{children}</h3>;
}

function StepList({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 space-y-3">{children}</div>;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--lions-blue)]/20 text-xs font-bold text-[var(--lions-blue)]">
        {n}
      </span>
      <p className="text-sm text-white/60 pt-0.5">{children}</p>
    </div>
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
    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs text-white/50">{desc}</p>
    </div>
  );
}

function ScoreTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
      <div className="divide-y divide-white/10">{children}</div>
    </div>
  );
}

function ScoreRow({ type, label, desc, pts }: { type: string; label: string; desc: string; pts: number | string }) {
  const colors: Record<string, string> = {
    exact: "text-green-400",
    close: "text-yellow-400",
    far: "text-orange-400",
    miss: "text-red-400",
  };
  return (
    <div className="flex items-center gap-3 bg-white/5 px-4 py-3">
      <span className={`text-lg font-bold w-12 text-center ${colors[type] || "text-white"}`}>
        {typeof pts === "number" ? `+${pts}` : `+${pts}`}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-white/40">{desc}</p>
      </div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-sm font-semibold text-white">{q}</p>
      <p className="mt-1.5 text-sm text-white/50">{children}</p>
    </div>
  );
}
