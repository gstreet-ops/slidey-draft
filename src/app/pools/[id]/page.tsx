import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getPoolById,
  getPoolMembers,
  getPoolAnnouncements,
  getPoolStandings,
  isPoolMember,
  getUserBoard,
} from "@/lib/queries";
import { getPoolRole } from "@/lib/pool-helpers";
import { getPoolSettings } from "@/lib/pool-helpers";
import { AnnouncementForm } from "./announcement-form";

export const dynamic = "force-dynamic";

export default async function PoolDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: poolId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const pool = await getPoolById(poolId);
  if (!pool) notFound();

  const member = await isPoolMember(poolId, session.user.id);
  if (!member) redirect("/pools");

  const [members, announcements, standings, myRole, myBoard] = await Promise.all([
    getPoolMembers(poolId),
    getPoolAnnouncements(poolId),
    getPoolStandings(poolId),
    getPoolRole(session.user.id, poolId),
    getUserBoard(session.user.id, 2026),
  ]);

  const settings = getPoolSettings(pool.settings);
  const canManage = myRole === "commissioner" || myRole === "admin";

  // Draft countdown
  const draftDate = new Date("2026-04-23T20:00:00-04:00");
  const now = new Date();
  const daysUntilDraft = Math.max(0, Math.ceil((draftDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const isDraftOver = now > draftDate;

  // My standings
  const myStanding = standings.find((s) => s.userId === session.user.id);
  const top5 = standings.slice(0, 5);

  const commissioner = members.find((m) => m.role === "commissioner");

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            SLIDEY<span className="text-[var(--lions-blue)]">.COM</span> DRAFT
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/pools" className="text-white/60 hover:text-white transition">Pools</Link>
            {canManage && (
              <Link href={`/pools/${poolId}/settings`} className="text-white/60 hover:text-white transition">Settings</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Pool Header */}
        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{pool.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              pool.status === "open" ? "bg-green-500/20 text-green-400"
              : pool.status === "locked" ? "bg-yellow-500/20 text-yellow-400"
              : "bg-white/10 text-white/50"
            }`}>
              {pool.status}
            </span>
          </div>
          {pool.description && <p className="text-white/50">{pool.description as string}</p>}
          <div className="flex items-center gap-4 text-sm text-white/40">
            <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
            {commissioner && (
              <span>Commissioner: {commissioner.userName || commissioner.userEmail}</span>
            )}
          </div>

          {/* Invite link */}
          {pool.status === "open" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-white/40">Invite code:</span>
              <code className="text-sm font-mono text-[var(--gtown-highlight)] bg-white/5 px-2 py-0.5 rounded">
                {pool.inviteCode}
              </code>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Settings summary */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Pool Settings</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-white/40">Rounds: </span>
                  <span className="text-white">{settings.rounds.join(", ")}</span>
                </div>
                <div>
                  <span className="text-white/40">Mock Bonus: </span>
                  <span className="text-white">{settings.mockDraftBonus ? "On" : "Off"}</span>
                </div>
                <div>
                  <span className="text-white/40">Live Predictions: </span>
                  <span className="text-white">{settings.livePredictions ? "On" : "Off"}</span>
                </div>
              </div>
            </div>

            {/* Pre-draft: member roster */}
            {!isDraftOver && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Members</h3>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        {m.userImage && (
                          <img src={m.userImage} alt="" className="w-6 h-6 rounded-full" />
                        )}
                        <span className="text-white text-sm">{m.userName || m.userEmail}</span>
                        {m.role !== "member" && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            m.role === "commissioner" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"
                          }`}>
                            {m.role}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Announcements */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Announcements</h3>

              {canManage && <AnnouncementForm poolId={poolId} />}

              {announcements.length === 0 ? (
                <p className="text-white/30 text-sm">No announcements yet.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div
                      key={a.id}
                      className={`p-4 rounded-lg ${
                        a.pinned ? "bg-yellow-500/5 border border-yellow-500/20" : "bg-white/5"
                      }`}
                    >
                      {a.pinned && <span className="text-xs text-yellow-400 mb-1 block">Pinned</span>}
                      <p className="text-white text-sm">{a.content}</p>
                      <p className="text-white/30 text-xs mt-2">
                        {a.authorName || a.authorEmail} &middot;{" "}
                        {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            {/* Countdown */}
            {!isDraftOver && daysUntilDraft > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <p className="text-4xl font-bold text-white">{daysUntilDraft}</p>
                <p className="text-white/40 text-sm">days until the draft</p>
              </div>
            )}

            {/* Your stats */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Your Stats</h3>
              {myStanding ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">Rank</span>
                    <span className="text-white font-semibold">#{myStanding.rank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Mock Bonus</span>
                    <span className="text-white">{myStanding.mockBonus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Live Score</span>
                    <span className="text-white">{myStanding.liveTotal}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2">
                    <span className="text-white/60 font-semibold">Combined</span>
                    <span className="text-white font-bold">{myStanding.combinedScore}</span>
                  </div>
                </div>
              ) : (
                <p className="text-white/30 text-sm">No scores yet.</p>
              )}
            </div>

            {/* Mini leaderboard */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Leaderboard</h3>
              {top5.length === 0 ? (
                <p className="text-white/30 text-sm">No scores yet.</p>
              ) : (
                <div className="space-y-2">
                  {top5.map((s) => (
                    <div key={s.userId} className={`flex items-center justify-between text-sm py-1 ${
                      s.userId === session.user.id ? "text-[var(--gtown-highlight)]" : "text-white"
                    }`}>
                      <span>#{s.rank} {s.userName || s.userEmail}</span>
                      <span className="font-semibold">{s.combinedScore}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href={`/pools/${poolId}/leaderboard`}
                className="block text-center text-xs text-[var(--gtown-highlight)] hover:underline mt-2"
              >
                Full Leaderboard
              </Link>
            </div>

            {/* Quick actions */}
            <div className="space-y-3">
              {settings.mockDraftBonus && !myBoard && (
                <Link
                  href="/my-board"
                  className="block w-full text-center rounded-lg bg-[var(--gtown-highlight)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition"
                >
                  Create Your Mock Draft
                </Link>
              )}
              <Link
                href="/live"
                className="block w-full text-center rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/70 hover:border-white/40 transition"
              >
                Go to War Room
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
