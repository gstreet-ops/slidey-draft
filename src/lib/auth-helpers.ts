import { auth } from "@/lib/auth";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

export async function requireActiveUser() {
  const session = await requireAuth();
  if (!session) return null;
  if (session.user.status !== "active") return null;
  return session;
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }
  return session;
}
