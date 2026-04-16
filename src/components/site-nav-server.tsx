import { auth } from "@/lib/auth";
import { isDraftLocked } from "@/lib/config";
import { getPoolsForUser } from "@/lib/queries";
import { getPoolSettings } from "@/lib/pool-settings";
import { getEnabledFeatures } from "@/lib/feature-flags";
import { SiteNav } from "./site-nav";

export async function SiteNavServer() {
  const session = await auth();
  const locked = await isDraftLocked();

  let enabledFeatures: string[] | undefined;
  if (session?.user?.id) {
    const userPools = await getPoolsForUser(session.user.id);
    if (userPools.length > 0) {
      const settings = getPoolSettings(userPools[0].settings);
      enabledFeatures = Array.from(getEnabledFeatures(settings));
    }
  }

  return (
    <SiteNav
      isLoggedIn={!!session?.user}
      isAdmin={session?.user?.role === "admin"}
      isLocked={locked}
      userInitial={session?.user?.name?.[0]?.toUpperCase()}
      teamLogoUrl={session?.user?.favoriteTeam?.logoUrl}
      teamName={session?.user?.favoriteTeam?.name}
      enabledFeatures={enabledFeatures}
    />
  );
}
