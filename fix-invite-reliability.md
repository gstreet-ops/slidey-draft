# Fix Invite Flow Reliability Issues

Copy the block below and paste it into Claude Code.

---

```
cd C:\Users\brian\projects\slidey-draft ; claude --dangerously-skip-permissions "

## FIX TWO INVITE FLOW RELIABILITY ISSUES

Read the codebase first to understand current implementation before making changes.

---

### FIX 1 — WRAP joinPool() IN A TRANSACTION

Find the joinPool function (likely in src/lib/actions.ts or an API route under src/app/api/pools/).

Currently, upgrading a user's status to 'active' and inserting into pool_members are two separate DB calls. If the insert fails, the user is left active but not in the pool.

Fix: Wrap both operations in a single database transaction using Drizzle's transaction API.

Example pattern:
```typescript
await db.transaction(async (tx) => {
  // 1. Upgrade user status if spectator
  if (user.status === 'spectator') {
    await tx.update(users).set({ status: 'active' }).where(eq(users.id, userId));
  }
  // 2. Insert pool member
  await tx.insert(poolMembers).values({
    id: crypto.randomUUID(),
    poolId,
    userId,
    role: 'member',
    joinedAt: new Date(),
  });
});
```

Also check the commissioner invite acceptance flow — if it upgrades role to 'commissioner' AND marks the invite as used, those should also be in a transaction.

Do NOT change any other behavior. Just wrap existing operations in transactions.

---

### FIX 2 — ADD ERROR LOGGING TO AUTH CALLBACK COOKIE PROCESSING

Find the auth callback in src/lib/auth.ts (the signIn or redirect callback).

Look for where it reads the pending invite cookie (slidey_pending_invite or similar) and auto-joins the user to a pool after OAuth.

If this logic exists, wrap it in a try/catch:

```typescript
try {
  // existing cookie processing logic
  const pendingInvite = cookies().get('slidey_pending_invite')?.value;
  if (pendingInvite) {
    // ... join pool or accept commissioner invite
    // ... clear cookie
  }
} catch (error) {
  console.error('[AUTH] Failed to process pending invite cookie:', error);
  // Don't throw — let the user sign in anyway, they can rejoin manually
}
```

If the cookie processing logic does NOT exist yet (the test flagged it as potentially missing), report what you find but do NOT build new cookie logic — that's a larger change for later.

The goal is just to make sure any existing cookie handling won't silently swallow errors.

---

### VERIFICATION

1. Run: npm run build 2>&1 | tail -30
2. Confirm build passes
3. If it fails, fix the issue

### COMMIT AND PUSH

Commit message: 'fix: wrap joinPool in transaction + add auth callback error logging'

Push to GitHub. Vercel will auto-deploy.

---

### REPORT

Tell me:
1. Where joinPool was defined (file + line)
2. What operations are now in the transaction
3. Whether commissioner invite acceptance was also wrapped
4. Whether cookie processing existed in auth callback (and if so, what you wrapped)
5. Build result

"
```
