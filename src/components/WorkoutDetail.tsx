import { formatDateHe, formatKg, formatTotal, weekdayHe } from '../lib/format';
import { bestSet, setOneRepMax, summarizeWorkout, totalVolume } from '../lib/stats';
import { useApp } from '../state/AppContext';
import type { WorkoutExercise } from '../types';
import { BackButton, EmptyState, ExerciseTags, ExerciseTitle, useExercise } from './common';

export function WorkoutDetail({ workoutId }: { workoutId: string }) {
  const { data, update, goBack, navigate } = useApp();
  const workout = data.workouts.find((w) => w.id === workoutId);

  if (!workout) {
    return (
      <div className="stack">
        <BackButton onClick={() => goBack({ name: 'history' })} />
        <EmptyState title="האימון לא נמצא" />
      </div>
    );
  }

  const s = summarizeWorkout(workout);
  const minutes = workout.finishedAt
    ? Math.round((Date.parse(workout.finishedAt) - Date.parse(workout.startedAt)) / 60_000)
    : null;

  const remove = () => {
    if (!window.confirm('למחוק את האימון הזה מההיסטוריה? אי אפשר לבטל את הפעולה.')) return;
    update((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== workoutId) }));
    navigate({ name: 'history' }, { replace: true });
  };

  return (
    <div className="stack">
      <BackButton onClick={() => goBack({ name: 'history' })} />
      <section className="card">
        <h2>
          {weekdayHe(workout.date)}, {formatDateHe(workout.date)}
        </h2>
        <div className="stat-grid">
          <Stat label="תרגילים" value={String(s.exerciseCount)} />
          <Stat label="סטים" value={String(s.setCount)} />
          <Stat label='נפח כולל (ק"ג)' value={formatTotal(s.volume)} />
          {minutes !== null && minutes >= 0 && minutes < 24 * 60 && <Stat label="משך" value={`${minutes} דק׳`} />}
        </div>
        {workout.note && <p className="note-text">{workout.note}</p>}
      </section>

      {workout.exercises.map((entry) => (
        <EntrySummary
          key={entry.id}
          entry={entry}
          onOpen={() => navigate({ name: 'exerciseDetail', exerciseId: entry.exerciseId })}
        />
      ))}

      <button type="button" className="btn btn--ghost btn--danger" onClick={remove}>
        מחק אימון
      </button>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {sub && <span className="stat__sub">{sub}</span>}
    </div>
  );
}

function EntrySummary({ entry, onOpen }: { entry: WorkoutExercise; onOpen: () => void }) {
  const { exercise } = useExercise(entry.exerciseId);
  const best = bestSet(entry.sets);
  const bodyweight = exercise.equipment === 'bodyweight';

  return (
    <section className="card">
      <button type="button" className="card-head-btn" onClick={onOpen}>
        <ExerciseTitle exercise={exercise} />
        <span className="small" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          התקדמות ←
        </span>
      </button>
      <ExerciseTags exercise={exercise} />
      <table className="table">
        <thead>
          <tr>
            <th>סט</th>
            <th>{bodyweight ? 'תוספת משקל' : 'משקל'}</th>
            <th>חזרות</th>
            <th>1RM משוער</th>
          </tr>
        </thead>
        <tbody>
          {entry.sets.map((set, i) => (
            <tr key={set.id} className={set === best ? 'best-row' : undefined}>
              <td>
                {i + 1}
                {set === best && ' ★'}
              </td>
              <td>{set.weight === null ? '—' : `${formatKg(set.weight)} ק"ג`}</td>
              <td>{set.reps}</td>
              <td>{setOneRepMax(set) > 0 ? formatKg(setOneRepMax(set)) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted">
        נפח: {formatTotal(totalVolume(entry.sets))} ק"ג{best && ' · ★ הסט הטוב ביותר'}
      </p>
      {entry.note && <p className="note-text">{entry.note}</p>}
    </section>
  );
}
