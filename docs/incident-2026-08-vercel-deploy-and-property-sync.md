# 2026-08 incident record: Vercel auto-deploy and Property Sync 500s

Two unrelated production issues, found and fixed back-to-back. Recorded here since both root causes were non-obvious and easy to reintroduce.

## 1. Git push stopped auto-deploying to Vercel

**Symptom:** pushes to `main` no longer produced a new Vercel deployment. No error was visible anywhere obvious — `vercel git connect` reported the GitHub repo as already connected, the GitHub App had "All repositories" access, and disconnect/reconnect (both CLI and dashboard) plus a full GitHub App uninstall/reinstall made no difference.

**Root cause:** `vercel.json` defined two cron jobs on a `*/10 * * * *` schedule (property sync bookings/checkins). The Vercel account is on the Hobby plan, which only allows daily cron schedules. Every deployment attempt — git-triggered or manual `vercel deploy` — was being rejected by Vercel's deploy validation (`deploy_failed`, "Hobby accounts are limited to daily cron jobs") *before* a deployment record was even created, so it looked like nothing was happening rather than like a failure. The webhook/GitHub App investigation was a red herring.

**Fix:**
- Removed the `crons` block from `vercel.json`.
- Added `.github/workflows/property-sync-cron.yml`, a GitHub Actions workflow that hits the same cron routes (`/api/cron/property-sync-bookings`, `/api/cron/property-sync-checkins`) on the same 10-minute cadence via `schedule`, plus `workflow_dispatch` for manual runs.
- Requires a `CRON_SECRET` value set identically in **both**:
  - Vercel project env vars (Production + Preview)
  - GitHub repo → Settings → Secrets and variables → Actions
- **The workflow file must exist on the repo's default branch** (`develop`, not `main`) — GitHub only lists/schedules Actions workflows that are present on the default branch, regardless of which branch Vercel deploys from. It was initially added to `main` only and silently never ran; had to be duplicated onto `develop`.
- Hit a second bug after that: the initial workflow YAML mixed `${{ secrets.CRON_SECRET }}` with embedded double quotes on an unquoted `run:` line, which is invalid YAML (`bad indentation of a mapping entry`). Every run failed with 0 jobs, and GitHub showed the workflow's name as the raw file path instead of `Property sync cron` (a tell that the parser never got far enough to read `name:`). Fixed by moving the secret into `env:` and using a `run: |` block scalar.

**Where things stand:** auto-deploy on push works again. The two cron routes are called by GitHub Actions instead of Vercel's native Cron Jobs — always against production (`https://www.aticanbeachresort.com`), regardless of which branch the workflow file lives on.

## 2. MafrexAI Property Sync: room-categories / rooms endpoints returning 500

**Symptom:** MafrexAI dashboard's "Sync rooms now" failed with `Room categories endpoint returned 500: Unable to retrieve room categories.`

**Root cause:** production logs (`vercel logs --level error`) showed the real error masked by the route's generic 500 response: `column rooms.amenities does not exist`. The `amenities` column has been part of the `rooms` table definition since the very first migration (`supabase/migrations/20240608000000_initial_schema.sql`), but the live production database's `rooms` table never actually had it — schema drift from an out-of-band table creation/edit at some point, not a missing migration file.

**Fix:** added `supabase/migrations/20260813000000_add_rooms_amenities_column.sql`:

```sql
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
```

Applied by hand via the Supabase SQL Editor against the production project (ref `zwjjtlofpcjcwfhyqdqu`) — the Supabase CLI on this machine is authenticated to a different account and isn't linked to that project, so it couldn't be applied through `supabase db push`.

**Open question worth revisiting:** since this table drifted from its migrations once, other columns the migrations added (`gallery_images`, `status`, etc.) are worth spot-checking against production rather than assumed present.
