# TCF MQI Survey App

Mobile-first web app for TCF Admin & Support Managers to run Maintenance
Quality Index (MQI) inspections on school campuses. Two inspection methods,
live score calculation, Google Sheets as the data store, plus a dashboard for
tracking rollout across the school network.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Google Sheets
credentials configured, the app runs fully against local mock data (schools,
dashboard) so every screen is clickable out of the box.

## Wiring up Google Sheets

Copy `.env.local.example` to `.env.local` and fill in:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` — a service account
  with Editor access on the MQI spreadsheet and the Drive photos folder.
- `MQI_SPREADSHEET_ID` — the spreadsheet responses/exports read and write to.
- `SCHOOLS_SPREADSHEET_ID` / `SCHOOLS_SHEET_TAB` — the campus list source
  (Region/Area/Campus/School ID columns, matched by header name).
- `MQI_PHOTOS_DRIVE_FOLDER_ID` — root Drive folder for survey photos.

**Before going live**, confirm the exact tab names on the real spreadsheet —
`METHOD1_RESPONSE_TAB`, `METHOD2_RESPONSE_TAB`, `ATTACHMENTS_TAB` env vars
override the defaults in `src/lib/sheets/responses.ts` if they differ.

## Project layout

- `src/lib/data/` — hardcoded rubric constants (Method 1 items, Method 2
  groups, location mappings, bilingual copy) — the source of truth is
  `01-data-and-scoring.md` from the build brief.
- `src/lib/scoring.ts` — the renormalizing weighted-average scoring engine.
- `src/lib/sheets/` — server-only Google Sheets/Drive integration.
- `src/lib/survey-context.tsx` — client-side wizard state for the survey flow.
- `src/app/survey/` — the Method 1 / Method 2 survey screens.
- `src/app/dashboard/` — the schools-captured dashboard.
- `src/app/api/export/` — Excel export endpoints (all responses, single
  survey with live formulas).

## Tech stack

Next.js (App Router) + TypeScript + Tailwind, `googleapis` for Sheets/Drive,
`exceljs` for formula-driven Excel export, deployed on Vercel.
