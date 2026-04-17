# Slidey Draft — Design System

The 2026 draft is in Pittsburgh. The app runs on a **Steelers black-and-gold** palette, with
a tiered dark-surface hierarchy that keeps cards visibly distinct on laptop LCDs.

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--steelers-black` | `#101820` | Page backgrounds, nav bar, base surface |
| `--steelers-gold` | `#FFB612` | Primary accent, links, CTAs, badges, active states |
| `--steelers-dark-gold` | `#CC9200` | Hover/muted gold |
| `--surface-dark` | `#1a2433` | Section containers (one step up from the page bg) |
| `--surface-card` | `#243040` | Content cards (noticeably lighter than section containers) |
| `--surface-elevated` | `#2d3a4d` | Hover states, elevated panels |
| `--slidey` | `#FFB612` | Brand accent — aliased to gold |

Gold text on dark is the **primary accent pattern**. Gold buttons use **black text** for contrast.

## Typography

| Role | Font | Weight | Tracking |
|------|------|--------|----------|
| Display headings | `var(--font-display)` (Bebas Neue) | Bold | `tracking-wide` or `tracking-wider` |
| Body text | IBM Plex Sans | Normal | Default |
| Code/mono | JetBrains Mono | Normal | Default |

## Core Layout Pattern

Dark base + lifted surface cards. Each level up is visibly lighter:

```
┌─────────────────────────────────────────┐
│ Page bg: var(--steelers-black) #101820  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Section: var(--surface-dark)      │  │
│  │ border-white/10 rounded-xl p-5    │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Card: var(--surface-card)   │  │  │
│  │  │ border-white/[0.12]         │  │  │
│  │  │                             │  │  │
│  │  │ Title: text-[var(--         │  │  │
│  │  │        steelers-gold)]      │  │  │
│  │  │ Body: text-white/60         │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Hover lifts to              │  │  │
│  │  │ var(--surface-elevated)     │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Component Patterns

### Section Container
Groups related content inside a page.
```
className="rounded-xl bg-[var(--surface-dark)] border border-white/10 p-5 sm:p-8"
```
- Headings: `text-white` + `font-display`
- Body text: `text-white/60`

### Content Card (Dark)
A card inside a section — one tier lighter than the section bg.
```
className="rounded-lg bg-[var(--surface-card)] border border-white/[0.12] px-4 py-3"
```
- Title: `text-sm font-bold text-[var(--steelers-gold)]`
- Body: `text-sm text-white/70`
- Desc: `text-xs text-white/50`

### Accent Card (Gold)
For emphasis — CTAs, featured callouts.
```
className="rounded-xl border border-[var(--steelers-gold)]/30 bg-[var(--steelers-gold)]/10 p-5"
```
Variants:
- Gold (primary): `border-[var(--steelers-gold)]/30 bg-[var(--steelers-gold)]/10`
- Success: `border-green-500/30 bg-green-500/10`
- Warning: `border-yellow-500/30 bg-yellow-500/10`
- Danger: `border-red-500/30 bg-red-500/10`

### Score Row
Points + label in scoring tables.
```
className="flex items-center gap-3 rounded-lg bg-[var(--surface-card)] px-4 py-3"
```
- Points: `text-lg font-bold` with color by type (green/yellow/orange/red)
- Label: `text-sm font-semibold text-white`
- Desc: `text-xs text-white/50`

### Pick Card (Board View)
Draft board pick slots on dark backgrounds.
```
// Empty slot
className="border-white/10 bg-white/5 hover:border-white/20"

// Filled slot
className="border-white/10 bg-[var(--surface-card)]"

// Active slot
className="border-[var(--steelers-gold)] bg-[var(--steelers-gold)]/10"
```

### Navigation
- Background: `bg-[var(--steelers-black)]` with `border-b border-white/10`
- Logo: `DRAFT DAY` white, `CHALLENGE` in `text-[var(--slidey)]` (gold)
- Desktop links: `text-white/60 hover:text-white`
- "More" dropdown: `bg-[var(--steelers-black)]` panel
- Mobile: hamburger → flat vertical list

### Buttons

| Kind | Classes |
|------|---------|
| **Primary (gold)** | `bg-[var(--steelers-gold)] text-black hover:bg-[var(--steelers-dark-gold)]` |
| Secondary | `border border-white/20 text-white/70 hover:border-white/40 hover:text-white` |
| Danger | `border border-red-500/30 text-red-400 hover:bg-red-500/10` |
| Success | `bg-green-600 text-white hover:bg-green-500` |

**Rule:** solid gold background → `text-black`, not `text-white`. Gold/20 tinted surfaces can
still use `text-white` because the background is mostly the underlying dark surface.

### Badges / Pills

| Role | Classes |
|------|---------|
| Position pill | `bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)]` |
| Status: Published | `bg-green-500/20 text-green-400` |
| Status: Draft | `bg-yellow-500/20 text-yellow-400` |
| Admin role | `bg-red-500/20 text-red-400` |
| Commissioner role | `bg-yellow-500/20 text-yellow-400` |
| BPA tag | `text-yellow-400/70` |

Status colors (green/yellow/red) are semantic, not brand — leave them even on the Steelers theme.

### Match Type Colors

| Type | Border/BG | Text |
|------|-----------|------|
| Exact | `green-500/30`, `green-500/10` | `green-400` |
| Close | `yellow-500/30`, `yellow-500/10` | `yellow-400` |
| Far | `orange-500/30`, `orange-500/10` | `orange-400` |
| Miss | `red-500/30`, `red-500/10` | `red-400` |

### Team Needs Labels

| Tier | Classes | Label |
|------|---------|-------|
| Top Need (index 0) | `text-green-400` | `● Top Need` |
| Key Need (index 1) | `text-green-400/80` | `● Key Need` |
| Fits Need (index 2+) | `text-sky-400/60` | `● Fits Need` |
| Off-need | `text-amber-400/60` | `○ Off-need` |

### Prospect Detail Drawer
- Light theme: `bg-white` with `text-[var(--steelers-black)]` headers, `text-gray-600` body
- Full-screen on mobile, 420px panel on desktop
- Stats bar with dividers, combine measurables grid
- Backdrop: `bg-black/60 backdrop-blur-sm`

## Spacing Scale
- Page padding: `px-4 sm:px-6`
- Section gaps: `space-y-6`
- Card inner padding: `p-5 sm:p-8` (sections), `px-4 py-3` (content cards)
- Card gaps: `space-y-3` (between content cards)

## Responsive Breakpoints
- Mobile: default (< 640px)
- `sm`: 640px
- `md`: 768px (hamburger breakpoint)
- `lg`: 1024px (two-panel layouts)
- Max widths: `max-w-4xl` (content), `max-w-5xl` (nav), `max-w-7xl` (dashboard)
