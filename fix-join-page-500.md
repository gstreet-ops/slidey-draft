# Fix /join/[code] 500 Server Error

Copy the block below and paste it into Claude Code.

---

```
cd C:\Users\brian\projects\slidey-draft ; claude --dangerously-skip-permissions "

## FIX: /join/SLIDEY2026 is returning a 500 server error in production

Vercel runtime logs show:
- GET /join/SLIDEY2026 → 500 → 'Error: Failed query: select...'
- This happens for both signed-in and signed-out users

### STEP 1 — FIND AND READ THE JOIN PAGE

Find the join route — it could be at:
- src/app/join/[code]/page.tsx
- src/app/pools/join/[inviteCode]/page.tsx
- or similar

Read the file and identify every database query it makes.

### STEP 2 — DIAGNOSE THE FAILING QUERY

For each query, check:
1. Does the table exist in the schema? (check src/db/schema.ts)
2. Are all referenced columns correct?
3. Is the query using the right Drizzle syntax?
4. Could it be a missing relation or join on a table that doesn't exist?

Common causes:
- A column was renamed but the query still uses the old name
- A table referenced in a join doesn't exist in production
- The schema was updated locally but the migration wasn't run on production DB

### STEP 3 — CHECK IF MIGRATIONS ARE UP TO DATE

Run: npx drizzle-kit push --dry-run (or equivalent) to see if there are pending schema changes that haven't been applied to the production database.

If there are pending changes, list them but do NOT push them automatically — just report what's missing.

### STEP 4 — FIX THE ISSUE

Based on what you find:
- If it's a code bug (wrong column name, bad join), fix the code
- If it's a missing migration, report what migration is needed
- If it's a missing table, report which table and its schema

### STEP 5 — TEST LOCALLY

Run: npm run build 2>&1 | tail -30

Confirm the build passes.

### STEP 6 — ALSO FIX THE TWO RELIABILITY ISSUES WHILE YOU'RE IN HERE

1. Wrap joinPool() in a database transaction — the status upgrade and pool_members insert should be atomic
2. Add try/catch with console.error logging around any cookie processing in the auth callback (src/lib/auth.ts)

### STEP 7 — COMMIT AND PUSH

Stage only the files you changed. Commit message:
'fix: resolve /join 500 error + wrap joinPool in transaction'

Push to GitHub. Vercel will auto-deploy.

### REPORT

Tell me:
1. What file the join page is in
2. What query was failing and why
3. What you fixed
4. Whether any DB migration is needed (and if so, the exact SQL)
5. Build result
6. Whether joinPool is now wrapped in a transaction
7. Whether auth callback has error logging

"
```
