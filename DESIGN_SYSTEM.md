# Slidey Draft — Design System

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--gtown-navy` | `#041E42` | Page backgrounds, app shell |
| `--gtown-highlight` | `#4A7AB5` | Secondary accent, user-facing CTAs |
| `--lions-blue` | `#0076B6` | Primary accent, card titles, badges, admin UI |

## Typography

| Role | Font | Weight | Tracking |
|------|------|--------|----------|
| Display headings | `var(--font-display)` (Bebas Neue) | Bold | `tracking-wide` or `tracking-wider` |
| Body text | System sans (Geist) | Normal | Default |
| Code/mono | JetBrains Mono | Normal | Default |

## Core Layout Pattern

The app uses a **dark shell + light content cards** pattern:

```
┌─────────────────────────────────────────┐
│ Dark navy page bg (--gtown-navy)        │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Section card (bg-gray-900/60)     │  │
│  │ border border-white/10 rounded-xl │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Content card (bg-white)     │  │  │
│  │  │ rounded-lg shadow-sm        │  │  │
│  │  │                             │  │  │
│  │  │ Title: text-[var(--lions-   │  │  │
│  │  │        blue)] font-bold     │  │  │
│  │  │ Body: text-gray-600         │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Another content card        │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Next section card                 │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Component Patterns

### Section Container
Used to group related content on dark backgrounds.
```
className="rounded-xl bg-gray-900/60 border border-white/10 p-5 sm:p-8"
```
- White headings: `text-white` + `font-display`
- White/60 body text between cards

### Content Card (White)
Individual content items inside section containers.
```
className="rounded-lg bg-white px-4 py-3 shadow-sm"
```
- Title: `text-sm font-bold text-[var(--lions-blue)]`
- Body: `text-sm text-gray-600 leading-relaxed`
- Description: `text-xs text-gray-500`

### Accent Card (Colored)
For emphasis — scoring rules, key info.
```
className="rounded-xl border-2 border-[var(--lions-blue)]/30 bg-blue-50 p-5"
```
Variants:
- Blue: `border-[var(--lions-blue)]/30 bg-blue-50` — mock draft scoring
- Green: `border-green-300 bg-green-50` — live predictions
- Gray: `border-gray-200 bg-gray-50` — summary/formula

### Score Row
Points + label inside scoring tables.
```
className="rounded-lg bg-white px-4 py-3 shadow-sm"
```
- Points: `text-lg font-bold` with color by type (green/yellow/orange/red)
- Label: `text-sm font-semibold text-gray-900`
- Desc: `text-xs text-gray-500`

### Pick Card (Board View)
Draft board pick slots on dark backgrounds.
```
// Empty slot
className="border-white/10 bg-white/5 hover:border-white/20"

// Filled slot
className="border-white/10 bg-white/5"

// Active slot
className="border-[var(--lions-blue)] bg-[var(--lions-blue)]/10"
```

### Navigation
- Desktop: horizontal links, `text-white/60 hover:text-white`
- Mobile (<768px): hamburger menu, slide-down panel
- Admin: separate header with `bg-black/20`

### Buttons
- Primary: `bg-[var(--lions-blue)] text-white hover:bg-[var(--lions-blue)]/80`
- Secondary: `border border-white/20 text-white/70 hover:border-white/40`
- Danger: `border border-red-500/30 text-red-400 hover:bg-red-500/10`
- Success: `bg-green-600 text-white hover:bg-green-500`

### Badges / Pills
- Position: `bg-[var(--lions-blue)]/20 text-[var(--lions-blue)]`
- Status published: `bg-green-500/20 text-green-400`
- Status draft: `bg-yellow-500/20 text-yellow-400`
- BPA tag: `text-yellow-400/70`

### Match Type Colors
| Type | Border/BG | Text |
|------|-----------|------|
| Exact | `green-500/30`, `green-500/10` | `green-400` |
| Close | `yellow-500/30`, `yellow-500/10` | `yellow-400` |
| Far | `orange-500/30`, `orange-500/10` | `orange-400` |
| Miss | `red-500/30`, `red-500/10` | `red-400` |

### Prospect Detail Drawer
- Light theme: `bg-white` with `text-gray-900` headers, `text-gray-600` body
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
