import Link from "next/link";
import { getBoards, getAllGroups } from "@/lib/queries";
import { createBoard, createGroup } from "@/lib/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const boards = await getBoards(2026);
  const groups = await getAllGroups();

  async function handleCreateBoard(formData: FormData) {
    "use server";
    const board = await createBoard(formData);
    redirect(`/admin/board/${board.id}`);
  }

  async function handleCreateGroup(formData: FormData) {
    "use server";
    await createGroup(formData);
    redirect("/admin");
  }

  return (
    <div className="space-y-10">
      {/* Mock Draft Boards section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1
            className="text-3xl font-bold text-white tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            MOCK DRAFT BOARDS
          </h1>
        </div>

        <form action={handleCreateBoard} className="flex gap-3">
          <input type="hidden" name="season" value="2026" />
          <input
            name="title"
            type="text"
            required
            placeholder="e.g. Mock Draft 1.0"
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-[var(--lions-blue)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--lions-blue)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--lions-blue)]/80 transition"
          >
            + New Board
          </button>
        </form>

        {boards.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-white/50 text-lg">No boards yet. Create your first mock draft above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/admin/board/${board.id}`}
                className="group rounded-xl border border-white/10 bg-white/5 p-6 hover:border-[var(--lions-blue)]/50 hover:bg-white/10 transition"
              >
                <h3 className="text-lg font-bold text-white group-hover:text-[var(--lions-blue)] transition">
                  {board.title}
                </h3>
                <div className="mt-2 flex items-center gap-3 text-sm text-white/50">
                  <span>{board.season}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    board.status === "published"
                      ? "bg-green-500/20 text-green-400"
                      : board.status === "draft"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-white/10 text-white/60"
                  }`}>
                    {board.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/30">
                  Created {board.createdAt.toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Groups section */}
      <div className="space-y-6">
        <h2
          className="text-3xl font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          GROUPS
        </h2>

        <form action={handleCreateGroup} className="flex gap-3">
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. Georgetown Draft Club"
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-[var(--gtown-highlight)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--gtown-highlight)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition"
          >
            + New Group
          </button>
        </form>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-white/50">No groups yet. Create one to share invite links.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border border-white/10 bg-white/5 p-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">{group.name}</h3>
                  <Link
                    href={`/group/${group.id}`}
                    className="text-xs text-[var(--gtown-highlight)] hover:underline"
                  >
                    View
                  </Link>
                </div>
                <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-xs text-white/40 mb-1">Invite link:</p>
                  <code className="text-sm text-[var(--gtown-highlight)] break-all">
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : process.env.AUTH_URL || "http://localhost:3000"}
                    /join/{group.inviteCode}
                  </code>
                </div>
                <p className="mt-2 text-xs text-white/30">
                  Code: {group.inviteCode} &middot;{" "}
                  Created {group.createdAt.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
