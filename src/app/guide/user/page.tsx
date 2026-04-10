import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { CopyButton } from "@/components/copy-button";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const INVITE_TEXT = `🏈 Draft Day Challenge — NFL Draft Night Competition

Join our pool and compete on draft night! Here's how:

1. Go to https://draffdaychallenge.com and sign in
2. Join our pool with invite code: [YOUR-CODE]
3. Pick your favorite NFL team
4. Build your mock draft before April 23
5. Go live on draft night — predict picks, answer trivia, climb the leaderboard!

Scoring: Mock Board + Live Predictions + Trivia = Your Total Score

See you on draft night! 🎉`;

export default async function UserGuidePage() {
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
          PLAYER GUIDE
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Everything you need to compete on draft night.
        </p>
        <p className="mt-2 text-xs text-white/40">
          Commissioner?{" "}
          <Link href="/guide/commissioner" className="text-[var(--slidey)] hover:underline">
            Commissioner Guide →
          </Link>
        </p>

        <div className="mt-8 space-y-6">
          {/* ── How It Works ── */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <SectionHeading>How It Works</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Draft Day Challenge is a live NFL draft night competition. Build your mock board before
              the draft, then go live to predict every pick and answer trivia as it all unfolds.
            </p>
            <div className="mt-4 space-y-3">
              <Step n={1}>Join a pool using an <strong className="text-white">invite code</strong> from your commissioner</Step>
              <Step n={2}>Pick your <strong className="text-white">favorite NFL team</strong> to personalize your experience</Step>
              <Step n={3}>Build a <strong className="text-white">32-pick mock draft</strong> before draft night</Step>
              <Step n={4}>On draft night, go live — <strong className="text-white">predict every pick</strong>, answer trivia, watch the leaderboard</Step>
            </div>
          </section>

          {/* ── Scoring ── */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <SectionHeading>Scoring</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Your total score combines three tracks. The leaderboard updates in real-time as the draft progresses.
            </p>

            {/* Mock Bonus */}
            <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-900/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📋</span>
                <h3 className="text-base font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                  MOCK BONUS
                </h3>
              </div>
              <p className="text-xs text-white/50 mb-4">
                Your pre-draft mock board is scored against the actual results after each pick is announced.
              </p>
              <div className="space-y-2">
                <ScoreRow type="exact" label="Exact Pick" desc="Correct player at the correct pick number" pts={10} />
                <ScoreRow type="close" label="Close" desc="Correct player, within 5 picks of actual slot" pts={5} />
                <ScoreRow type="far" label="Same Player, Far Off" desc="Correct player, 6+ picks off from actual slot" pts={3} />
              </div>
            </div>

            {/* Live Predictions */}
            <div className="mt-4 rounded-xl border border-green-400/20 bg-green-900/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚡</span>
                <h3 className="text-base font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                  LIVE PREDICTIONS
                </h3>
              </div>
              <p className="text-xs text-white/50 mb-4">
                Predict each NFL pick as it happens during the draft. You have a 15-second window per pick.
              </p>
              <div className="space-y-2">
                <ScoreRow type="exact" label="Correct" desc="You predicted the right player for that pick" pts={10} />
                <ScoreRow type="miss" label="Wrong / Auto-skip" desc="Incorrect prediction or window expired" pts={0} />
              </div>
            </div>

            {/* Trivia */}
            <div className="mt-4 rounded-xl border border-purple-400/20 bg-purple-900/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🧠</span>
                <h3 className="text-base font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                  TRIVIA
                </h3>
              </div>
              <p className="text-xs text-white/50 mb-4">
                NFL draft trivia questions appear between picks. 15 questions, 15 seconds each.
              </p>
              <div className="space-y-2">
                <ScoreRow type="exact" label="Correct" desc="Right answer within the time limit" pts={5} />
                <ScoreRow type="miss" label="Wrong / Timeout" desc="Incorrect or didn't answer in time" pts={0} />
              </div>
            </div>

            {/* Combined */}
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Your Total Score</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-lg border border-blue-400/30 bg-blue-900/30 px-3 py-1.5 text-xs font-bold text-blue-300">Mock Bonus</span>
                <span className="text-white/30 font-bold">+</span>
                <span className="rounded-lg border border-green-400/30 bg-green-900/30 px-3 py-1.5 text-xs font-bold text-green-300">Live Predictions</span>
                <span className="text-white/30 font-bold">+</span>
                <span className="rounded-lg border border-purple-400/30 bg-purple-900/30 px-3 py-1.5 text-xs font-bold text-purple-300">Trivia</span>
                <span className="text-white/30 font-bold">=</span>
                <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">Combined Score</span>
              </div>
            </div>
          </section>

          {/* ── Draft Night Tips ── */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <SectionHeading>Draft Night Tips</SectionHeading>
            <div className="mt-4 space-y-3">
              <TipCard>
                <strong className="text-white">Lock in predictions quickly</strong> — you have until the pick is announced. The window is short.
              </TipCard>
              <TipCard>
                <strong className="text-white">You can change your pick</strong> before it&apos;s announced. Don&apos;t be afraid to switch.
              </TipCard>
              <TipCard>
                <strong className="text-white">Start trivia between picks</strong> to rack up bonus points while waiting for the next selection.
              </TipCard>
              <TipCard>
                <strong className="text-white">Watch the team standings</strong> — your score contributes to your team&apos;s total if your pool uses teams.
              </TipCard>
            </div>
          </section>

          {/* ── Invite Section ── */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <SectionHeading>Watch Party (Video Chat)</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              On draft night, join the Watch Party to video chat with your pool while picks come in.
            </p>
            <div className="mt-3 space-y-2">
              <Step n={1}>Click the <strong className="text-white">Watch Party</strong> button in the bottom-right corner of the live page</Step>
              <Step n={2}>Your browser may ask to allow popups — click <strong className="text-white">Allow</strong></Step>
              <Step n={3}>A video window opens — allow camera and microphone access when prompted</Step>
              <Step n={4}>Enter your name (first time only) and you&apos;re in!</Step>
            </div>
            <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="text-xs text-white/40"><strong className="text-white/60">Tips:</strong> The video runs in a separate window so you can see it alongside the draft. Use the control bar in the main app to minimize, bring the window to front, or leave. Audio stays live even when you&apos;re focused on making picks.</p>
            </div>
          </section>

          <section>
            <SectionHeading>Invite Friends</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Use this template to invite friends to your pool. Replace <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">[YOUR-CODE]</code> with your actual invite code before sending.
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
            Running a pool?{" "}
            <Link href="/guide/commissioner" className="text-[var(--slidey)] hover:underline">
              View the Commissioner Guide →
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

function ScoreRow({ type, label, desc, pts }: { type: string; label: string; desc: string; pts: number }) {
  const colors: Record<string, string> = {
    exact: "text-green-400",
    close: "text-yellow-400",
    far: "text-orange-400",
    miss: "text-white/30",
  };
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-4 py-3">
      <span className={`text-lg font-bold w-12 text-center ${colors[type] || "text-white"}`}>
        +{pts}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-white/50">{desc}</p>
      </div>
    </div>
  );
}

function TipCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/70 leading-relaxed">
      {children}
    </div>
  );
}
