import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGroupByInviteCode, isGroupMember } from "@/lib/queries";
import { joinGroup } from "@/lib/actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ code: string }>;

export default async function JoinPage({ params }: { params: Params }) {
  const { code } = await params;
  const session = await auth();

  // Must be logged in
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/join/${code}`);
  }

  const group = await getGroupByInviteCode(code);
  if (!group) {
    return (
      <div className="min-h-screen bg-[var(--gtown-navy)] flex items-center justify-center">
        <div className="text-center">
          <h1
            className="text-3xl font-bold text-white tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            INVALID INVITE
          </h1>
          <p className="mt-2 text-white/50">This invite link is not valid.</p>
        </div>
      </div>
    );
  }

  // Check if already a member
  const alreadyMember = await isGroupMember(group.id, session.user.id);
  if (!alreadyMember) {
    await joinGroup(group.id);
  }

  // Redirect to their pick board
  redirect("/my-board");
}
