# Jim-Pal — personal gym workout tracker

A mobile-first workout log with a Hebrew, right-to-left UI. Everything runs in the
browser: no backend, no accounts, no external APIs. Data is stored in the
browser's `localStorage`.

## Features

- **Exercise library** — 149 built-in exercises (machines, free weights, cables,
  bodyweight) across chest, back, shoulders, biceps, triceps, forearms, quads,
  hamstrings, glutes, calves and core. Search in Hebrew or English, filter by
  muscle group and equipment, and add your own custom exercises.
- **Workout logging** — start a workout (date defaults to today), add exercises,
  log sets (weight in kg with decimals, reps), edit or delete sets. A new set is
  pre-filled from the last logged set of that exercise, and "duplicate last set"
  adds an identical set in one tap. For bodyweight exercises the weight is the
  optional *added* load (e.g. a dip belt). Notes per exercise and per workout.
  An unfinished workout survives a page reload. A set can be marked as a
  **drop set**, and neighbouring exercises can be linked into a **superset**
  (after a set, the app jumps to the next exercise of the superset).
- **Faster starts** — favorite exercises, workout templates, "repeat a past
  workout", recently used exercises and "what else you did last time" suggestions.
- **Coaching** — a 🏆 celebration when a set beats the exercise's best estimated
  1RM, and a next-set recommendation (more weight after the top set was held
  twice, otherwise one more rep). Drop sets are ignored for both.
- **History & progress** — past workouts grouped by month, newest first; a
  finished workout can be edited. For each exercise: every past session, the
  best set, total volume (Σ weight × reps), the estimated 1RM (Epley:
  `weight × (1 + reps / 30)`), and an SVG chart of the best estimated 1RM over time.
- **This week** — workouts, sets and volume this week (Sunday to Saturday) with the
  change from last week, a weekly streak, and sets per muscle group.
- **Body weight & measurements** — log body weight and optional waist, chest and
  arm measurements, see each one charted over time with the change since the
  previous and the first measurement.
- **Backup** — export all data to a JSON file and import it back. Imports are
  fully validated; a malformed file is rejected without touching existing data.
  The home screen reminds you to back up after 3 new workouts, or after a week
  with new workouts (snooze: 3 days).
- **Updates** — every push to `main` is built and published to GitHub Pages by
  `.github/workflows/deploy.yml`. Each build writes `version.json`; the running
  app checks it on start, when it returns to the foreground and every 5 minutes,
  and offers a one-tap "עדכן עכשיו" banner when a newer build is live.

The UI uses the Heebo font, bundled in `src/fonts/` under the SIL Open Font License
(`src/fonts/OFL.txt`).

## Requirements

- [Node.js](https://nodejs.org/) **22.12 or newer** (the current LTS is fine) and npm.

## Install and run

```bash
npm install        # install dependencies
npm run dev        # start the dev server, then open http://localhost:5173
```

To open the app from a phone on the same Wi-Fi network:

```bash
npm run dev -- --host
```

Vite prints a `Network:` address (e.g. `http://192.168.1.20:5173`) — open it on the
phone. Note that data is stored per browser and per address, so the phone keeps
its own separate data.

### Other scripts

```bash
npm test           # run the unit tests once (Vitest)
npm run test:watch # run the tests in watch mode
npm run build      # type-check and build for production into dist/
npm run preview    # serve the production build locally
```

## How data is stored

- All data lives under a single `localStorage` key, `jim-pal:data`, as one JSON
  document with a `schemaVersion` field (currently `3`). Version 2 added
  `favoriteExerciseIds` and `templates`; version 3 added `bodyEntries` and the
  optional `drop` (set) and `supersetId` (exercise in a workout) fields. Older data
  (stored or imported) is upgraded automatically by the migrations in
  `src/lib/schema.ts`.
- `src/lib/storage.ts` is the only module that touches `localStorage`.
- Per-device settings live under their own keys and are not part of the backup:
  the light/dark choice (גיבוי → מראה: בהיר / כהה / לפי הטלפון, light by default) in
  `jim-pal:theme`, and the backup reminder's state in `jim-pal:lastBackupAt` and
  `jim-pal:backupSnoozedUntil`.
- If stored data can't be read, it is copied to a backup key
  (`jim-pal:data:unreadable:<timestamp>`) instead of being overwritten, and the app
  starts empty with a warning.
- Data is tied to one browser on one device. Clearing site data deletes it — use
  **גיבוי → ייצוא** (Backup → Export) regularly.

## Project structure

```
src/
  types.ts             domain types and Hebrew labels
  data/exercises.ts    seed exercise library
  lib/                 pure, UI-free logic (each file has a *.test.ts next to it)
    exercises.ts       search, filters, custom exercises
    stats.ts           volume, Epley 1RM, best set, records, weekly summary, progress series
    workout.ts         workout/set operations, supersets, pre-fill, recommendations, validation
    templates.ts       favorites and workout templates
    body.ts            body weight and measurements
    backup.ts          when to show the backup reminder
    theme.ts           light / dark / follow-the-phone
    schema.ts          schema version, migrations, import validation, export
    storage.ts         the localStorage data-access module
    format.ts          dates and number parsing/formatting
    chart.ts           axis math for the SVG charts
    route.ts           hash-based routes
    version.ts         comparing the running build with the published one
    ids.ts             ID generation
  state/               app state, persistence, navigation, theme, confirm sheets
  components/          React screens and components
```

## Dependencies

Runtime: `react`, `react-dom`. Development: `vite`, `typescript`, `vitest`,
`@types/react`, `@types/react-dom`. JSX is compiled by Vite's built-in esbuild,
without `@vitejs/plugin-react`, so editing a file during `npm run dev` reloads
the page instead of hot-swapping components.
