# Jim-Pal — Implementation Plan

Personal gym workout tracker. React + TypeScript + Vite, localStorage only, Hebrew RTL UI, mobile-first.

## Architecture

```
src/
  types.ts              Shared domain types (Exercise, Workout, SetEntry, AppData…)
  data/exercises.ts     Seed exercise library (≥120 entries)
  lib/                  Pure, UI-free logic (unit-tested with vitest)
    ids.ts              ID generation
    format.ts           Number parsing (kg with "," or "."), date helpers (local YYYY-MM-DD)
    exercises.ts        Search (Hebrew/English), filters, merge seed + custom, custom-exercise creation
    stats.ts            Volume, Epley 1RM, best set, per-exercise history, progress series, date grouping
    workout.ts          Immutable workout operations (start, add exercise, add/edit/delete/duplicate set, notes, finish)
    schema.ts           Schema version, migrations, import validation, export serialization
    storage.ts          The single data-access module (localStorage, injectable Storage for tests)
    chart.ts            Axis math for the SVG progress chart
    route.ts            Hash routes (no router dependency)
  state/AppContext.tsx  App state: loads once before render, persists on every change, navigation
  components/…          UI (views + small components)
  App.tsx, main.tsx, styles.css
```

### Stored data (schema v1)
One localStorage key `jim-pal:data` holding:
```ts
{
  schemaVersion: 1,
  customExercises: Exercise[],
  workouts: Workout[],          // finished workouts
  activeWorkout: Workout | null // unfinished workout, survives reload
}
```
`Workout = { id, date: "YYYY-MM-DD", startedAt, finishedAt|null, note, exercises: WorkoutExercise[] }`
`WorkoutExercise = { id, exerciseId, note, sets: SetEntry[] }`
`SetEntry = { id, weight: number|null, reps: number }` (`weight: null` = bodyweight without added load)

## Steps

1. **Scaffold**: package.json, tsconfig, vite + vitest config, index.html (`lang="he" dir="rtl"`), minimal App. Check: `npm install`, `npm run build`, `npm test`.
2. **Types + exercise library**: `types.ts`, `data/exercises.ts` (≥120, all 11 muscle groups, all 4 equipment types), `lib/exercises.ts` (search/filter/merge/custom). Tests: seed integrity, search in both languages, filters.
3. **Stats logic**: `lib/stats.ts`, `lib/format.ts`. Volume, Epley 1RM, best set, per-exercise sessions, progress series, month grouping. Tests.
4. **Workout operations**: `lib/workout.ts` incl. pre-fill from last logged set and duplicate-last-set. Tests.
5. **Schema + storage**: `lib/schema.ts` (version, migrations, validation, export), `lib/storage.ts` (data-access module). Tests incl. malformed import rejection and corrupt-storage handling.
6. **UI: app shell + logging**: state hook, bottom tab navigation, start workout (date picker), exercise picker (search + filters), set logging, notes, finish/discard.
7. **UI: history + progress**: history list grouped by month (newest first), workout detail, exercise progress view (sessions, best set, total volume, SVG 1RM chart).
8. **UI: library + custom exercises + data**: library browser, custom exercise form, export/import JSON.
9. **Docs + final verification**: README.md, `npm run build`, `npm test`, dev-server smoke test.

Each step ends with `npm run build` + `npm test`.
