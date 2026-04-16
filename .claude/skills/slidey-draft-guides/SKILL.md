---
name: slidey-draft-guides
description: >
  Update all user-facing documentation for the Slidey Draft app after feature changes.
  Trigger this skill whenever a feature is added, modified, or removed that affects the user
  experience — even if the user doesn't explicitly mention "docs" or "guides." Also trigger
  when the user says "update guides", "update docs", "refresh the help pages", "sync the
  guides", "are the guides up to date?", or after any session where UI, scoring, navigation,
  commissioner controls, or terminology changed. If a feature just shipped and guides weren't
  mentioned, proactively suggest running this skill. This skill auto-detects what changed by
  reading git history and component source, then surgically updates only the affected
  sections across all guide pages, scoring references, tooltips, and in-app help text.
---

# Slidey Draft — Guide Updater

You are updating user-facing documentation for **Slidey Draft** (slidey-draft.vercel.app),
an NFL draft prediction and live competition app. The app has a Georgetown University navy
theme and serves two audiences: **players** (casual fans making picks, answering trivia)
and **commissioners** (pool organizers who control scoring, trivia, simulation, invites).

## Why this skill exists

Features ship fast in this project — often multiple per session. The guides tend to fall
behind, creating confusion for players and commissioners who don't know about new controls
or changed workflows. This skill ensures that every feature change is reflected in the
docs before the user has to think about it.

## Step 1: Detect what changed

Before touching any guide file, figure out what actually changed. Run these commands
from the project root (`C:\Users\brian\projects\slidey-draft`):

```bash
# Recent commits (look for feature additions, UI changes, renamed concepts)
git log --oneline -20

# If you need more context on a specific commit:
git show <hash> --stat
```

Scan the commit messages for signals like:
- New routes or pages added
- Components renamed or removed (e.g., "War Room" → "Live", "Chat" → "Live Feed")
- Scoring changes (new tiers, custom scoring, team scoring)
- Commissioner controls added (trivia settings, simulation, burst config)
- Navigation changes (links added/removed/reordered)
- New user flows (invite system, pool switching, video call integration)

Then read the current source of any changed components to understand the *actual* current
state — commit messages can be incomplete. The source code is the ground truth.

## Step 2: Identify which guide files need updates

Here are all the user-facing documentation touchpoints in the project:

### Guide Pages (React/Next.js server components)

| File | Route | Audience | What it covers |
|------|-------|----------|----------------|
| `src/app/guide/page.tsx` | `/guide` | Everyone | Overview hub — links to user and commissioner guides, FAQ |
| `src/app/guide/user/page.tsx` | `/guide/user` | Players | Making picks, scoring, pools, teams, draft day experience |
| `src/app/guide/commissioner/page.tsx` | `/guide/commissioner` | Commissioners | Pool setup, invites, teams, trivia, simulation, scoring config |
| `src/app/scoring/page.tsx` | `/scoring` | Everyone | Three scoring tracks (Mock, Live, Trivia), standard vs custom, worked examples |

### In-App Help Text and Tooltips

These are embedded directly in feature components:

- **Prospect grade tooltip** — in the prospect detail drawer component
- **Scoring track color badges** — Blue (mock), Green (live), Purple (trivia)
- **Commissioner control labels** — timer options, burst settings, pause/resume hints
- **Empty state messages** — "No picks yet", "Waiting for draft to start", etc.

Search for these patterns to find in-app help text:
```bash
# Tooltip and help text patterns
grep -r "tooltip\|aria-label\|placeholder\|helpText\|description.*=" src/components/ src/app/ --include="*.tsx" -l
```

### Navigation Labels

- `src/components/site-nav.tsx` — Primary nav links and "More" dropdown labels
- Any breadcrumb or section header text in page layouts

## Step 3: Make the updates

For each guide file that needs changes, read the current content first, then apply
surgical edits. Follow these principles:

### Tone and Voice
- Write for a **casual sports fan**, not a developer. Think "fantasy football app help page."
- Use "you" and "your" — speak directly to the reader.
- Keep it scannable: short paragraphs, clear section headers.
- Commissioner guide can be slightly more detailed since commissioners are power users.
- Use the app's own terminology consistently (see Terminology section below).

### Terminology (always use these exact terms)
- **Pool** (not "group" or "league") — a collection of players competing together
- **Commissioner** (not "admin" or "organizer") — the person who manages a pool
- **Live** (not "War Room") — the real-time draft experience page at `/live`
- **Live Feed** (not "Chat") — the one-way system notification stream on the Live page
- **My Draft** (not "My Board" or "My Picks") — the user's mock draft board
- **Mock Draft** — a pre-draft prediction board; each user creates one per pool
- **Big Board** / **Prospects** — the master prospect rankings list
- **Trivia Burst** — rolling trivia questions fired between draft picks
- **Simulation** — commissioner-controlled mock draft progression for testing

### What to update vs. what to leave alone
- **Update** any section that describes a feature, flow, or control that has changed.
- **Add** new sections when an entirely new feature has shipped (e.g., video call integration, Live Feed, rolling trivia burst).
- **Remove** references to renamed or deleted features (e.g., purge any remaining "War Room" or "Chat" references).
- **Leave alone** sections that are accurate — don't rewrite working content just for style.
- **Preserve** the existing visual structure (component usage like InfoCard, Step, Feature, Faq).

### Scoring page specifics
The scoring page (`/scoring`) uses worked examples with real prospect names and pick
numbers. When scoring rules change:
1. Update the rules description and point values
2. Update or replace worked examples to match new rules
3. If custom scoring was added, document the commissioner configuration flow
4. Keep the three-track structure: Mock Draft Scoring → Live Prediction Scoring → Trivia Scoring

### Commissioner guide specifics
The commissioner guide should document every control surface available to commissioners:
- Pool creation and invite flow (two-tier: admin → commissioner → players)
- Trivia management: queue builder, AI generator, timer, pause, burst settings
- Simulation controls: step-by-step guide, pick advancement, trivia integration
- Scoring configuration: standard mode vs custom mode, per-pool settings
- Video call setup: external link configuration for Meet/Zoom
- Live page commissioner overlay: all controls accessible from `/live` during draft night

## Step 4: Verify consistency

After making changes, do a quick consistency pass:

```bash
# Check for stale terminology across all guide and UI files
grep -ri "war room\|group\b\|chat panel\|my board\|watch party" src/app/guide/ src/app/scoring/ src/components/site-nav.tsx --include="*.tsx"
```

If any stale terms surface, fix them. Also verify:
- Links between guide pages still work (e.g., `/guide` links to `/guide/user` and `/guide/commissioner`)
- The scoring page point values match what's in `src/lib/scoring.ts` and `src/lib/pool-scoring.ts`
- Navigation labels in `site-nav.tsx` match what the guides reference
- Any "How to Play" or "Learn more" links in feature components point to the right guide section

## Step 5: Summary

After all updates, provide a brief summary of what was changed and why, formatted as:

```
Guide Updates Summary
─────────────────────
✓ /guide — [what changed]
✓ /guide/user — [what changed]
✓ /guide/commissioner — [what changed]
✓ /scoring — [what changed]
✗ [file] — no changes needed

Terminology fixes: [count] stale references corrected
```

This helps the user confirm the right files were touched without having to diff every file.
