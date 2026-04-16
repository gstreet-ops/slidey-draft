import Link from "next/link";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

const INVITE_TEXT = `🏈 Draft Day Challenge — NFL Draft Night Competition

Join our pool and compete on draft night! Here's how:

1. Go to https://draftdaychallenge.com and sign in
2. Join our pool with invite code: [YOUR-CODE]
3. Pick your favorite NFL team
4. Build your mock draft before April 23
5. Go live on draft night — predict picks, answer trivia, climb the leaderboard!

Scoring: Mock Board + Live Predictions + Trivia = Your Total Score

See you on draft night! 🎉`;

export default async function CommissionerGuidePage() {
  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <h1
          className="text-3xl font-bold text-white tracking-wide sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          COMMISSIONER GUIDE
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Set up your pool, manage teams, and run draft night.
        </p>
        <p className="mt-2 text-xs text-white/40">
          Looking for player instructions?{" "}
          <Link href="/guide/user" className="text-[var(--slidey)] hover:underline">
            Player Guide →
          </Link>
        </p>

        <div className="mt-8 space-y-6">
          {/* ── Setting Up Your Pool ── */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <SectionHeading>Setting Up Your Pool</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Creating a pool takes about two minutes. Once it&apos;s live, share your invite code and
              you&apos;re ready for draft night.
            </p>
            <div className="mt-4 space-y-3">
              <Step n={1}>Go to the <strong className="text-white">Pools page</strong> and create a new pool</Step>
              <Step n={2}><strong className="text-white">Share your invite code</strong> with friends — they enter it on the Join page</Step>
              <Step n={3}>Configure <strong className="text-white">pool settings</strong> — enable live predictions and mock bonus as desired</Step>
              <Step n={4}>Members can join and build their mock drafts right away</Step>
            </div>
          </section>

          {/* ── Managing Teams ── */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <SectionHeading>Managing Teams</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Teams are optional — best for pools with 6+ people. Skip them if you have a small group where individual competition is enough. If you do create teams, individual scores roll up to team totals and both standings are tracked on the leaderboard.
            </p>

            <h3 className="mt-6 mb-3 text-sm font-bold uppercase tracking-wider text-[var(--slidey)]">How to Create Teams</h3>
            <div className="space-y-3">
              <Step n={1}>Go to your pool dashboard → <strong className="text-white">Pool Settings → Team Management</strong></Step>
              <Step n={2}>Click <strong className="text-white">Create Team</strong> — give it a name and pick a color from the palette (8 preset colors)</Step>
              <Step n={3}>Create as many teams as you want — 2, 3, 4+ — flexible, not locked to two</Step>
              <Step n={4}>Assign members by clicking their name under <strong className="text-white">Unassigned Members</strong> and selecting a team</Step>
              <Step n={5}>Watch for the warning if any members are still unassigned — <strong className="text-white">unassigned members&apos; scores won&apos;t count toward any team</strong></Step>
            </div>

            <div className="mt-6 space-y-3">
              <InfoCard title="Balancing Teams">
                Try to make teams roughly equal in size. A team of 5 vs a team of 2 has a natural scoring advantage since team score = sum of members.
              </InfoCard>
              <InfoCard title="Team Scoring Formula">
                Team Score = sum of all member Combined Scores. Each member&apos;s Combined Score = Mock Bonus + Live Predictions + Trivia. Standard or Custom scoring (whichever the pool uses) applies to individual scores first, then those roll up to team totals.
              </InfoCard>
              <InfoCard title="During the Draft">
                The Teams tab on the leaderboard updates live. Team standings shift as members earn points. Use this as a trash-talk catalyst.
              </InfoCard>
            </div>
          </section>

          {/* ── Pool Theming ── */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <SectionHeading>Pool Theming</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Give your pool a custom look that carries through all pool pages.
            </p>
            <div className="mt-4 space-y-3">
              <InfoCard title="Pick Your Colors">
                Go to <strong className="text-white">Pool Settings → Pool Theme</strong> and pick primary and secondary colors.
              </InfoCard>
              <InfoCard title="Pool-Scoped Overrides">
                Your pool&apos;s colors will override the default accent on all pool pages — standings, live view, and leaderboard.
              </InfoCard>
              <InfoCard title="Member Logos">
                Members keep their personal team logo in the nav bar regardless of pool theme — it&apos;s their individual identity.
              </InfoCard>
            </div>
          </section>

          {/* ── Draft Night Checklist ── */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <SectionHeading>Draft Night Checklist</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Run through this before the draft starts to make sure everything is in order.
            </p>
            <div className="mt-4 space-y-3">
              <CheckItem>All members have <strong className="text-white">joined the pool</strong> and built their mock drafts</CheckItem>
              <CheckItem><strong className="text-white">Lock the pool</strong> before the draft starts — this freezes mock boards</CheckItem>
              <CheckItem>The <strong className="text-white">live page activates automatically</strong> when the draft begins — no action needed</CheckItem>
              <CheckItem>Scores update in <strong className="text-white">real-time</strong> — mock, predictions, and trivia all feed the leaderboard as picks are announced</CheckItem>
            </div>

            <div className="mt-5 rounded-lg border border-yellow-400/20 bg-yellow-900/10 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-yellow-400 mb-1">Heads Up</p>
              <p className="text-sm text-white/60">
                Once the pool is locked, mock boards are final. Make sure everyone has published their board before you lock.
              </p>
            </div>
          </section>

          {/* ── Running a Simulation ── */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <SectionHeading>Running a Simulation</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Test your setup before draft night by running a simulated draft. Simulations use realistic pick
              data so you can verify trivia, scoring, and the live experience all work correctly.
            </p>
            <div className="mt-4 space-y-3">
              <Step n={1}>Go to <strong className="text-white">Admin → Trivia</strong> and build your question queue for the pool</Step>
              <Step n={2}>Open <strong className="text-white"><a href="/live" className="text-[var(--slidey)] hover:underline">/live</a></strong> in a second tab to see what players will see</Step>
              <Step n={3}>Go to <strong className="text-white"><a href="/admin/simulate" className="text-[var(--slidey)] hover:underline">Admin → Simulate</a></strong> and click <strong className="text-white">Announce Next Pick</strong> or <strong className="text-white">Auto-Run All</strong></Step>
              <Step n={4}>Each simulated pick triggers the next trivia question automatically</Step>
              <Step n={5}>Watch the leaderboard, trivia, and chat update in real-time on /live</Step>
            </div>
            <div className="mt-4 space-y-3">
              <InfoCard title="Trivia Controls">
                You can also manually fire, skip, or pause trivia from the Live page — expand the Trivia Controls panel at the top.
              </InfoCard>
              <InfoCard title="Scoring">
                Simulation scoring works identically to the real draft — mock board bonus, live predictions, and trivia all count. Use this to verify your scoring settings are correct.
              </InfoCard>
              <InfoCard title="Reset">
                Click <strong className="text-white">Reset</strong> on the Simulate page to clear all results and start over. This also resets trivia queue progress.
              </InfoCard>
            </div>
          </section>

          {/* ── Invite Section ── */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <SectionHeading>Invite Template</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Use this template to invite your group. Replace <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">[YOUR-CODE]</code> with your actual pool invite code before sending.
            </p>
            <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-4">
              <pre className="whitespace-pre-wrap text-xs text-white/60 leading-relaxed font-mono">{INVITE_TEXT}</pre>
            </div>
            <div className="mt-4">
              <CopyButton text={INVITE_TEXT} label="Copy Invite Text" />
            </div>
          </section>
        </div>

        {/* Footer link */}
        <div className="mt-10 text-center">
          <p className="text-xs text-white/30">
            Sharing with players?{" "}
            <Link href="/guide/user" className="text-[var(--slidey)] hover:underline">
              View the Player Guide →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Shared components ──

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

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start rounded-lg bg-white/5 border border-white/10 px-4 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--slidey)] text-xs font-bold text-white">
        {n}
      </span>
      <p className="text-sm text-white/70 pt-0.5">{children}</p>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-5 py-4">
      <p className="text-sm font-bold text-[var(--slidey)]">{title}</p>
      <p className="mt-1.5 text-sm text-white/60 leading-relaxed">{children}</p>
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start rounded-lg bg-white/5 border border-white/10 px-4 py-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xs font-bold mt-0.5">
        ✓
      </span>
      <p className="text-sm text-white/70 leading-relaxed">{children}</p>
    </div>
  );
}
