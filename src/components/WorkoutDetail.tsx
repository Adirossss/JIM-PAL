import { formatDateHe, formatKg, formatTotal, weekdayHe } from '../lib/format';
import { bestSet, setOneRepMax, summarizeWorkout, totalVolume } from '../lib/stats';
import { useApp } from '../state/AppContext';
import type { WorkoutExercise } from '../types';
import { BackButton, EmptyState, ExerciseTags, ExerciseTitle, Icon, ScreenHeader, useExercise } from './common';

export function WorkoutDetail({ workoutId }: { workoutId: string }) {
  const { data, update, goBack, navigate } = useApp();
  const workout = data.workouts.find((w) => w.id === workoutId);
  const back = <BackButton onClick={() => goBack({ name: 'history' })} />;

  if (!workout) {
    return (
      <div className="stack">
        <ScreenHeader start={back} title="אימון" />
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
      <ScreenHeader start={back} title={formatDateHe(workout.date)} subtitle={weekdayHe(workout.date)} />

      <section className="card card--tight">
        <div className="panel">
          <span className="muted small">נפח כולל</span>
          <span className="big-number">
            {formatTotal(s.volume)} <small>ק"ג</small>
          </span>
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <Stat label="תרגילים" value={String(s.exerciseCount)} />
          <Stat label="סטים" value={String(s.setCount)} />
          <Stat label="משך" value={minutes !== null && minutes >= 0 && minutes < 24 * 60 ? `${minutes} דק׳` : '—'} />
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

      <div className="finish-bar">
        <button type="button" className="btn btn--ghost btn--danger" onClick={remove}>
          מחק אימון
        </button>
      </div>
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
      <div className="entry__head">
        <div className="stack" style={{ gap: 6 }}>
          <ExerciseTitle exercise={exercise} />
          <ExerciseTags exercise={exercise} />
        </div>
        <button type="button" className="icon-btn icon-btn--panel" aria-label={`התקדמות ב${exercise.nameHe}`} onClick={onOpen}>
          <Icon name="chart" />
        </button>
      </div>
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
      <div className="kv">
        <span>נפח{best && ' · ★ הסט הטוב ביותר'}</span>
        <span>{formatTotal(totalVolume(entry.sets))} ק"ג</span>
      </div>
      {entry.note && <p className="note-text">{entry.note}</p>}
    </section>
  );
}
