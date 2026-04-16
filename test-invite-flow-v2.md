# Slidey Draft — End-to-End Invite Flow Test (v2)

Copy the block below and paste it into Claude Code.

---

```
cd C:\Users\brian\projects\slidey-draft ; claude --dangerously-skip-permissions "

## END-TO-END INVITE FLOW VERIFICATION

Test every invite path in the two-tier system: admin → commissioner → player.
Read the codebase first to understand current logic before making any changes.

---

### STEP 1 — DATABASE BASELINE

Run these queries and report results:

SELECT id, name, email, status, role FROM users ORDER BY created_at DESC LIMIT 20;
SELECT id, name, invite_code, status, commissioner_id FROM pools ORDER BY created_at DESC LIMIT 10;
SELECT pm.pool_id, pm.user_id, pm.role, u.name, u.email FROM pool_members pm JOIN users u ON u.id = pm.user_id ORDER BY pm.joined_at DESC LIMIT 20;
SELECT code, created_by, used_by, used_at, expires_at FROM commissioner_invites ORDER BY created_at DESC LIMIT 10;
SELECT code, claimed_by, claimed_at FROM app_invites ORDER BY created_at DESC LIMIT 10;

Report:
- Total users and their roles/statuses
- Total pools and their invite codes
- Total pool members
- Any unused commissioner invite codes
- Any unclaimed app invite codes

---

### STEP 2 — VERIFY COMMISSIONER INVITE ROUTE

Read src/app/commissioner/[code]/page.tsx (find the actual path if different).

Check the logic handles these cases:
1. Invalid/expired code → error message
2. Already-used code → error message
3. Not signed in → shows pitch page with Google sign-in CTA
4. Signed in as spectator/active → shows accept button, upgrades to commissioner on click
5. Already a commissioner → redirect to pools or show 'already commissioner' message

Report PASS or FAIL for each case based on code review.

---

### STEP 3 — VERIFY POOL JOIN ROUTE

Read the join route (src/app/join/[code]/page.tsx or src/app/pools/join/[inviteCode]/page.tsx — find the actual path).

Check the logic handles:
1. Invalid code → error message
2. Pool is locked → appropriate message
3. Not signed in → pitch page with sign-in CTA
4. Signed in as spectator (not yet active) → blocked with message about needing an app invite
5. Signed in as active, not a member → shows pool info and Join button
6. Already a member → redirect to pool dashboard
7. On join: inserts pool_members row with role='member'

Report PASS or FAIL for each case based on code review.

---

### STEP 4 — VERIFY COOKIE PERSISTENCE

Read the auth callback (src/lib/auth.ts or wherever the signIn/redirect callback lives).

Check:
1. Does it read a pending invite cookie after OAuth returns?
2. Does it auto-join the pool or auto-accept commissioner invite?
3. Does it clear the cookie after processing?
4. If no cookie logic exists, report MISSING — this is the flow where a new user clicks an invite link, gets redirected to Google sign-in, and should land back in the right pool after auth.

Report what exists and what's missing.

---

### STEP 5 — VERIFY COMMISSIONER INVITE GENERATION (ADMIN PANEL)

Read the admin panel page(s). Find where commissioner invites are generated.

Check:
1. Is there a UI for generating commissioner invite codes?
2. Does it show the full invite URL (https://slidey-draft.vercel.app/commissioner/[CODE])?
3. Is there a copy button?
4. Does it list existing invites with status (pending/used/expired)?

Report what exists.

---

### STEP 6 — VERIFY POOL INVITE GENERATION (COMMISSIONER)

Read the pool dashboard or pool settings page. Find where commissioners generate player invite codes.

Check:
1. Generate Link button — creates a shareable pool invite URL
2. Generate 5 Codes button — bulk creates single-use codes
3. Copy button on generated links/codes
4. Are generated codes stored in pool_invite_codes table?
5. Does the shared pool link (pools.invite_code) also work?

Report what exists.

---

### STEP 7 — VERIFY SPECTATOR GATING

Search for requireActiveUser or equivalent gating function.

Confirm spectators are blocked from:
- Creating pools
- Joining pools
- Building mock drafts
- Making live predictions

But spectators CAN:
- Browse the site (home, prospects, scoring page)
- Sign in
- View their own profile/settings

Report PASS or FAIL for each gate.

---

### STEP 8 — GENERATE TEST DATA (if not already present)

If there is no pool yet, create one:
- Pool name: 'Slidey Draft Night 2026'
- Invite code: 'SLIDEY2026'
- Commissioner: brian's user ID
- Status: open
- Settings with standard scoring defaults

If there are no unused app invite codes, generate 5:
- Codes: FRIEND01 through FRIEND05
- Created by brian

If there are no unused commissioner invite codes, generate 2:
- Auto-generated codes with 7-day expiration
- Created by brian

Report all generated codes and their full URLs.

---

### STEP 9 — TRACE THE FULL NEW USER JOURNEY (code review)

Walk through the code path for this scenario:

1. New person visits https://slidey-draft.vercel.app/join/SLIDEY2026
2. They're not signed in — what do they see?
3. They click Sign in with Google → OAuth flow → callback
4. They now have a user record with status='spectator' — what happens?
5. Someone gives them app invite code FRIEND01
6. They visit /invite/FRIEND01 — what happens? (should upgrade to active)
7. They visit /join/SLIDEY2026 again — what do they see?
8. They click Join — are they added to pool_members?
9. They're redirected to pool dashboard — does it show the pool?

Report PASS or FAIL for each step. Fix anything that's broken.


---

### STEP 10 — BUILD VERIFICATION

Run: npm run build 2>&1 | tail -30

Confirm the build passes. If it fails, fix the issue.

---

### FINAL REPORT

Provide:
1. Summary table: each test case, PASS/FAIL, notes
2. All invite URLs for sharing:
   - Pool join: https://slidey-draft.vercel.app/join/SLIDEY2026
   - Commissioner invite links (with codes)
   - App invite links: /invite/FRIEND01 through FRIEND05
3. Any bugs found and fixed
4. Any issues that need manual browser testing (things code review can't verify)
5. Recommendations for what to test manually before April 23

Push all changes to GitHub.

"
```
