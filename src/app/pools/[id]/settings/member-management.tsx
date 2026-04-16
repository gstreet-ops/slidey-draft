"use client";

import Image from "next/image";
import { promoteToAdmin, demoteToMember, removePoolMember, transferCommissioner, promoteToCommissioner, demoteFromCommissioner } from "@/lib/actions";
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
  poolOwnerId,
}: {
  poolId: string;
  members: Member[];
  myRole: string;
  myUserId: string;
  poolOwnerId: string;
}) {
  const router = useRouter();
  const canManage = myRole === "commissioner" || myRole === "admin";

  async function handlePromoteAdmin(userId: string) {
    await promoteToAdmin(poolId, userId);
    router.refresh();
  }

  async function handlePromoteCommissioner(userId: string) {
    await promoteToCommissioner(poolId, userId);
    router.refresh();
  }

  async function handleDemoteMember(userId: string) {
    await demoteToMember(poolId, userId);
    router.refresh();
  }

  async function handleDemoteCommissioner(userId: string) {
    if (!confirm("Demote this commissioner to admin?")) return;
    await demoteFromCommissioner(poolId, userId);
    router.refresh();
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this member from the pool?")) return;
    await removePoolMember(poolId, userId);
    router.refresh();
  }

  async function handleTransfer(userId: string) {
    if (!confirm("Transfer pool ownership? You will become an admin.")) return;
    await transferCommissioner(poolId, userId);
    router.refresh();
  }

  return (
    <div className="bg-white/8 border border-white/[0.12] rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Members</h3>
      <div className="space-y-2">
        {members.map((m) => {
          const isOwner = m.userId === poolOwnerId;
          const isSelf = m.userId === myUserId;

          return (
            <div key={m.userId} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                {m.userImage && (
                  <Image src={m.userImage} alt="" width={28} height={28} className="rounded-full" />
                )}
                <span className="text-white text-sm">{m.userName || m.userEmail}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  m.role === "commissioner"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : m.role === "admin"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-white/10 text-white/50"
                }`}>
                  {m.role}
                </span>
                {isOwner && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                    Owner
                  </span>
                )}
              </div>

              {!isSelf && canManage && (
                <div className="flex gap-2">
                  {/* Member actions */}
                  {m.role === "member" && (
                    <>
                      <button onClick={() => handlePromoteAdmin(m.userId)} className="text-xs text-blue-400 hover:text-blue-300 transition">
                        → Admin
                      </button>
                      <button onClick={() => handlePromoteCommissioner(m.userId)} className="text-xs text-yellow-400 hover:text-yellow-300 transition">
                        → Commissioner
                      </button>
                    </>
                  )}

                  {/* Admin actions */}
                  {m.role === "admin" && (
                    <>
                      <button onClick={() => handlePromoteCommissioner(m.userId)} className="text-xs text-yellow-400 hover:text-yellow-300 transition">
                        → Commissioner
                      </button>
                      <button onClick={() => handleDemoteMember(m.userId)} className="text-xs text-white/50 hover:text-white/60 transition">
                        → Member
                      </button>
                    </>
                  )}

                  {/* Commissioner actions (can demote non-owners) */}
                  {m.role === "commissioner" && !isOwner && (
                    <button onClick={() => handleDemoteCommissioner(m.userId)} className="text-xs text-orange-400 hover:text-orange-300 transition">
                      → Admin
                    </button>
                  )}

                  {/* Transfer ownership (only current owner can do this) */}
                  {myRole === "commissioner" && myUserId === poolOwnerId && m.role !== "commissioner" && (
                    <button onClick={() => handleTransfer(m.userId)} className="text-xs text-purple-400 hover:text-purple-300 transition">
                      Transfer
                    </button>
                  )}

                  {/* Remove (commissioners can remove non-commissioners, admins can remove members) */}
                  {((myRole === "commissioner" && m.role !== "commissioner") ||
                    (myRole === "admin" && m.role === "member")) && (
                    <button onClick={() => handleRemove(m.userId)} className="text-xs text-red-400 hover:text-red-300 transition">
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
