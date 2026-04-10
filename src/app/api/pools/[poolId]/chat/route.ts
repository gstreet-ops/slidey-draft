import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPoolMember, getPoolChatMessages, getUserById } from "@/lib/queries";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;
  const member = await isPoolMember(poolId, session.user.id);
  if (!member)
    return NextResponse.json({ error: "Not a pool member" }, { status: 403 });

  const after = req.nextUrl.searchParams.get("after");
  const messages = await getPoolChatMessages(poolId, after ?? undefined);

  return NextResponse.json({ messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;

  const user = await getUserById(session.user.id);
  if (!user || user.status !== "active")
    return NextResponse.json({ error: "Spectators cannot send messages" }, { status: 403 });

  const member = await isPoolMember(poolId, session.user.id);
  if (!member)
    return NextResponse.json({ error: "Not a pool member" }, { status: 403 });

  const body = await req.json();
  const content = (body.content ?? "").trim();
  if (!content || content.length > 500)
    return NextResponse.json({ error: "Message must be 1-500 characters" }, { status: 400 });

  await db.insert(chatMessages).values({
    poolId,
    userId: session.user.id,
    content,
  });

  return NextResponse.json({ ok: true });
}
