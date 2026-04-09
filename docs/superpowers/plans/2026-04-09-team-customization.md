# Team Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick a favorite NFL team, then apply that team's logo and accent color across the app UI.

**Architecture:** Add `favoriteTeamId` to users table, extend NextAuth session with team data, create a `<TeamThemeProvider>` client component that overrides CSS variables, build onboarding + settings pages for team selection.

**Tech Stack:** Next.js, Drizzle ORM (Neon Postgres), NextAuth, Tailwind CSS custom properties

---

### Task 1: Add favoriteTeamId to users schema

**Files:**
- Modify: `src/db/schema.ts:42-52`

- [ ] **Step 1: Add favoriteTeamId column to users table**

In `src/db/schema.ts`, add a `favoriteTeamId` column to the `users` table:

```ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  role: userRoleEnum("role").default("user"),
  status: userStatusEnum("status").notNull().default("active"),
  favoriteTeamId: uuid("favorite_team_id").references(() => teams.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Generate and run the migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Expected: Migration adds `favorite_team_id` column (nullable UUID with FK) to `users` table.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: add favoriteTeamId column to users table"
```

---

### Task 2: Extend NextAuth session with favorite team data

**Files:**
- Modify: `src/types/next-auth.d.ts`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add favoriteTeam to session types**

Replace `src/types/next-auth.d.ts`:

```ts
import { DefaultSession } from "next-auth";

export type FavoriteTeam = {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user";
      status: "spectator" | "active" | "suspended";
      favoriteTeam: FavoriteTeam | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "user";
    status?: "spectator" | "active" | "suspended";
  }
}
```

- [ ] **Step 2: Update session callback to fetch team data**

In `src/lib/auth.ts`, update the session callback to join the team:

```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  teams,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await db.query.users.findFirst({
          where: (u, { eq }) => eq(u.id, user.id),
        });
        session.user.role = dbUser?.role || "user";
        session.user.status = dbUser?.status || "active";

        // Fetch favorite team
        if (dbUser?.favoriteTeamId) {
          const team = await db.query.teams.findFirst({
            where: (t, { eq }) => eq(t.id, dbUser.favoriteTeamId!),
          });
          session.user.favoriteTeam = team
            ? {
                id: team.id,
                name: team.name,
                abbreviation: team.abbreviation,
                primaryColor: team.primaryColor || "#4A7AB5",
                secondaryColor: team.secondaryColor || "#000000",
                logoUrl: team.logoUrl,
              }
            : null;
        } else {
          session.user.favoriteTeam = null;
        }
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: Verify the app still builds**

```bash
npx next build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/next-auth.d.ts src/lib/auth.ts
git commit -m "feat: extend NextAuth session with favorite team data"
```

---

### Task 3: Create the API endpoint for setting favorite team

**Files:**
- Create: `src/app/api/user/team/route.ts`

- [ ] **Step 1: Create the API route**

Create `src/app/api/user/team/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, teams } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await req.json();

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  // Validate team exists
  const team = await db.query.teams.findFirst({
    where: (t, { eq }) => eq(t.id, teamId),
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  await db
    .update(users)
    .set({ favoriteTeamId: teamId })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({
    favoriteTeam: {
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      logoUrl: team.logoUrl,
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/user/team/route.ts
git commit -m "feat: add POST /api/user/team endpoint"
```

---

### Task 4: Create TeamThemeProvider component

**Files:**
- Create: `src/components/team-theme-provider.tsx`
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Create the theme provider**

Create `src/components/team-theme-provider.tsx`:

```tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function TeamThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const team = session?.user?.favoriteTeam;

  useEffect(() => {
    const root = document.documentElement;
    if (team) {
      root.style.setProperty("--team-primary", team.primaryColor);
      root.style.setProperty("--team-secondary", team.secondaryColor);
      root.style.setProperty("--slidey", team.primaryColor);
    } else {
      root.style.removeProperty("--team-primary");
      root.style.removeProperty("--team-secondary");
      root.style.setProperty("--slidey", "#4A7AB5");
    }
  }, [team]);

  return <>{children}</>;
}
```

- [ ] **Step 2: Wrap app in TeamThemeProvider**

Update `src/app/providers.tsx`:

```tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { TeamThemeProvider } from "@/components/team-theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TeamThemeProvider>{children}</TeamThemeProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/team-theme-provider.tsx src/app/providers.tsx
git commit -m "feat: add TeamThemeProvider for dynamic accent colors"
```

---

### Task 5: Create team picker grid component

**Files:**
- Create: `src/components/team-picker.tsx`

- [ ] **Step 1: Create the reusable team picker**

Create `src/components/team-picker.tsx`:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Team = {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  logoUrl: string | null;
};

export function TeamPicker({
  teams,
  selectedTeamId,
  redirectTo,
}: {
  teams: Team[];
  selectedTeamId?: string | null;
  redirectTo?: string;
}) {
  const [selected, setSelected] = useState<string | null>(selectedTeamId ?? null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { update } = useSession();

  async function handleSelect(teamId: string) {
    if (saving) return;
    setSelected(teamId);
    setSaving(true);

    await fetch("/api/user/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });

    await update(); // refresh session with new team data

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-8 sm:gap-4">
      {teams.map((team) => {
        const isSelected = selected === team.id;
        return (
          <button
            key={team.id}
            onClick={() => handleSelect(team.id)}
            disabled={saving}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition ${
              isSelected
                ? "ring-2 ring-white bg-white/15 scale-105"
                : "bg-white/5 hover:bg-white/10"
            } ${saving ? "opacity-50 cursor-wait" : ""}`}
          >
            {team.logoUrl ? (
              <Image
                src={team.logoUrl}
                alt={team.name}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: team.primaryColor }}
              >
                {team.abbreviation}
              </div>
            )}
            <span className="text-[10px] text-white/60 text-center leading-tight">
              {team.abbreviation}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/team-picker.tsx
git commit -m "feat: add reusable TeamPicker grid component"
```

---

### Task 6: Create onboarding team selection page

**Files:**
- Create: `src/app/onboarding/team/page.tsx`

- [ ] **Step 1: Create the onboarding page**

Create `src/app/onboarding/team/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { TeamPicker } from "@/components/team-picker";

export const dynamic = "force-dynamic";

export default async function OnboardingTeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Already has a team? Skip to dashboard
  if (session.user.favoriteTeam) redirect("/dashboard");

  const allTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      abbreviation: teams.abbreviation,
      primaryColor: teams.primaryColor,
      logoUrl: teams.logoUrl,
    })
    .from(teams)
    .orderBy(asc(teams.name));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--gtown-navy)] px-4 py-12">
      <div className="w-full max-w-2xl text-center">
        <h1
          className="text-4xl font-bold text-white tracking-wider sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          PICK YOUR TEAM
        </h1>
        <p className="mt-3 text-white/50 text-sm">
          Choose your favorite NFL team to personalize your experience.
        </p>

        <div className="mt-8">
          <TeamPicker
            teams={allTeams.map((t) => ({
              ...t,
              primaryColor: t.primaryColor || "#4A7AB5",
            }))}
            redirectTo="/dashboard"
          />
        </div>

        <Link
          href="/dashboard"
          className="mt-8 inline-block text-sm text-white/30 hover:text-white/50 transition"
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/onboarding/team/page.tsx
git commit -m "feat: add onboarding team selection page"
```

---

### Task 7: Add onboarding redirect to dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx:13-16`

- [ ] **Step 1: Add redirect for users without a favorite team**

In `src/app/dashboard/page.tsx`, after the auth check and before the draft lock check, add:

```ts
  // Onboarding: pick a team first
  if (!session.user.favoriteTeam) redirect("/onboarding/team");
```

So lines 13-19 become:

```ts
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Onboarding: pick a team first
  if (!session.user.favoriteTeam) redirect("/onboarding/team");

  const locked = await isDraftLocked();
  if (locked) redirect("/live");
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: redirect users without favorite team to onboarding"
```

---

### Task 8: Create settings page with team picker

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Create the settings page**

Create `src/app/settings/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { MobileNav } from "@/components/mobile-nav";
import { TeamPicker } from "@/components/team-picker";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const allTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      abbreviation: teams.abbreviation,
      primaryColor: teams.primaryColor,
      logoUrl: teams.logoUrl,
    })
    .from(teams)
    .orderBy(asc(teams.name));

  const currentTeam = session.user.favoriteTeam;

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <MobileNav
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/picks", label: "All Picks" },
          { href: "/leaderboard", label: "Leaderboard" },
        ]}
        logo={
          <Link
            href="/"
            className="text-lg font-bold text-white tracking-wider sm:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SLIDEY<span className="text-[var(--slidey)]">.COM</span> DRAFT
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1
          className="text-3xl font-bold text-white tracking-wider"
          style={{ fontFamily: "var(--font-display)" }}
        >
          SETTINGS
        </h1>

        {/* Current team */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
            Your Team
          </h2>
          {currentTeam ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              {currentTeam.logoUrl ? (
                <Image
                  src={currentTeam.logoUrl}
                  alt={currentTeam.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: currentTeam.primaryColor }}
                >
                  {currentTeam.abbreviation}
                </div>
              )}
              <span className="text-white font-semibold">{currentTeam.name}</span>
            </div>
          ) : (
            <p className="mt-3 text-white/40 text-sm">No team selected</p>
          )}
        </section>

        {/* Team picker */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
            {currentTeam ? "Change Team" : "Pick a Team"}
          </h2>
          <TeamPicker
            teams={allTeams.map((t) => ({
              ...t,
              primaryColor: t.primaryColor || "#4A7AB5",
            }))}
            selectedTeamId={currentTeam?.id}
          />
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add settings page with team picker"
```

---

### Task 9: Add Settings link to navigation

**Files:**
- Modify: `src/app/dashboard/page.tsx:69-75`

- [ ] **Step 1: Add Settings to nav links**

In `src/app/dashboard/page.tsx`, add Settings to the `MobileNav` links array:

```ts
        links={[
          { href: "/picks", label: "All Picks" },
          { href: "/leaderboard", label: "Leaderboard" },
          { href: "/my-board", label: "My Board" },
          { href: "/settings", label: "Settings" },
          ...(session.user.role === "admin" ? [{ href: "/admin", label: "Studio" }] : []),
        ]}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add Settings link to dashboard nav"
```

---

### Task 10: Update accent color references in dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Replace hardcoded Lions blue with --slidey variable**

In `src/app/dashboard/page.tsx`, the `--slidey` variable is now dynamically set by `TeamThemeProvider`. Update the hardcoded `--lions-blue` references to use `--slidey`:

Line 79 — logo accent:
```tsx
SLIDEY<span className="text-[var(--slidey)]">.COM</span> DRAFT
```
(This already uses `--lions-blue`, change it to `--slidey`.)

Line 99 — days until draft:
```tsx
<p className="text-2xl font-bold text-[var(--slidey)]">{daysUntilDraft}</p>
```

Line 140 — view full board link:
```tsx
<Link href={`/picks/${board.id}`} className="mt-3 block text-center text-xs text-[var(--slidey)] hover:underline">View Full Board</Link>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: use dynamic --slidey accent color in dashboard"
```

---

### Task 11: Add team logo to nav trailing slot

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add team logo/avatar to MobileNav trailing prop**

In `src/app/dashboard/page.tsx`, add a `trailing` prop to the `MobileNav` showing the user's team logo:

```tsx
        trailing={
          session.user.favoriteTeam?.logoUrl ? (
            <Link href="/settings">
              <Image
                src={session.user.favoriteTeam.logoUrl}
                alt={session.user.favoriteTeam.name}
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </Link>
          ) : (
            <Link
              href="/settings"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--slidey)] text-xs font-bold text-white"
            >
              {session.user.name?.[0]?.toUpperCase() || "?"}
            </Link>
          )
        }
```

Add `import Image from "next/image";` at the top of the file if not already present.

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: show team logo in nav bar"
```

---

### Task 12: Verify end-to-end flow

- [ ] **Step 1: Run the dev server and test**

```bash
npm run dev
```

Test the full flow:
1. Log in — should redirect to `/onboarding/team` (if no team set)
2. Pick a team from the grid — should redirect to dashboard with accent color applied
3. Check nav shows team logo
4. Visit `/settings` — current team shown, can change it
5. Change team — accent color updates across the app

- [ ] **Step 2: Final commit if any tweaks needed**

```bash
git add -A
git commit -m "feat: team customization — complete light-touch implementation"
```
