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
          className="text-3xl font-bold text-[var(--text-primary)] tracking-wide sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          PLAYER GUIDE
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Everything you need to compete on draft night.
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Commissioner?{" "}
          <Link href="/guide/commissioner" className="text-[var(--slidey)] hover:underline">
            Commissioner Guide →
          </Link>
        </p>

        <div className="mt-8 space-y-6">
          {/* ── How It Works ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>How It Works</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Draft Day Challenge is a live NFL draft night competition. Build your mock board before
              the draft, then go live to predict every pick and answer trivia as it all unfolds.
            </p>
            <div className="mt-4 space-y-3">
              <Step n={1}>Join a pool using an <strong className="text-[var(--text-primary)]">invite code</strong> from your commissioner</Step>
              <Step n={2}>Pick your <strong className="text-[var(--text-primary)]">favorite NFL team</strong> in <Link href="/settings" className="text-[var(--slidey)] hover:underline">Settings</Link> — accent colors across the app switch to match your team</Step>
              <Step n={3}>Build a <strong className="text-[var(--text-primary)]">32-pick mock draft</strong> before draft night</Step>
              <Step n={4}>On draft night, go live — <strong className="text-[var(--text-primary)]">predict every pick</strong>, answer trivia, watch the leaderboard</Step>
            </div>
          </section>

          {/* ── Scoring ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Scoring</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Your total score combines three tracks. The leaderboard updates in real-time as the draft progresses.
            </p>

            {/* Mock Bonus */}
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📋</span>
                <h3 className="text-base font-bold text-[var(--text-primary)] tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                  MOCK BONUS
                </h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Your pre-draft mock board is scored against the actual results after each pick is announced.
              </p>
              <div className="space-y-2">
                <ScoreRow type="exact" label="Exact Pick" desc="Correct player at the correct pick number" pts={10} />
                <ScoreRow type="close" label="Close" desc="Correct player, within 5 picks of actual slot" pts={5} />
                <ScoreRow type="far" label="Same Player, Far Off" desc="Correct player, 6+ picks off from actual slot" pts={3} />
              </div>
            </div>

            {/* Live Predictions */}
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚡</span>
                <h3 className="text-base font-bold text-[var(--text-primary)] tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                  LIVE PREDICTIONS
                </h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Predict each NFL pick as it happens during the draft. You have a 15-second window per pick.
              </p>
              <div className="space-y-2">
                <ScoreRow type="exact" label="Correct" desc="You predicted the right player for that pick" pts={10} />
                <ScoreRow type="miss" label="Wrong / Auto-skip" desc="Incorrect prediction or window expired" pts={0} />
              </div>
            </div>

            {/* Trivia */}
            <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🧠</span>
                <h3 className="text-base font-bold text-[var(--text-primary)] tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                  TRIVIA
                </h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-4">
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
            <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Your Total Score</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">Mock Bonus</span>
                <span className="text-[var(--text-muted)] font-bold">+</span>
                <span className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">Live Predictions</span>
                <span className="text-[var(--text-muted)] font-bold">+</span>
                <span className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">Trivia</span>
                <span className="text-[var(--text-muted)] font-bold">=</span>
                <span className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)]">Combined Score</span>
              </div>
            </div>
          </section>

          {/* ── Pool Teams ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Pool Teams</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              If your commissioner has turned on <strong className="text-[var(--text-primary)]">Team Draft</strong>, the pool is split into teams. You&apos;ll compete as an individual <em>and</em> as part of a team — both standings are tracked separately. If you don&apos;t see a Teams tab on the leaderboard, this is off in your pool and only individual rankings count.
            </p>

            <div className="mt-4 space-y-3">
              <TipCard>
                <strong className="text-[var(--text-primary)]">How team scoring works</strong> — your team&apos;s score is the combined total of every member&apos;s individual score across all three tracks (Mock Bonus + Live Predictions + Trivia). If you score 45 points and your teammate scores 38, your team has 83.
              </TipCard>
              <TipCard>
                <strong className="text-[var(--text-primary)]">Where to see team standings</strong> — the leaderboard has two tabs: &apos;Individual&apos; and &apos;Teams&apos;. The Teams tab shows each team ranked by total score, with a breakdown of each member&apos;s contribution underneath.
              </TipCard>
              <TipCard>
                <strong className="text-[var(--text-primary)]">You don&apos;t create teams</strong> — only the commissioner sets up teams. You just play — your scores automatically roll up to your team.
              </TipCard>
            </div>
          </section>

          {/* ── Personalize Your Profile ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Personalize Your Profile</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Make the app yours. Open <Link href="/settings" className="text-[var(--slidey)] hover:underline">Settings</Link> from the &quot;More&quot; menu in the top nav (or the Settings link in mobile menu).
            </p>
            <div className="mt-4 space-y-3">
              <TipCard>
                <strong className="text-[var(--text-primary)]">Display Name</strong> — change how you show up on leaderboards, chat, and pick cards. Save once and it updates everywhere.
              </TipCard>
              <TipCard>
                <strong className="text-[var(--text-primary)]">Team Theme</strong> — pick any of the 32 NFL teams. The home page hero, team info bar (with this year&apos;s draft needs), accent buttons, links, and highlights all switch to your team&apos;s colors. Default is the Pittsburgh Steelers (host city of the 2026 draft).
              </TipCard>
              <TipCard>
                <strong className="text-[var(--text-primary)]">Your team is highlighted on the board</strong> — every slot belonging to your favorite team gets a colored left border, a tinted background, and a &quot;YOUR TEAM&quot; badge so you can find your picks at a glance.
              </TipCard>
              <TipCard>
                <strong className="text-[var(--text-primary)]">Surfaces stay neutral</strong> — only accent and team-specific elements recolor. Cards, page backgrounds, and semantic colors (green for correct, red for miss) stay consistent for readability.
              </TipCard>
              <TipCard>
                <strong className="text-[var(--text-primary)]">Reset anytime</strong> — pick a different team or click &quot;Reset to draft default (Steelers)&quot; to go back. Your team logo also shows next to your name in the nav.
              </TipCard>
            </div>
          </section>

          {/* ── Draft Night Tips ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Draft Night Tips</SectionHeading>
            <div className="mt-4 space-y-3">
              <TipCard>
                <strong className="text-[var(--text-primary)]">Lock in predictions quickly</strong> — you have until the pick is announced. The window is short.
              </TipCard>
              <TipCard>
                <strong className="text-[var(--text-primary)]">You can change your pick</strong> before it&apos;s announced. Don&apos;t be afraid to switch.
              </TipCard>
              <TipCard>
                <strong className="text-[var(--text-primary)]">Start trivia between picks</strong> to rack up bonus points while waiting for the next selection.
              </TipCard>
              <TipCard>
                <strong className="text-[var(--text-primary)]">Watch the team standings</strong> — your score contributes to your team&apos;s total if your pool uses teams.
              </TipCard>
            </div>
          </section>

          {/* ── Video Call + Live Feed ── */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
            <SectionHeading>Video Call &amp; Live Feed</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Draft night is best with friends on video. Your commissioner can set up a Google Meet, Zoom, or any video call link.
            </p>
            <div className="mt-4 space-y-3">
              <TipCard>
                <strong className="text-[var(--text-primary)]">Video Call</strong> — if your commissioner has set up a video link, you&apos;ll see a green &quot;Join Video Call&quot; button at the top of the Live page. Click it to join in a new tab. Works great with split screen or picture-in-picture.
              </TipCard>
              <TipCard>
                <strong className="text-[var(--text-primary)]">Live Feed</strong> — the in-app Live Feed (floating chat button, bottom-right) tracks game events automatically: pick announcements, trivia questions, and leaderboard changes. You can also send quick messages and reactions. Use video for conversation and the Live Feed to follow the action.
              </TipCard>
            </div>
          </section>

          <section>
            <SectionHeading>Invite Friends</SectionHeading>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Use this template to invite friends to your pool. Replace <code className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 text-xs text-[var(--text-primary)]">[YOUR-CODE]</code> with your actual invite code before sending.
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

function ScoreRow({ type, label, desc, pts }: { type: string; label: string; desc: string; pts: number }) {
  const colors: Record<string, string> = {
    exact: "text-green-700",
    close: "text-yellow-700",
    far: "text-orange-700",
    miss: "text-[var(--text-muted)]",
  };
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3">
      <span className={`text-lg font-bold w-12 text-center ${colors[type] || "text-[var(--text-primary)]"}`}>
        +{pts}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{desc}</p>
      </div>
    </div>
  );
}

function TipCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-secondary)] leading-relaxed">
      {children}
    </div>
  );
}
