# Slidey Draft — Design System

The 2026 NFL Draft is in Pittsburgh, but every fan in the app sees the experience in
**their own team's colors**. The app runs in **light mode** with a fixed neutral surface
hierarchy and a single team-driven accent that swaps at runtime via CSS custom properties.

---

## Color Tokens

### Surfaces (fixed — never change with team theme)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-page` | `#F5F6FA` | Page background |
| `--bg-card` | `#FFFFFF` | Content cards, inputs, dropdowns |
| `--bg-section` | `#EDF0F7` | Section containers (one step from page) |
| `--bg-nav` | `#101820` | Top nav bar — the only fixed-dark surface |

### Text (fixed)

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#1a1a2e` | Headings, primary copy |
| `--text-secondary` | `#4a4a68` | Body, descriptions |
| `--text-muted` | `#8888a0` | Hints, labels, captions, timestamps |

### Borders

| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `#D8DCE6` | Cards, inputs, dividers |
| `--border-light` | `#E8ECF4` | Subtle separators |

### Accent (team-switchable — set by `TeamThemeProvider`)

| Token | Default (PIT) | Usage |
|-------|---------------|-------|
| `--accent-primary` | `#FFB612` | Primary buttons, links, active states, badges |
| `--accent-secondary` | `#CC9200` | Hover states, gradients, tags |
| `--accent-text` | `black` | Text **on** accent backgrounds (per-team contrast pick) |
| `--accent-light` | `rgba(255,182,18,0.12)` | Tinted backgrounds, "your team" highlights |

`--accent-text` is **not** always white. The team-themes lookup decides per team:
PIT/LV/NO use `black`; the other 29 teams use `white`. Use `text-[var(--accent-text)]`
on every accent button.

### Legacy aliases (kept for migration)

These are aliased to the new tokens so existing utility classes still compile:

```
--steelers-gold     → var(--accent-primary)
--steelers-dark-gold→ var(--accent-secondary)
--slidey            → var(--accent-primary)
--steelers-black    → var(--bg-page)
--surface-dark      → var(--bg-section)
--surface-card      → var(--bg-card)
--surface-elevated  → var(--bg-card)
```

---

## Typography

| Role | Font | Weight | Tracking |
|------|------|--------|----------|
| Display headings | `var(--font-display)` (Bebas Neue) | Bold | `tracking-wide` / `tracking-wider` |
| Body | IBM Plex Sans | Normal | Default |
| Mono | JetBrains Mono | Normal | Default |

---

## Layout Pattern

Light page + lifted white cards on a faint section tint. Nav is the only dark anchor.

```
┌──────────────────────────────────────────────────┐
│  Nav: bg-[var(--bg-nav)]  (dark, always)         │
│  ────────── accent gradient line ─────────────── │
├──────────────────────────────────────────────────┤
│  HeroBanner: gradient(team primary→secondary)    │
│  ────── TeamStripe (4px team color stripes) ──── │
│  TeamInfoBar (white card, –mt-6 lifted, needs)   │
├──────────────────────────────────────────────────┤
│ Page: var(--bg-page) #F5F6FA                     │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ Section: var(--bg-section) #EDF0F7         │  │
│  │ border-[var(--border)] rounded-xl p-5      │  │
│  │                                            │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │ Card: var(--bg-card) #FFFFFF         │  │  │
│  │  │ border + shadow-sm                   │  │  │
│  │  │                                      │  │  │
│  │  │ Title: text-[var(--text-primary)]    │  │  │
│  │  │ Body:  text-[var(--text-secondary)]  │  │  │
│  │  │ Hint:  text-[var(--text-muted)]      │  │  │
│  │  │ Link:  text-[var(--accent-primary)]  │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## Component Patterns

### Page wrapper

```tsx
<div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
  <HeroBanner teamCode={teamCode} />
  <TeamStripe />
  <TeamInfoBar teamCode={teamCode} />
  {/* content */}
</div>
```

### Section container

```tsx
<section className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-5 sm:p-8">
  ...
</section>
```

### Content card

```tsx
<div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
  ...
</div>
```

### Primary button

```tsx
<button className="rounded-lg bg-[var(--accent-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition">
  Save
</button>
```

### Secondary button

```tsx
<button className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-6 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] transition">
  Cancel
</button>
```

### Status pills (light-mode semantic)

```tsx
// success
<span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs font-medium">Published</span>
// pending
<span className="bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 text-xs font-medium">Draft</span>
// alert
<span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs font-medium">Locked</span>
```

### Match-type pick badges

```
exact: bg-green-100 text-green-700 border-green-200
close: bg-yellow-100 text-yellow-700 border-yellow-200
far:   bg-orange-100 text-orange-700 border-orange-200
miss:  bg-red-100 text-red-700 border-red-200
```

### "YOUR TEAM" pick highlight

In the pick builder, the user's favorite NFL team gets a left accent border + tint:

```tsx
<div className="border-l-4 border-l-[var(--accent-primary)] bg-[var(--accent-light)] ...">
  ...
  <span className="bg-[var(--accent-primary)] text-[var(--accent-text)] uppercase tracking-widest">
    Your Team
  </span>
</div>
```

---

## Team Theme System

`src/lib/team-themes.ts` exports static metadata for all 32 NFL teams. The
`TeamThemeProvider` component (mounted at `app/layout.tsx`) reads
`session.user.favoriteTeam.abbreviation` and writes the matching `--accent-*`
properties on `document.documentElement` at runtime.

### How team selection flows

1. User picks a team in `/settings`
2. `updateFavoriteTeam` server action persists `favoriteTeamId` (FK to `teams` table)
3. NextAuth session callback re-attaches the team's primary/secondary/abbreviation
4. `TeamThemeProvider` reads from session → writes CSS vars
5. Every component using `var(--accent-primary)` repaints — no per-component changes needed

### Pool theme override

`PoolThemeContext` lets a pool theme override the personal accent only on pool pages.
When set, it takes precedence over the user's team accent for the duration of the
pool view, then clears on unmount.

### Team codes

`ARI` `ATL` `BAL` `BUF` `CAR` `CHI` `CIN` `CLE` `DAL` `DEN` `DET` `GB` `HOU` `IND`
`JAX` `KC` `LV` `LAC` `LAR` `MIA` `MIN` `NE` `NO` `NYG` `NYJ` `PHI` `PIT` `SF` `SEA`
`TB` `TEN` `WAS`

Default: **PIT** (Pittsburgh hosts the 2026 draft).

---

## Don'ts

- Don't reintroduce dark page backgrounds. The nav is the only dark surface.
- Don't hardcode `text-white` for body text. Use `text-[var(--text-primary)]`.
  The exception is text *on* a team-color element (use `text-white` literally
  for that — most team primaries are dark; the four light-primary teams handle
  contrast through the static lookup).
- Don't use `--steelers-gold` directly in new code — write `var(--accent-primary)`.
  The legacy alias remains only so old code keeps rendering correctly.
- Don't use `bg-{color}-900/X` or `bg-{color}-500/N` for status pills — those are
  dark-mode artifacts. Use `bg-{color}-100 text-{color}-700` for light-mode badges.
- Don't load external image URLs for hero banners. The `HeroBanner` component
  builds team imagery from CSS gradients so there are no broken-image surprises
  and no third-party dependencies.
