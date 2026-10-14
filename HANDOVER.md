# CLEAN MY CITY — PROJECT HANDOVER (updated 14 Oct 2026)

You are taking over an existing, live web app. Read all of this before suggesting changes. Do not assume anything not written here; section 13 lists files never seen, so ask the owner for them.

## 1. What the app is
Free, public, no-login web app for Rawalpindi, Pakistan. Anyone marks a waste site on a map, picks a waste type, writes a description, optionally picks a locality and adds a photo. Reports are public: map pins, a "Recent reports" grid and a leaderboard page ranking areas. One admin (shared password) manages reports. Long-term goal: auto-route each report to the responsible local authority with escalation levels and scheduled email digests (section 10).

## 2. Links and environment
- Live: https://cleanmycity.vercel.app (new) and https://clean-my-city-v2.vercel.app (old, still works; GitHub workflows use the OLD one, do not remove it).
- GitHub: https://github.com/gynecare/Clean-My-City-V2 (branch main). Vercel auto-deploys on push to main; a failed build keeps the last good version live.
- Supabase (free plan) for database + storage. GitHub Actions for schedules. Free resources only.
- Owner uses Windows PowerShell. Local folder: C:\clean-my-city-V01 (outside OneDrive). Root also has an unexplained folder "Clean My City" and possibly a root `types.ts`; `@/types` resolves fine.
- A free page.gd subdomain (InfinityFree) was tried and CANNOT be used: Vercel says the base domain is linked to another Vercel account and needs a TXT record at page.gd that the owner cannot add. Decision: stay on .vercel.app for the test period; buy a real domain later if the app takes off.

## 3. Stack
Next.js 14.2.35 (App Router), React 18.3, TypeScript 5.5, @supabase/supabase-js 2.x, Leaflet 1.9 + react-leaflet 4.2. Plain global CSS (classes like report-panel, admin-row, form-error, btn-primary, btn-secondary, locality-select, site-footer). No Tailwind. Alias `@/` = project root.

## 4. Environment variables (never share values)
Server-side only, in `.env.local` and Vercel settings: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD. GitHub repo secret: ADMIN_PASSWORD (used by backup workflow). No NEXT_PUBLIC_ variables. Env changes need a dev restart / Vercel redeploy.

## 5. Architecture rule
Browser pages never call Supabase directly: page -> /api route -> lib/* -> Supabase with the service role key. `lib/supabaseClient.ts` is server-only. Admin check everywhere: header `x-admin-key` must equal ADMIN_PASSWORD (rejected if unset).

## 6. Files
```
app/page.tsx                    Homepage (client)
app/admin/page.tsx              Admin screen (client)
app/admin/digest/page.tsx       Digest preview page (not linked from admin; open by URL)
app/leaderboard/page.tsx        Leaderboard (client, fetches /api/leaderboard)
app/api/reports/route.ts        GET list, POST create (validation, rate limit, photo upload, auto-assign office)
app/api/reports/[id]/route.ts   PATCH {status} or {authorityId}; DELETE (admin; also deletes photo file)
app/api/reports/export/route.ts GET CSV (admin); also used as the admin password check
app/api/health/route.ts         GET db check -> {"ok":true} or 503
app/api/zones/route.ts          GET public zone shapes + office name/level (no emails)
app/api/zones/check/route.ts    GET admin: ?lat&lng&locality -> matched office + escalation chain
app/api/admin/routing/route.ts  GET admin: office list + each report's office
app/api/admin/digest/route.ts   GET admin: digest preview (sends nothing)
app/api/leaderboard/...         exists (NOT seen)
lib/supabaseClient.ts, reports.ts, photoStorage.ts, zones.ts, rateLimit.ts, digest.ts
types/index.ts                  types, constants, labels, colours, 20 localities
components/Map                  Leaflet map (NOT seen)
.github/workflows/keep-alive.yml, backup.yml
```
Note: there are THREE different route.ts files under app/api/reports (root, [id], export). Mix-ups have happened; always confirm the path.

## 7. Database (Supabase)
- `reports`: id (uuid), lat, lng, type, description, locality, photo, status, created_at, authority_id (-> authorities), authority_manual (bool; true when admin set the office by hand, so automatic changes must skip it). RLS on `reports` not yet confirmed.
- `authorities`: id, name, level (1 local, 2 waste operator, 3 district), email, whatsapp, parent_id (the office above), active. DUMMY data only (6 rows, example.com emails). `locality_routing`: locality -> authority_id (4 sample rows, placeholders). `zones`: id, name, authority_id, priority, geojson (jsonb), source. Currently EMPTY. `submission_log`: id, ip_hash, created_at (rate limiting). RLS enabled on all four with no public policy (server only).
- Types: WasteType household|construction|plastic|medical|other; ReportStatus reported|in_progress|resolved.
- Photos: public Storage bucket `report-photos`, file `{reportId}.jpg`, column holds the public URL. Older test reports still hold base64 text (UI shows both; CSV says "Old format (no link)").
- Database setup SQL lives only in Supabase (no .sql file in the repo).

## 8. Behaviour
- POST /api/reports: validates input (description max 500, locality max 100, photo string max 3,000,000 chars); rate limit BEFORE any upload: 15/hour and 30/day per hashed visitor IP (429 message; change numbers in lib/rateLimit.ts; fails open if the log table errors); photo must be a real JPEG up to 2 MB; office assigned by `resolveAuthority` (zone polygons first, higher priority wins; then locality_routing; else null = unassigned; failures never block the report); if the insert fails the uploaded photo is removed. DB/storage failures return 503 with friendly text.
- Homepage: welcome modal once per session, hero, stats, map, report panel, "Recent reports" shows 20 at a time with "Load more", lazy images, red banner with "Try again" if /api/reports fails. Footer has a green "WhatsApp us" button (wa.me link with prefilled text; the number is not shown as text, but is inside the link — owner accepts this). Same on leaderboard footer. Email shown: clean.my.city.pk@gmail.com.
- Admin: password in React state only; unlock verifies via export route (401 = incorrect, other = database unavailable), loads reports and office info, then opens. Per report: status dropdown, Office dropdown (saved as manual), red Delete with confirm; "N without an office" count and a filter; Download CSV (columns incl. Google Maps link, report link, Photo link).
- Digest preview (/admin/digest, admin password): per office, open reports oldest first; assigned office gets all open reports; still "Reported" after 3 days -> office above also; unresolved after 7 days -> district level too (constants in lib/digest.ts). Preview only, NO emails are sent.

## 9. Automation
keep-alive.yml: daily 06:00 UTC, curls the OLD address /api/health (prevents Supabase inactivity pause; failure emails the owner). backup.yml: Mondays 03:00 UTC, downloads the CSV with the ADMIN_PASSWORD secret, stores artifact `reports-backup` for 90 days (text + photo links; photo files themselves are NOT backed up). Both can run manually from the Actions tab. GitHub may disable schedules after ~60 days of repo inactivity; Node 20 / ubuntu-latest notices are harmless.

## 10. Planned: authority routing and escalation (partly built)
Built: tables, zone matching, auto-assign on submit, admin office dropdown, digest preview. NOT built: real zone boundaries, real offices/emails, sending emails, scheduled digests, map boundary layer.
- Rawalpindi 2026 delimitation (news, 19 Aug 2026; verify): Rawal Town 41 UCs, Potohar Town 33, Tehsil Saddar 22, Tehsil Cantt 29; 125 UCs in the city (was 82); four cantonment boards (Rawalpindi, Chaklala, Wah, Taxila) which are separate from the city.
- Boundaries must stay DATA in `zones` (swappable later). Plan: trace the main zones roughly with geojson.io and insert via SQL using `$$...$$::jsonb`; cantonments get higher priority. The only free national file (HDX, 2017) is outdated. Best source: official notification maps from the offices.
- Next steps: draw zones; one-off fill-in of office for old reports (skip authority_manual = true); "This site falls under..." on the report form; boundary outline layer on the map (needs components/Map); G2 test email to the owner only via a dedicated Gmail account (app password); G3 scheduled digests + escalation with owner approval before anything reaches a real official; one-click acknowledge link; notification log; WhatsApp only as click-to-chat links.

## 11. Free-plan limits (verify in dashboards: Supabase Project Settings > Usage; Vercel Usage)
Supabase free (as last found): 500 MB database, 1 GB file storage (one source says 500 MB), about 5 GB transfer/month, pauses after about a week of inactivity, no automatic backups I know of. Rough capacity: 100,000+ text reports, but only a few thousand photos (~250 KB each). When limits hit, data is not overwritten; writes/uploads fail. Vercel Hobby: non-commercial use only, usage caps (sources disagree on invocation counts), the site pauses instead of billing when exceeded.

## 12. Remaining launch checklist
Usage alerts on Supabase and Vercel; confirm/enable RLS on `reports`; delete old test reports (frees database space; export CSV first); privacy note on the site (location, photos, visitor limit); final live test. Later: admin login attempt limit, pagination at the API level, optional link to /admin/digest from admin, photo backups (monthly Supabase table export), real domain.

## 13. Files never seen (ask before touching related behaviour)
components/Map, app/layout.tsx, app/api/leaderboard route and its ranking logic, global CSS, next.config.js, tsconfig.json, .env.example, README.md.

## 14. How to work with this owner
- Owner is not a developer; uses free Claude with a tight message limit. Keep replies SHORT. One step at a time; wait for confirmation. Do not add background the owner did not ask for.
- Give COMPLETE replacement files for anything bigger than a tiny edit, with the exact path (three route.ts files!). For tiny edits give the exact block to find and replace; pasted fragments have caused stray characters before.
- Before every push: `npx tsc --noEmit`, `Remove-Item tsconfig.tsbuildinfo`, `npm run build` (must succeed). Then `git status`, `git add .`, `git commit -m "..."`, `git push`; wait for Vercel "Ready"; test live. Rollback: Vercel Deployments > Promote to Production.
- Local runs (`npm run dev`, http://localhost:3000) use the REAL Supabase project: use clearly labelled test reports and delete them. Locally all traffic counts as one visitor for rate limiting; clear it with `delete from submission_log;` after rate tests.
- If /api/reports says "Unauthorized", the wrong code (export route) was pasted into app/api/reports/route.ts.
- Never accept real secrets (service role key, admin password). Do not state prices, limits or laws from memory; check sources.