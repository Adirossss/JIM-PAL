import { useEffect, useMemo, useState } from 'react';
import {
  formatDateHe,
  formatKg,
  formatTotal,
  isValidDateString,
  relativeDayHe,
  toLocalDateString,
  weekdayHe,
} from '../lib/format';
import { createId } from '../lib/ids';
import {
  countWorkoutsThisWeek,
  percentChange,
  recentHighlights,
  recentVolumes,
  recentlyUsedExerciseIds,
  sortWorkoutsNewestFirst,
  summarizeWorkout,
} from '../lib/stats';
import { addExercise, finishWorkout, setWorkoutDate, setWorkoutNote, startWorkout } from '../lib/workout';
import { useApp } from '../state/AppContext';
import { useConfirm } from '../state/confirm';
import { MUSCLE_LABELS_HE, type Workout } from '../types';
import { DateField, EmptyState, Icon, ScreenHeader } from './common';
import { ExerciseEntryCard } from './ExerciseEntryCard';
import { ExercisePicker } from './ExercisePicker';

export function WorkoutScreen() {
  const { data } = useApp();
  return data.activeWorkout ? <ActiveWorkout workout={data.activeWorkout} /> : <Home />;
}

function Home() {
  const { data, update, navigate, exerciseById } = useApp();
  const today = toLocalDateString(new Date());
  const [date, setDate] = useState(today);
  const last = sortWorkoutsNewestFirst(data.workouts)[0];
  const weekCount = countWorkoutsThisWeek(data.workouts, today);

  const start = () => {
    const d = isValidDateString(date) ? date : today;
    update((prev) => ({ ...prev, activeWorkout: startWorkout(new Date(), d) }));
  };

  return (
    <div className="stack">
      <ScreenHeader
        start={
          <span className="logo-mark" aria-hidden="true">
            <Icon name="dumbbell" />
          </span>
        }
        title={<span className="brand-word">JIM-PAL</span>}
        end={
          <button type="button" className="icon-btn" aria-label="גיבוי" onClick={() => navigate({ name: 'data' })}>
            <Icon name="backup" />
          </button>
        }
      />

      <div className="hero-text">
        <h1>מוכן לאימון?</h1>
        <p className="muted small">
          {weekdayHe(today)}, {formatDateHe(today)}
          {weekCount > 0 && ` · ${weekCount} אימונים השבוע`}
        </p>
      </div>

      <div className="pill-bar">
        <DateField className="date-pill" label="תאריך האימון" value={date} onChange={setDate} />
        <button type="button" className="btn btn--primary" onClick={start} style={{ flex: '0 0 auto' }}>
          <Icon name="dumbbell" size={18} />
          התחל אימון
        </button>
      </div>

      <section className="sheet" aria-label="סיכום">
        {last ? (
          <>
            {recentExerciseChips(recentlyUsedExerciseIds(data.workouts).slice(0, 8))}
            {lastWorkoutCard(last)}
            {highlights()}
          </>
        ) : (
          <EmptyState title="עוד אין אימונים">
            <p className="muted small">אחרי שתסיים את האימון הראשון, יופיעו כאן הנפח, השיאים וההתקדמות.</p>
          </EmptyState>
        )}
      </section>
    </div>
  );

  function recentExerciseChips(ids: string[]) {
    if (ids.length === 0) return null;
    return (
      <div className="chips chips--scroll" aria-label="תרגילים אחרונים">
        {ids.map((id, i) => (
          <button
            key={id}
            type="button"
            className={`chip ${i === 0 ? 'chip--on' : 'chip--surface'}`}
            onClick={() => navigate({ name: 'exerciseDetail', exerciseId: id })}
          >
            {exerciseById.get(id)?.nameHe ?? 'תרגיל לא מוכר'}
          </button>
        ))}
      </div>
    );
  }

  function lastWorkoutCard(workout: Workout) {
    const volumes = recentVolumes(data.workouts, 6);
    const max = Math.max(...volumes.map((v) => v.volume), 1);
    const s = summarizeWorkout(workout);
    const previous = volumes[volumes.length - 2];
    const change = previous ? percentChange(previous.volume, s.volume) : null;
    const muscles = [
      ...new Set(
        workout.exercises.map((e) => {
          const m = exerciseById.get(e.exerciseId)?.primaryMuscle;
          return m ? MUSCLE_LABELS_HE[m] : 'אחר';
        }),
      ),
    ];

    return (
      <div className="card card--tight">
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="hero-text" style={{ gap: 2 }}>
              <span className="muted small">נפח כולל באימון האחרון</span>
              <span className="big-number">
                {formatTotal(s.volume)} <small>ק"ג</small>
              </span>
            </div>
            {change !== null && (
              <span className={`badge ${change >= 0 ? 'badge--accent' : ''}`}>
                <bdi>{change > 0 ? `+${change}%` : `${change}%`}</bdi>&nbsp;מהקודם
              </span>
            )}
          </div>
          {volumes.length > 1 && (
            <div className="bars" aria-hidden="true" style={{ direction: 'ltr' }}>
              {volumes.map((v, i) => (
                <div
                  key={v.workoutId}
                  className={`bars__bar ${i === volumes.length - 1 ? 'bars__bar--accent' : ''}`}
                  style={{ height: `${Math.max(8, (v.volume / max) * 100)}%` }}
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="card-row-link"
          onClick={() => navigate({ name: 'workoutDetail', workoutId: workout.id })}
        >
          <span className="headline">
            <span className="headline__date">{muscles.join(', ')}</span>
            <span className="headline__stats">
              {relativeDayHe(workout.date, today)} · {s.exerciseCount} תרגילים · {s.setCount} סטים
            </span>
          </span>
          <span className="go-circle" aria-hidden="true">
            <Icon name="go" size={18} />
          </span>
        </button>
      </div>
    );
  }

  function highlights() {
    const items = recentHighlights(data.workouts, 2);
    if (items.length === 0) return null;
    return (
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {items.map((h) => (
          <button
            key={h.exerciseId}
            type="button"
            className="stat card--link"
            onClick={() => navigate({ name: 'exerciseDetail', exerciseId: h.exerciseId })}
          >
            <span className="stat__label">{exerciseById.get(h.exerciseId)?.nameHe ?? 'תרגיל לא מוכר'}</span>
            <span className="stat__value">
              {formatKg(h.bestOneRepMax)} <small className="muted small">1RM משוער</small>
            </span>
          </button>
        ))}
      </div>
    );
  }
}

/** Headline used by the history list. */
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
      {names.length > 0 && <span className="headline__names">{names.join(' · ')}</span>}
    </span>
  );
}

function ActiveWorkout({ workout }: { workout: Workout }) {
  const { update, updateActive, navigate, exerciseById } = useApp();
  const confirm = useConfirm();
  const [picking, setPicking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addedIds = useMemo(() => new Set(workout.exercises.map((e) => e.exerciseId)), [workout.exercises]);
  const summary = summarizeWorkout(workout);
  // The chosen exercise, else the most recently added one.
  const selected = workout.exercises.find((e) => e.id === selectedId) ?? workout.exercises.at(-1);

  // Keep the selected chip visible in the horizontally scrolling row.
  useEffect(() => {
    document
      .querySelector('[role="tab"][aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selected?.id]);

  const finish = async () => {
    const result = finishWorkout(workout, new Date());
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const empty = workout.exercises.length - result.workout.exercises.length;
    const ok = await confirm({
      title: 'לסיים את האימון?',
      message:
        empty > 0
          ? `${empty} תרגילים בלי סטים לא יישמרו. השאר יישמר בהיסטוריה.`
          : `${summary.setCount} סטים · נפח ${formatTotal(summary.volume)} ק"ג יישמרו בהיסטוריה.`,
      confirmLabel: 'סיים ושמור',
      cancelLabel: 'המשך להתאמן',
    });
    if (!ok) return;
    update((d) => ({ ...d, workouts: [...d.workouts, result.workout], activeWorkout: null }));
    navigate({ name: 'workoutDetail', workoutId: result.workout.id });
  };

  const discard = async () => {
    const ok = await confirm({
      title: 'לבטל את האימון?',
      message:
        summary.setCount > 0 ? `${summary.setCount} הסטים שנרשמו יימחקו ולא יישמרו בהיסטוריה.` : undefined,
      confirmLabel: 'בטל אימון',
      cancelLabel: 'חזור לאימון',
      danger: true,
    });
    if (ok) update((d) => ({ ...d, activeWorkout: null }));
  };

  return (
    <div className="stack">
      <ScreenHeader
        start={
          <button
            type="button"
            className={`icon-btn ${showDetails ? 'icon-btn--dark' : ''}`}
            aria-label="תאריך והערה לאימון"
            aria-expanded={showDetails}
            onClick={() => setShowDetails((v) => !v)}
          >
            <Icon name="note" />
          </button>
        }
        title="אימון פעיל"
        subtitle={`${summary.setCount} סטים · נפח ${formatTotal(summary.volume)} ק"ג`}
        end={
          <button type="button" className="btn btn--primary btn--small" onClick={finish}>
            <Icon name="check" size={16} />
            סיים
          </button>
        }
      />

      {(showDetails || workout.note !== '') && (
        <section className="card" aria-label="פרטי האימון">
          {showDetails && (
            <div className="field">
              <span className="field__label">תאריך</span>
              <DateField
                label="תאריך האימון הפעיל"
                value={workout.date}
                onChange={(value) => {
                  if (isValidDateString(value)) updateActive((w) => setWorkoutDate(w, value));
                }}
              />
            </div>
          )}
          <label className="field">
            <span className="field__label">הערה לאימון</span>
            <textarea
              className="input"
              rows={2}
              placeholder="איך הרגשת, מה לשפר…"
              value={workout.note}
              onChange={(e) => updateActive((w) => setWorkoutNote(w, e.target.value))}
            />
          </label>
        </section>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="chips chips--scroll" role="tablist" aria-label="תרגילים באימון">
        <button type="button" className="chip chip--icon" aria-label="הוסף תרגיל" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} />
        </button>
        {workout.exercises.map((e) => {
          const on = e.id === selected?.id;
          return (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`chip ${on ? 'chip--on' : 'chip--surface'}`}
              onClick={() => setSelectedId(e.id)}
            >
              {e.sets.length > 0 && !on && <span className="chip__dot" aria-hidden="true" />}
              {exerciseById.get(e.exerciseId)?.nameHe ?? 'תרגיל לא מוכר'}
            </button>
          );
        })}
      </div>

      {selected ? (
        <ExerciseEntryCard
          key={selected.id}
          workout={workout}
          entry={selected}
          index={workout.exercises.indexOf(selected)}
          onRemoved={() => setSelectedId(null)}
        />
      ) : (
        <EmptyState title="עוד לא הוספת תרגילים">
          <p className="muted small">בחר תרגיל מהספרייה כדי להתחיל לרשום סטים.</p>
          <button type="button" className="btn btn--primary" onClick={() => setPicking(true)}>
            <Icon name="plus" size={18} />
            הוסף תרגיל
          </button>
        </EmptyState>
      )}

      <div className="finish-bar">
        <button type="button" className="btn btn--ghost btn--danger" onClick={discard}>
          בטל אימון
        </button>
      </div>

      {picking && (
        <ExercisePicker
          markedIds={addedIds}
          onClose={() => setPicking(false)}
          onPick={(exercise) => {
            const entryId = createId();
            setError(null);
            updateActive((w) => addExercise(w, exercise.id, () => entryId));
            setSelectedId(entryId);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
