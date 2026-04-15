# War Room Chat Panel + Nav Unread Badge

## Goal

Add a collapsible side-panel chat to the War Room (`/live`) and a lightweight unread message badge to the site nav. Chat already works on the pool dashboard sidebar — we're extending it to where people actually need it on draft night, without adding a floating/draggable widget that conflicts with the existing `VideoWidget`.

---

## WHAT EXISTS (DO NOT REBUILD)

These are already working. Reuse them:

- **`src/components/pool-chat.tsx`** — Full chat component: polling every 5s, auto-scroll, message input, 500 char limit, spectator read-only mode, commissioner badge, avatars, relative timestamps. Currently mounted in `/pools/[id]/page.tsx` sidebar.
- **`src/app/api/pools/[poolId]/chat/route.ts`** — GET (with `?after=` polling) and POST endpoints.
- **`src/lib/queries.ts`** — `getPoolChatMessages()` query function.
- **`chat_messages` table** — schema is done and migrated.
- **`src/components/video-widget.tsx`** — Floating Jitsi watch party widget, fixed `bottom-4 right-4 z-[9999]`. DO NOT MOVE OR BREAK THIS.

---

## PART 1: War Room Chat Side Panel

### New component: `src/components/war-room-chat.tsx`

A slide-out panel on the RIGHT side of the War Room that wraps the existing `PoolChat` component.

**Collapsed state (default):**
- A vertical tab/button pinned to the right edge of the War Room content area (not fixed/floating — it scrolls with the page content)
- Shows a chat bubble icon + "Chat" label rotated vertically
- If there are unread messages since the user last opened the panel, show a red dot/count badge on the tab
- Click to expand

**Expanded state:**
- Panel slides in from the right, ~350px wide
- Header bar: pool name + "Chat" label + close (X) button
- Below the header: renders the existing `<PoolChat>` component with all its current props
- On desktop (lg+): the War Room 3-column grid (`[300px_1fr_320px]`) should shrink to accommodate the chat panel. Use a CSS transition so it feels smooth. The panel sits OUTSIDE the grid, overlaying from the right edge OR the grid compresses to `[280px_1fr_280px]` when chat is open.
- On mobile: the panel slides in as a full-width overlay (100vw, full height below the status bar), with a semi-transparent backdrop. Tap backdrop or X to close.
- Remember last open/closed state in `localStorage` key `war-room-chat-open` so it persists across page refreshes during draft night.

**System messages (NEW):**
Add a new message type to the chat feed that's injected client-side (not stored in DB). When the War Room detects a new pick via `resultsData` changing:
- Insert a system message into the chat display: "🏈 Pick #{pickNumber}: {playerName} ({position}) → {teamAbbreviation}"
- Style system messages differently: no avatar, centered text, smaller font, muted color, maybe a thin divider line above/below
- These are display-only — they do NOT go into `chat_messages` table and do NOT get sent via the POST endpoint

**Integration into `/live` page:**
- The `war-room.tsx` component needs a new prop: `chatEnabled: boolean` and `chatPoolId: string | null` and `commissionerId: string`
- In `page.tsx`, pass these from the existing `userPools` data
- Wrap the War Room content + chat panel in a flex container so the panel can slide in/out

### Positioning vs VideoWidget
- The VideoWidget is `fixed bottom-4 right-4 z-[9999]`
- The chat panel is NOT fixed — it's part of the page layout (position relative/absolute within the War Room container)
- No conflict. The VideoWidget floats above everything; the chat panel is inline content.

---

## PART 2: Nav Unread Badge

### Modify `src/components/site-nav.tsx`

Add an unread message indicator to the "Pools" link in the nav.

**How it works:**
- New client-side hook: `src/hooks/use-unread-chat.ts`
- The hook polls `GET /api/pools/unread-count` every 30 seconds (much lighter than 5s — this is background awareness, not real-time chat)
- Returns `{ unreadCount: number }` — total unread messages across all pools the user belongs to
- When `unreadCount > 0`, show a small red dot (or count badge if > 9, show "9+") on the "Pools" nav link

### New API route: `GET /api/pools/unread-count`

- Requires auth
- For each pool the user is a member of:
  - Get the timestamp of the user's last-read message (new field, see below)
  - Count messages in `chat_messages` where `pool_id = X` and `created_at > lastRead` and `user_id != currentUser`
- Return `{ unreadCount: totalAcrossAllPools }`

### Tracking "last read" timestamp

Two options (pick the simpler one):

**Option A (recommended): localStorage only**
- Store `chat-last-read-{poolId}` in localStorage with an ISO timestamp
- Update it every time the user opens the chat panel or views the pool dashboard
- The unread count API just returns ALL recent messages; the client filters by localStorage timestamp
- Pros: no schema change, no migration
- Cons: per-device only, resets if user clears storage

**Option B: Database column**
- Add `last_read_at` timestamp to `pool_members` table
- Update it via API when user opens chat
- Server computes unread count accurately
- Pros: cross-device
- Cons: migration + extra writes

**Go with Option A** — this is draft night polish, not a core feature. localStorage is fine.

With Option A, simplify the API: skip the `/api/pools/unread-count` route entirely. Instead, the `use-unread-chat` hook:
1. Fetches `GET /api/pools/{poolId}/chat` (already exists) for each user pool
2. Compares the latest message timestamp against localStorage `chat-last-read-{poolId}`
3. Counts messages newer than that timestamp where userId != currentUser
4. Sums across pools

Actually this is too many API calls if the user is in multiple pools. Better approach:

### Revised: Single unread endpoint

**New route: `GET /api/chat/unread`**
- Auth required
- Query: for all pools the user belongs to, get the most recent message timestamp per pool
- Return: `{ pools: [{ poolId, latestMessageAt, latestMessagePreview }] }`
- The client hook compares each `latestMessageAt` against localStorage `chat-last-read-{poolId}`
- This is ONE query, lightweight, runs every 30s

---

## PART 3: Mobile Tab Addition

On mobile in the War Room, the `MobileTabBar` currently has: Picks | My Draft | Leaderboard

Add a 4th tab: **Chat**

- When the Chat tab is active, render the `PoolChat` component full-width (same as other tabs)
- Show unread dot on the Chat tab label when there are unread messages
- This is simpler than a slide-out panel on mobile and uses the existing tab pattern

---

## IMPLEMENTATION ORDER

1. Create `src/hooks/use-unread-chat.ts` — hook that checks localStorage vs latest message timestamps
2. Create `GET /api/chat/unread` — single lightweight endpoint returning latest message timestamps per pool
3. Create `src/components/war-room-chat.tsx` — the collapsible side panel wrapping `PoolChat`
4. Add system message injection logic (client-side only, triggered by new pick detection)
5. Integrate into `war-room.tsx` — add chat panel, pass props, adjust grid layout
6. Update `page.tsx` (`/live`) — pass chat props through to WarRoom
7. Add Chat tab to `MobileTabBar` in war-room.tsx
8. Update `site-nav.tsx` — add unread dot badge to Pools link using the hook
9. Update `pool-chat.tsx` — when mounted, write current timestamp to localStorage `chat-last-read-{poolId}` (marks messages as read)

---

## KEY RULES

- DO NOT create a floating/draggable widget — this is a slide-out panel within the War Room layout
- DO NOT touch `video-widget.tsx` — it stays exactly as-is at `fixed bottom-4 right-4`
- Reuse the existing `PoolChat` component inside the panel — don't rebuild chat
- System messages are CLIENT-SIDE ONLY — never write them to the database
- localStorage for read tracking — no schema changes for this feature
- The panel defaults to CLOSED on first visit; remembers state after that
- Nav badge polls every 30s, not 5s — it's ambient awareness, not real-time