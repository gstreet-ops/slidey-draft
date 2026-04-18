import Link from "next/link";
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

  return (
    <div className="min-h-screen bg-[var(--steelers-black)]">
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
        <p className="mt-2 text-xs text-white/50">
          Commissioner?{" "}
          <Link href="/guide/commissioner" className="text-[var(--slidey)] hover:underline">
            Commissioner Guide →
          </Link>
        </p>

        <div className="mt-8 space-y-6">
          {/* ── How It Works ── */}
          <section className="rounded-xl border border-white/[0.12] bg-white/8 p-6 sm:p-8">
            <SectionHeading>How It Works</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Draft Day Challenge is a live NFL draft night competition. Build your mock board before
              the draft, then go live to predict every pick and answer trivia as it all unfolds.
            </p>
            <div className="mt-4 space-y-3">
              <Step n={1}>Join a pool using an <strong className="text-white">invite code</strong> from your commissioner</Step>
              <Step n={2}>Pick your <strong className="text-white">favorite NFL team</strong> in <Link href="/settings" className="text-[var(--slidey)] hover:underline">Settings</Link> — accent colors across the app switch to match your team</Step>
              <Step n={3}>Build a <strong className="text-white">32-pick mock draft</strong> before draft night</Step>
              <Step n={4}>On draft night, go live — <strong className="text-white">predict every pick</strong>, answer trivia, watch the leaderboard</Step>
            </div>
          </section>

          {/* ── Scoring ── */}
          <section className="rounded-xl border border-white/[0.12] bg-white/8 p-6 sm:p-8">
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
                Trivia questions fire between picks. Points depend on difficulty — your commissioner sets the queue.
              </p>
              <div className="space-y-2">
                <ScoreRow type="exact" label="Easy — Correct" desc="Right answer on an easy question" pts={3} />
                <ScoreRow type="close" label="Medium — Correct" desc="Right answer on a medium question" pts={5} />
                <ScoreRow type="far" label="Hard — Correct" desc="Right answer on a hard question" pts={10} />
                <ScoreRow type="miss" label="Wrong / Timeout" desc="Incorrect or didn't answer in time" pts={0} />
              </div>
            </div>

            {/* Combined */}
            <div className="mt-5 rounded-xl border border-white/[0.12] bg-white/8 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Your Total Score</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-lg border border-blue-400/30 bg-blue-900/30 px-3 py-1.5 text-xs font-bold text-blue-300">Mock Bonus</span>
                <span className="text-white/40 font-bold">+</span>
                <span className="rounded-lg border border-green-400/30 bg-green-900/30 px-3 py-1.5 text-xs font-bold text-green-300">Live Predictions</span>
                <span className="text-white/40 font-bold">+</span>
                <span className="rounded-lg border border-purple-400/30 bg-purple-900/30 px-3 py-1.5 text-xs font-bold text-purple-300">Trivia</span>
                <span className="text-white/40 font-bold">=</span>
                <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">Combined Score</span>
              </div>
            </div>
          </section>

          {/* ── Pool Teams ── */}
          <section className="rounded-xl border border-white/[0.12] bg-white/8 p-6 sm:p-8">
            <SectionHeading>Pool Teams</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Your commissioner can split the pool into teams. You&apos;ll compete as an individual <em>and</em> as part of a team — both standings are tracked separately.
            </p>

            <div className="mt-4 space-y-3">
              <TipCard>
                <strong className="text-white">How team scoring works</strong> — your team&apos;s score is the combined total of every member&apos;s individual score across all three tracks (Mock Bonus + Live Predictions + Trivia). If you score 45 points and your teammate scores 38, your team has 83.
              </TipCard>
              <TipCard>
                <strong className="text-white">Where to see team standings</strong> — the leaderboard has two tabs: &apos;Individual&apos; and &apos;Teams&apos;. The Teams tab shows each team ranked by total score, with a breakdown of each member&apos;s contribution underneath.
              </TipCard>
              <TipCard>
                <strong className="text-white">You don&apos;t create teams</strong> — only the commissioner sets up teams. You just play — your scores automatically roll up to your team.
              </TipCard>
            </div>
          </section>

          {/* ── Personalize Your Profile ── */}
          <section className="rounded-xl border border-white/[0.12] bg-white/8 p-6 sm:p-8">
            <SectionHeading>Personalize Your Profile</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Make the app yours. Open <Link href="/settings" className="text-[var(--slidey)] hover:underline">Settings</Link> from the &quot;More&quot; menu in the top nav (or the Settings link in mobile menu).
            </p>
            <div className="mt-4 space-y-3">
              <TipCard>
                <strong className="text-white">Display Name</strong> — change how you show up on leaderboards, chat, and pick cards. Save once and it updates everywhere.
              </TipCard>
              <TipCard>
                <strong className="text-white">Team Theme</strong> — pick any of the 32 NFL teams. The app&apos;s accent color (buttons, links, highlights) instantly switches to your team&apos;s primary color. Default is the Pittsburgh Steelers (host city of the 2026 draft).
              </TipCard>
              <TipCard>
                <strong className="text-white">Background stays dark</strong> — only accent colors change with your team pick. The dark surfaces and semantic colors (green for correct, red for miss) stay consistent for readability.
              </TipCard>
              <TipCard>
                <strong className="text-white">Reset anytime</strong> — pick a different team or click &quot;Reset to draft default (Steelers)&quot; to go back. Your team logo also shows next to your name in the nav.
              </TipCard>
            </div>
          </section>

          {/* ── Draft Night Tips ── */}
          <section className="rounded-xl border border-white/[0.12] bg-white/8 p-6 sm:p-8">
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

          {/* ── Video Call + Live Feed ── */}
          <section className="rounded-xl border border-white/[0.12] bg-white/8 p-6 sm:p-8">
            <SectionHeading>Video Call &amp; Live Feed</SectionHeading>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Draft night is best with friends on video. Your commissioner can set up a Google Meet, Zoom, or any video call link.
            </p>
            <div className="mt-4 space-y-3">
              <TipCard>
                <strong className="text-white">Video Call</strong> — if your commissioner has set up a video link, you&apos;ll see a green &quot;Join Video Call&quot; button at the top of the Live page. Click it to join in a new tab. Works great with split screen or picture-in-picture.
              </TipCard>
              <TipCard>
                <strong className="text-white">Live Feed</strong> — the in-app Live Feed (floating chat button, bottom-right) tracks game events automatically: pick announcements, trivia questions, and leaderboard changes. You can also send quick messages and reactions. Use video for conversation and the Live Feed to follow the action.
              </TipCard>
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
          <p className="text-xs text-white/40">
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
    <div className="flex gap-3 items-start rounded-lg bg-white/8 border border-white/[0.12] px-4 py-3">
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
    miss: "text-white/40",
  };
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/8 border border-white/[0.12] px-4 py-3">
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
    <div className="rounded-lg bg-white/8 border border-white/[0.12] px-4 py-3 text-sm text-white/70 leading-relaxed">
      {children}
    </div>
  );
}
