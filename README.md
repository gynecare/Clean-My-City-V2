# Clean My City

A community tool for reporting waste sites around Rawalpindi on a map.

## Running it locally

1. Copy `.env.example` to `.env.local` and fill in your Supabase project's URL
   and service role key (see "Database setup" below).
2. Install and run:

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Click anywhere on the map (or tap "Use my current location"), fill in the waste type
and a short description, optionally attach a photo, and send the report. It's saved
in your Supabase database and shown to everyone who loads the page.

## Database setup (Supabase — free)

1. Create a free account and project at https://supabase.com.
2. In the Supabase dashboard, open the SQL Editor and run:

```sql
create table reports (
  id uuid primary key,
  lat double precision not null,
  lng double precision not null,
  type text not null,
  description text not null,
  photo text,
  created_at timestamptz not null default now()
);
```

3. Go to Project Settings → API. Copy the "Project URL" and the "service_role"
   secret key (not the "anon" key) into your `.env.local` file.

The service role key is powerful — it bypasses all access rules — so it's only
ever used on the server (inside `app/api/reports/route.ts` and `lib/reports.ts`),
never sent to the browser. Keep it out of git; `.env.local` is already gitignored.

## How the backend works

- `app/api/reports/route.ts` exposes `GET /api/reports` (list all reports) and
  `POST /api/reports` (create one).
- `lib/reports.ts` reads and writes rows in the Supabase `reports` table.
- Photos are stored as base64 data URLs directly inside each report row, capped at
  ~6MB per photo. For a bigger project, moving photos to object storage (Supabase
  Storage, S3, Cloudinary) instead of inline base64 keeps the database small.

## Deploying it for free (Vercel)

1. Push this project to a GitHub repository.
2. Create a free account at https://vercel.com and import that repository.
3. In the Vercel project's Settings → Environment Variables, add the same
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` values from your `.env.local`.
4. Deploy. Vercel gives you a public `https://your-project.vercel.app` address.

## Project structure

```
app/
  layout.tsx          root layout, loads Leaflet CSS + fonts
  page.tsx             the whole UI: map, report form, reports list
  globals.css          design system (civic/stamp look)
  api/reports/route.ts backend: GET + POST for reports
components/
  Map.tsx              Leaflet map (client-only, dynamically imported)
lib/
  reports.ts           reads/writes the Supabase "reports" table
  supabaseClient.ts     server-only Supabase client
types.ts               shared TypeScript types
```
