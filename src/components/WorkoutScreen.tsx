import { useMemo, useState } from 'react';
import { formatDateHe, formatTotal, isValidDateString, toLocalDateString, weekdayHe } from '../lib/format';
import { summarizeWorkout, sortWorkoutsNewestFirst } from '../lib/stats';
import { addExercise, finishWorkout, setWorkoutDate, setWorkoutNote, startWorkout } from '../lib/workout';
import { useApp } from '../state/AppContext';
import type { Workout } from '../types';
import { ExerciseEntryCard } from './ExerciseEntryCard';
import { ExercisePicker } from './ExercisePicker';
import { EmptyState } from './common';

export function WorkoutScreen() {
  const { data } = useApp();
  return data.activeWorkout ? <ActiveWorkout workout={data.activeWorkout} /> : <StartWorkout />;
}

function StartWorkout() {
  const { data, update, navigate } = useApp();
  const [date, setDate] = useState(() => toLocalDateString(new Date()));
  const last = sortWorkoutsNewestFirst(data.workouts)[0];

  const start = () => {
    const d = isValidDateString(date) ? date : toLocalDateString(new Date());
    update((prev) => ({ ...prev, activeWorkout: startWorkout(new Date(), d) }));
  };

  return (
    <div className="stack">
      <section className="card hero">
        <h2>אימון חדש</h2>
        <label className="field">
          <span className="field__label">תאריך</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button type="button" className="btn btn--primary btn--large btn--block" onClick={start}>
          התחל אימון
        </button>
      </section>

      {last && (
        <button
          type="button"
          className="card card--link"
          onClick={() => navigate({ name: 'workoutDetail', workoutId: last.id })}
        >
          <span className="muted">האימון האחרון</span>
          <WorkoutHeadline workout={last} />
        </button>
      )}
    </div>
  );
}

export function WorkoutHeadline({ workout }: { workout: Workout }) {
  const { exerciseById } = useApp();
  const s = summarizeWorkout(workout);
  const names = workout.exercises.map((e) => exerciseById.get(e.exerciseId)?.nameHe ?? 'תרגיל לא מוכר');
  return (
    <span className="headline">
      <span className="headline__date">
        {weekdayHe(workout.date)}, {formatDateHe(workout.date)}
      </span>
      <span className="headline__stats">
        {s.exerciseCount} תרגילים · {s.setCount} סטים · נפח {formatTotal(s.volume)} ק"ג
      </span>
      {names.length > 0 && <span className="headline__names muted">{names.join(' · ')}</span>}
    </span>
  );
}

function ActiveWorkout({ workout }: { workout: Workout }) {
  const { data, update, updateActive, navigate } = useApp();
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addedIds = useMemo(() => new Set(workout.exercises.map((e) => e.exerciseId)), [workout.exercises]);
  const summary = summarizeWorkout(workout);

  const finish = () => {
    const result = finishWorkout(workout, new Date());
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const empty = workout.exercises.length - result.workout.exercises.length;
    const question =
      empty > 0
        ? `לסיים את האימון? ${empty} תרגילים בלי סטים לא יישמרו.`
        : 'לסיים את האימון ולשמור אותו בהיסטוריה?';
    if (!window.confirm(question)) return;
    update((d) => ({ ...d, workouts: [...d.workouts, result.workout], activeWorkout: null }));
    navigate({ name: 'workoutDetail', workoutId: result.workout.id });
  };

  const discard = () => {
    const msg =
      summary.setCount > 0
        ? `לבטל את האימון? ${summary.setCount} הסטים שנרשמו יימחקו ולא יישמרו בהיסטוריה.`
        : 'לבטל את האימון?';
    if (window.confirm(msg)) update((d) => ({ ...d, activeWorkout: null }));
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="active-header">
          <h2>אימון פעיל</h2>
          <span className="muted">
            {summary.setCount} סטים · נפח {formatTotal(summary.volume)} ק"ג
          </span>
        </div>
        <label className="field">
          <span className="field__label">תאריך</span>
          <input
            type="date"
            className="input"
            value={workout.date}
            onChange={(e) => {
              if (isValidDateString(e.target.value)) updateActive((w) => setWorkoutDate(w, e.target.value));
            }}
          />
        </label>
        <label className="field">
          <span className="field__label">הערה לאימון</span>
          <textarea
            className="input note"
            rows={2}
            placeholder="איך הרגשת, מה לשפר…"
            value={workout.note}
            onChange={(e) => updateActive((w) => setWorkoutNote(w, e.target.value))}
          />
        </label>
      </section>

      {workout.exercises.length === 0 ? (
        <EmptyState title="עוד לא הוספת תרגילים">
          <p className="muted">הוסף תרגיל מהספרייה כדי להתחיל לרשום סטים.</p>
        </EmptyState>
      ) : (
        workout.exercises.map((entry, i) => (
          <ExerciseEntryCard key={entry.id} workout={workout} entry={entry} index={i} />
        ))
      )}

      <button type="button" className="btn btn--secondary btn--large btn--block" onClick={() => setPicking(true)}>
        + הוסף תרגיל
      </button>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="finish-bar">
        <button type="button" className="btn btn--primary btn--large" onClick={finish}>
          ✓ סיים אימון
        </button>
        <button type="button" className="btn btn--ghost btn--danger" onClick={discard}>
          בטל אימון
        </button>
      </div>

      {picking && (
        <ExercisePicker
          markedIds={addedIds}
          onClose={() => setPicking(false)}
          onPick={(exercise) => {
            setError(null);
            updateActive((w) => addExercise(w, exercise.id));
            setPicking(false);
            // Let the new card render, then bring it into view.
            requestAnimationFrame(() =>
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
            );
          }}
        />
      )}
      {data.workouts.length === 0 && workout.exercises.length > 0 && (
        <p className="muted center small">טיפ: “שכפל סט אחרון” מוסיף בלחיצה אחת סט זהה לקודם.</p>
      )}
    </div>
  );
}
