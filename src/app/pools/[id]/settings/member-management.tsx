"use client";

import { promoteToAdmin, demoteToMember, removePoolMember, transferCommissioner } from "@/lib/actions";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  userId: string;
  role: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
};

export function MemberManagement({
  poolId,
  members,
  myRole,
  myUserId,
}: {
  poolId: string;
  members: Member[];
  myRole: string;
  myUserId: string;
}) {
  const router = useRouter();
  const isCommissioner = myRole === "commissioner";

  async function handlePromote(userId: string) {
    await promoteToAdmin(poolId, userId);
    router.refresh();
  }

  async function handleDemote(userId: string) {
    await demoteToMember(poolId, userId);
    router.refresh();
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this member from the pool?")) return;
    await removePoolMember(poolId, userId);
    router.refresh();
  }

  async function handleTransfer(userId: string) {
    if (!confirm("Transfer commissioner ownership? You will become an admin.")) return;
    await transferCommissioner(poolId, userId);
    router.refresh();
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Members</h3>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3">
              {m.userImage && (
                <img src={m.userImage} alt="" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-white text-sm">{m.userName || m.userEmail}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                m.role === "commissioner"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : m.role === "admin"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-white/10 text-white/40"
              }`}>
                {m.role}
              </span>
            </div>

            {m.userId !== myUserId && (
              <div className="flex gap-2">
                {/* Commissioner actions */}
                {isCommissioner && m.role === "member" && (
                  <button
                    onClick={() => handlePromote(m.userId)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    Promote
                  </button>
                )}
                {isCommissioner && m.role === "admin" && (
                  <button
                    onClick={() => handleDemote(m.userId)}
                    className="text-xs text-yellow-400 hover:text-yellow-300 transition"
                  >
                    Demote
                  </button>
                )}
                {isCommissioner && m.role !== "commissioner" && (
                  <button
                    onClick={() => handleTransfer(m.userId)}
                    className="text-xs text-purple-400 hover:text-purple-300 transition"
                  >
                    Transfer
                  </button>
                )}

                {/* Remove (commissioner can remove anyone except self, admin can remove members only) */}
                {((isCommissioner && m.role !== "commissioner") ||
                  (myRole === "admin" && m.role === "member")) && (
                  <button
                    onClick={() => handleRemove(m.userId)}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
