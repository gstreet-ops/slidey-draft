import { auth } from "@/lib/auth";
import { isDraftLocked } from "@/lib/config";
import { SiteNav } from "./site-nav";

export async function SiteNavServer() {
  const session = await auth();
  const locked = await isDraftLocked();

  return (
    <SiteNav
      isLoggedIn={!!session?.user}
      isAdmin={session?.user?.role === "admin"}
      isLocked={locked}
      userInitial={session?.user?.name?.[0]?.toUpperCase()}
      teamLogoUrl={session?.user?.favoriteTeam?.logoUrl}
      teamName={session?.user?.favoriteTeam?.name}
    />
  );
}
