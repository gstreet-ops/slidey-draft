# Team Customization — Design Spec

## Overview

Let users pick a favorite NFL team. Their choice applies team logo and accent color across the app (light touch). Full skin theming deferred to Phase 2.

## Data Layer

### Schema Change

Add `favoriteTeamId` (UUID, nullable, FK to `teams`) to the `users` table via Drizzle migration.

### Session Extension

Extend the NextAuth session callback to include the user's favorite team when set:

```ts
session.user.favoriteTeam: {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
} | null
```

Query the `teams` table in the session callback when `favoriteTeamId` is present.

## Team Selection UI

### Onboarding (`/onboarding/team`)

- Triggered after login when `favoriteTeamId` is null (redirect from middleware or dashboard)
- Full-screen page with heading "Pick Your Team"
- 4x8 grid of ESPN team logos (`https://a.espncdn.com/i/teamlogos/nfl/500/{ABBR}.png`)
- Tap a logo to select — brief highlight/confirmation — saves to DB — redirects to dashboard
- "Skip" link at bottom (no team = default Slidey theme)

### Settings Page (`/settings`)

- Displays current team (logo + name) at top
- Same 4x8 logo grid below to change selection
- Save on tap (no separate save button)
- Accessible from nav (link in profile dropdown or nav links)

## API

### `POST /api/user/team`

- Body: `{ teamId: string }`
- Validates `teamId` exists in `teams` table
- Updates `favoriteTeamId` on authenticated user
- Returns updated team data
- Used by both onboarding and settings pages

## Theme Application (Light Touch)

### What changes:

- **Nav avatar**: User's team logo replaces default initials circle
- **Accent color**: `--slidey` CSS variable overridden with `team.primaryColor` for buttons, active states, links, highlights
- **Dashboard header**: Subtle team color gradient or border accent at top
- **Score highlights**: Point totals and rank badges use team accent

### What does NOT change:

- Background stays `--gtown-navy`
- Text colors stay white/gray
- Status badges (green/yellow/red) stay semantic colors
- Other users' content stays neutral

### Mechanism

A `<TeamThemeProvider>` client component:
- Wraps the app inside `<Providers>`
- Reads `session.user.favoriteTeam` from NextAuth
- Sets CSS custom properties on `<html>` element:
  - `--team-primary: {primaryColor}`
  - `--team-secondary: {secondaryColor}`
  - `--slidey: {primaryColor}` (override)
- No team selected = default Slidey blue (`#4A7AB5`)

## Scope Boundaries

**In scope (this spec):**
- Database migration
- Session extension
- Onboarding team picker
- Settings page
- API endpoint
- Light-touch theme provider (accent color + logo)

**Out of scope (Phase 2 full skin):**
- Background color/gradient changes
- Nav bar in team colors
- Team-colored cards
- Team patterns or textures
- Per-component deep theming
