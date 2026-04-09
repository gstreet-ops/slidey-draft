import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { CopyButton } from "@/components/copy-button";
import { auth } from "@/lib/auth";

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
  const session = await auth();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/picks", label: "Mock Drafts" },
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
          <Link
            href="/"
            className="text-lg font-bold text-white tracking-wider sm:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            DRAFT DAY <span className="text-[var(--slidey)]">CHALLENGE</span>
          </Link>
        }
      />

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
              Teams are optional but add a fun layer — individual scores roll up to team totals on the leaderboard.
            </p>
            <div className="mt-4 space-y-3">
              <InfoCard title="Create Teams">
                Go to <strong className="text-white">Pool Settings → Team Management</strong> to create teams with custom names and colors.
              </InfoCard>
              <InfoCard title="Assign Members">
                After creating teams, assign each pool member to a team. Members can also pick their own team when joining, depending on your settings.
              </InfoCard>
              <InfoCard title="Team Scoring">
                A team&apos;s score is the <strong className="text-white">sum of all member scores</strong> — mock bonus, live predictions, and trivia all count. The team leaderboard updates in real-time.
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
