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
    <div className="min-h-screen bg-[var(--steelers-black)]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <h1
          className="text-3xl font-bold text-[var(--text-primary)] tracking-wide sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          COMMISSIONER GUIDE
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Set up your pool, manage teams, and run draft night.
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Looking for player instructions?{" "}
          <Link href="/guide/user" className="text-[var(--slidey)] hover:underline">
            Player Guide →
          </Link>
        </p>

        <div className="mt-8 space-y-6">
          {/* ── Setting Up Your Pool ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Setting Up Your Pool</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Creating a pool takes about two minutes. Once it&apos;s live, share your invite code and
              you&apos;re ready for draft night.
            </p>
            <div className="mt-4 space-y-3">
              <Step n={1}>Go to the <strong className="text-[var(--text-primary)]">Pools page</strong> and create a new pool</Step>
              <Step n={2}><strong className="text-[var(--text-primary)]">Share your invite code</strong> with friends — they enter it on the Join page</Step>
              <Step n={3}>Configure <strong className="text-[var(--text-primary)]">pool settings</strong> — enable live predictions and mock bonus as desired</Step>
              <Step n={4}>Members can join and build their mock drafts right away</Step>
            </div>
          </section>

          {/* ── Managing Teams ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Managing Teams</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Teams are optional — best for pools with 6+ people. Skip them if you have a small group where individual competition is enough. If you do create teams, individual scores roll up to team totals and both standings are tracked on the leaderboard.
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
              <strong className="text-[var(--text-primary)]">Heads up — Team Draft is off by default.</strong> Flip it on in <strong className="text-[var(--text-primary)]">Pool Settings → Active Features → Team Draft</strong> before any of the team controls below show up. With it off, the Teams tab on the leaderboard and the Team Scoring section on /scoring also stay hidden for everyone in the pool.
            </p>

            <h3 className="mt-6 mb-3 text-sm font-bold uppercase tracking-wider text-[var(--slidey)]">How to Create Teams</h3>
            <div className="space-y-3">
              <Step n={1}>Enable <strong className="text-[var(--text-primary)]">Team Draft</strong> under Pool Settings → Active Features (it&apos;s off by default)</Step>
              <Step n={2}>Go to your pool dashboard → <strong className="text-[var(--text-primary)]">Pool Settings → Team Management</strong></Step>
              <Step n={3}>Click <strong className="text-[var(--text-primary)]">Create Team</strong> — give it a name and pick a color from the palette (8 preset colors)</Step>
              <Step n={4}>Create as many teams as you want — 2, 3, 4+ — flexible, not locked to two</Step>
              <Step n={5}>Assign members by clicking their name under <strong className="text-[var(--text-primary)]">Unassigned Members</strong> and selecting a team</Step>
              <Step n={6}>Watch for the warning if any members are still unassigned — <strong className="text-[var(--text-primary)]">unassigned members&apos; scores won&apos;t count toward any team</strong></Step>
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
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Pool Theming</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Give your pool a custom look that carries through all pool pages.
            </p>
            <div className="mt-4 space-y-3">
              <InfoCard title="Pick Your Colors">
                Go to <strong className="text-[var(--text-primary)]">Pool Settings → Pool Theme</strong> and pick primary and secondary colors.
              </InfoCard>
              <InfoCard title="Pool-Scoped Overrides">
                Your pool&apos;s colors will override every member&apos;s personal team accent on pool pages — standings, live view, and leaderboard. Off-pool pages still use each member&apos;s personal team theme.
              </InfoCard>
              <InfoCard title="Member Logos & Personal Theme">
                Members pick their own NFL team in <Link href="/settings" className="text-[var(--slidey)] hover:underline">Settings</Link>, which sets the accent color throughout the app for them. Their team logo also shows next to their name in the nav. Your pool theme overrides the accent only on pool pages.
              </InfoCard>
            </div>
          </section>

          {/* ── Draft Night Checklist ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Draft Night Checklist</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Run through this before the draft starts to make sure everything is in order.
            </p>
            <div className="mt-4 space-y-3">
              <CheckItem>All members have <strong className="text-[var(--text-primary)]">joined the pool</strong> and built their mock drafts</CheckItem>
              <CheckItem><strong className="text-[var(--text-primary)]">Lock the pool</strong> before the draft starts — this freezes mock boards</CheckItem>
              <CheckItem>The <strong className="text-[var(--text-primary)]">live page activates automatically</strong> when the draft begins — no action needed</CheckItem>
              <CheckItem>Scores update in <strong className="text-[var(--text-primary)]">real-time</strong> — mock, predictions, and trivia all feed the leaderboard as picks are announced</CheckItem>
            </div>

            <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-yellow-700 mb-1">Heads Up</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Once the pool is locked, mock boards are final. Make sure everyone has published their board before you lock.
              </p>
            </div>
          </section>

          {/* ── Running a Simulation ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Running a Simulation</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Test your setup before draft night by running a simulated draft. Simulations use realistic pick
              data so you can verify trivia, scoring, and the live experience all work correctly.
            </p>
            <div className="mt-4 space-y-3">
              <Step n={1}>Go to <strong className="text-[var(--text-primary)]">Admin → Trivia</strong> and build your question queue for the pool</Step>
              <Step n={2}>Open <strong className="text-[var(--text-primary)]"><a href="/live" className="text-[var(--slidey)] hover:underline">/live</a></strong> in a second tab to see what players will see</Step>
              <Step n={3}>Go to <strong className="text-[var(--text-primary)]"><a href="/admin/simulate" className="text-[var(--slidey)] hover:underline">Admin → Simulate</a></strong> and click <strong className="text-[var(--text-primary)]">Announce Next Pick</strong> or <strong className="text-[var(--text-primary)]">Auto-Run All</strong></Step>
              <Step n={4}>Each simulated pick triggers the next trivia question automatically</Step>
              <Step n={5}>Watch the leaderboard, trivia, and Live Feed update in real-time on /live</Step>
            </div>
            <div className="mt-4 space-y-3">
              <InfoCard title="Trivia Controls">
                You can also manually fire, skip, or pause trivia from the Live page — expand the Trivia Controls panel at the top.
              </InfoCard>
              <InfoCard title="Scoring">
                Simulation scoring works identically to the real draft — mock board bonus, live predictions, and trivia all count. Use this to verify your scoring settings are correct.
              </InfoCard>
              <InfoCard title="Reset">
                Click <strong className="text-[var(--text-primary)]">Reset</strong> on the Simulate page to clear all results and start over. This also resets trivia queue progress.
              </InfoCard>
            </div>
          </section>

          {/* ── Scoring Configuration ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Scoring Configuration</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Control how points are awarded in your pool. Open <strong className="text-[var(--text-primary)]">Scoring Settings</strong> on the Live page to configure.
            </p>
            <div className="mt-4 space-y-3">
              <InfoCard title="Standard Mode">
                Default point values: Exact slot +5, Player called +3, Within 5 picks +2, 6+ off +1, Position match +1. Live predictions +10. Trivia: Easy 3, Medium 5, Hard 10.
              </InfoCard>
              <InfoCard title="Custom Mode">
                Override any point value. Adjust mock pick tiers, live prediction rewards, and trivia difficulty multipliers to fit your pool&apos;s style.
              </InfoCard>
            </div>
          </section>

          {/* ── Video Call Setup ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Video Call Setup</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Set up a video call so your pool can talk during the draft.
            </p>
            <div className="mt-4 space-y-3">
              <Step n={1}>Create a Google Meet, Zoom, or any video call link</Step>
              <Step n={2}>On the <strong className="text-[var(--text-primary)]">Live page</strong>, expand <strong className="text-[var(--text-primary)]">Video Call</strong> in the commissioner controls</Step>
              <Step n={3}>Paste the URL and click <strong className="text-[var(--text-primary)]">Save</strong></Step>
              <Step n={4}>Players will see a green <strong className="text-[var(--text-primary)]">Join Video Call</strong> button at the top of their Live page</Step>
            </div>
          </section>

          {/* ── Live Page Controls ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Live Page Commissioner Controls</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              During the draft (or simulation), all commissioner controls are accessible directly from the Live page — no need to switch tabs.
            </p>
            <div className="mt-4 space-y-3">
              <InfoCard title="Trivia Controls">
                Fire, skip, or pause trivia questions. Set the timer (15s, 30s, 45s, 60s, or no timer). Preview the next 3 questions in the queue.
              </InfoCard>
              <InfoCard title="Simulation Controls">
                Announce picks one at a time or auto-run the entire draft. Adjust speed (1-10 seconds between picks). Reset to start over.
              </InfoCard>
              <InfoCard title="Scoring Settings">
                Switch between Standard and Custom scoring. Edit point values for mock picks, live predictions, and trivia on the fly.
              </InfoCard>
              <InfoCard title="Video Call">
                Paste a Meet/Zoom link so players can join with one click.
              </InfoCard>
            </div>
          </section>

          {/* ── Invite Section ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Invite Template</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Use this template to invite your group. Replace <code className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 text-xs text-[var(--text-primary)]">[YOUR-CODE]</code> with your actual pool invite code before sending.
            </p>
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-black/30 p-4">
              <pre className="whitespace-pre-wrap text-xs text-[var(--text-secondary)] leading-relaxed font-mono">{INVITE_TEXT}</pre>
            </div>
            <div className="mt-4">
              <CopyButton text={INVITE_TEXT} label="Copy Invite Text" />
            </div>
          </section>
        </div>

        {/* Footer link */}
        <div className="mt-10 text-center">
          <p className="text-xs text-[var(--text-muted)]">
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
      className="text-xl font-bold text-[var(--text-primary)] tracking-wide sm:text-2xl"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {children}
    </h2>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--slidey)] text-xs font-bold text-[var(--text-primary)]">
        {n}
      </span>
      <p className="text-sm text-[var(--text-secondary)] pt-0.5">{children}</p>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-5 py-4">
      <p className="text-sm font-bold text-[var(--slidey)]">{title}</p>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">{children}</p>
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold mt-0.5">
        ✓
      </span>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</p>
    </div>
  );
}
