import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminTriviaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/admin");
  return <>{children}</>;
}
