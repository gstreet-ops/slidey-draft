@echo off
cd C:\Users\brian\projects\slidey-draft
git add src/db/index.ts
git commit -m "fix: use fallback DB URL at build time for Auth.js adapter compat"
git push origin phase2-week2