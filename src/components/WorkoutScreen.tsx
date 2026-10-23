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
import {
  addExercise,
  finishWorkout,
  setWorkoutDate,
  setWorkoutNote,
  startWorkout,
  startWorkoutFrom,
  startWorkoutWith,
  suggestNextExercises,
} from '../lib/workout';
import { sortTemplates } from '../lib/templates';
import { useApp } from '../state/AppContext';
import { useConfirm } from '../state/confirm';
import { MUSCLE_LABELS_HE, type Workout, type WorkoutTemplate } from '../types';
import { DateField, EmptyState, Icon, ScreenHeader, formatSet } from './common';
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
            <Templates
              onStart={(template) =>
                update((prev) => ({
                  ...prev,
                  activeWorkout: startWorkoutWith(template.exerciseIds, new Date(), isValidDateString(date) ? date : today),
                }))
              }
            />
            {lastWorkoutCard(last)}
            <RepeatWorkouts
              title="חזור על אימון קודם"
              onRepeat={(source) =>
                update((prev) => ({ ...prev, activeWorkout: startWorkoutFrom(source, new Date(), isValidDateString(date) ? date : today) }))
              }
            />
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

/** Saved templates, each with a "התחל" button; delete one with the trash button. */
function Templates({ onStart }: { onStart: (template: WorkoutTemplate) => void }) {
  const { data, update, exerciseById } = useApp();
  const confirm = useConfirm();
  const templates = sortTemplates(data.templates);
  if (templates.length === 0) return null;

  const remove = async (t: WorkoutTemplate) => {
    const ok = await confirm({
      title: `למחוק את התבנית "${t.name}"?`,
      message: 'האימונים שכבר עשית לא יימחקו.',
      confirmLabel: 'מחק תבנית',
      danger: true,
    });
    if (ok) update((d) => ({ ...d, templates: d.templates.filter((x) => x.id !== t.id) }));
  };

  return (
    <section className="stack" style={{ gap: 8 }} aria-label="התבניות שלי">
      <h3 className="section-title">התבניות שלי</h3>
      {templates.map((t) => {
        const names = t.exerciseIds.map((id) => exerciseById.get(id)?.nameHe ?? 'תרגיל לא מוכר');
        return (
          <div key={t.id} className="card" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <span className="headline">
                <span className="headline__date">{t.name}</span>
                <span className="headline__stats">{t.exerciseIds.length} תרגילים</span>
              </span>
              <div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                <button
                  type="button"
                  className="icon-btn icon-btn--panel icon-btn--danger"
                  aria-label={`מחק את התבנית ${t.name}`}
                  onClick={() => remove(t)}
                >
                  <Icon name="trash" size={18} />
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  aria-label={`התחל אימון מהתבנית ${t.name}`}
                  onClick={() => onStart(t)}
                >
                  התחל
                </button>
              </div>
            </div>
            <div className="session-sets" style={{ margin: 0 }}>
              {names.map((n, i) => (
                <span key={`${t.exerciseIds[i]}`} className="set-chip">
                  {n}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/** The last few workouts, each with a "חזור" button that starts a workout with the same exercises. */
function RepeatWorkouts({ title, onRepeat }: { title: string; onRepeat: (source: Workout) => void }) {
  const { data, exerciseById } = useApp();
  const today = toLocalDateString(new Date());
  const recent = sortWorkoutsNewestFirst(data.workouts).slice(0, 3);
  if (recent.length === 0) return null;

  return (
    <section className="card" aria-label={title} style={{ gap: 4 }}>
      <h3>{title}</h3>
      <div>
        {recent.map((w) => {
          const s = summarizeWorkout(w);
          const muscles = [
            ...new Set(
              w.exercises.map((e) => {
                const m = exerciseById.get(e.exerciseId)?.primaryMuscle;
                return m ? MUSCLE_LABELS_HE[m] : 'אחר';
              }),
            ),
          ];
          return (
            <div key={w.id} className="repeat-row">
              <span className="headline">
                <span style={{ fontWeight: 600 }}>
                  {relativeDayHe(w.date, today)} · {muscles.join(', ')}
                </span>
                <span className="headline__stats">
                  {s.exerciseCount} תרגילים · {s.setCount} סטים
                </span>
              </span>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                aria-label={`חזור על האימון מ-${formatDateHe(w.date)}`}
                onClick={() => onRepeat(w)}
              >
                חזור
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** "What else did you do last time?" — one tap adds the exercises that followed. */
function SuggestionsCard({ workout, onAdd }: { workout: Workout; onAdd: (exerciseIds: string[]) => void }) {
  const { data, exerciseById } = useApp();
  const suggestions = suggestNextExercises(workout, data.workouts);
  if (!suggestions) return null;
  const name = (id: string) => exerciseById.get(id)?.nameHe ?? 'תרגיל לא מוכר';

  return (
    <section className="card" aria-label="הצעות מהאימון הקודם">
      <div className="stack" style={{ gap: 2 }}>
        <h3>מה עוד היה בפעם הקודמת?</h3>
        <span className="small muted">
          {formatDateHe(suggestions.sourceDate)} · אחרי {name(suggestions.afterExerciseId)} עשית:
        </span>
      </div>
      {suggestions.items.map((item) => {
        const exercise = exerciseById.get(item.exerciseId);
        const lastSet = item.sets[item.sets.length - 1];
        return (
          <div key={item.exerciseId} className="suggest-row">
            <span className="suggest-row__text">
              <strong>{name(item.exerciseId)}</strong>
              <span>
                {item.sets.length} סטים
                {exercise && lastSet && (
                  <>
                    {' · '}
                    <bdi>{formatSet(lastSet, exercise.equipment)}</bdi>
                  </>
                )}
              </span>
            </span>
            <button
              type="button"
              className="icon-btn icon-btn--dark"
              aria-label={`הוסף ${name(item.exerciseId)}`}
              onClick={() => onAdd([item.exerciseId])}
            >
              <Icon name="plus" />
            </button>
          </div>
        );
      })}
      {suggestions.items.length > 1 && (
        <button
          type="button"
          className="btn btn--primary btn--large"
          onClick={() => onAdd(suggestions.items.map((i) => i.exerciseId))}
        >
          הוסף את כל {suggestions.items.length}
        </button>
      )}
    </section>
  );
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
  const { data, updateActive } = useApp();
  return <WorkoutEditor workout={workout} mode="active" history={data.workouts} onChange={updateActive} />;
}

/** Edits a finished workout with the same screen used while training. */
export function EditWorkout({ workoutId }: { workoutId: string }) {
  const { data, update } = useApp();
  const workout = data.workouts.find((w) => w.id === workoutId);
  const history = useMemo(() => data.workouts.filter((w) => w.id !== workoutId), [data.workouts, workoutId]);
  if (!workout) {
    return (
      <div className="stack">
        <EmptyState title="האימון לא נמצא" />
      </div>
    );
  }
  return (
    <WorkoutEditor
      workout={workout}
      mode="edit"
      history={history}
      onChange={(fn) => update((d) => ({ ...d, workouts: d.workouts.map((w) => (w.id === workoutId ? fn(w) : w)) }))}
    />
  );
}

interface EditorProps {
  workout: Workout;
  /** "active": the workout in progress. "edit": a finished workout from history. */
  mode: 'active' | 'edit';
  /** Finished workouts other than this one. */
  history: readonly Workout[];
  onChange: (fn: (workout: Workout) => Workout) => void;
}

function WorkoutEditor({ workout, mode, history, onChange }: EditorProps) {
  const { update, navigate, goBack, exerciseById } = useApp();
  const confirm = useConfirm();
  const editing = mode === 'edit';
  const [picking, setPicking] = useState(false);
  const [showDetails, setShowDetails] = useState(editing);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addedIds = useMemo(() => new Set(workout.exercises.map((e) => e.exerciseId)), [workout.exercises]);
  const summary = summarizeWorkout(workout);
  // The chosen exercise, else the most recently added one.
  const selected = workout.exercises.find((e) => e.id === selectedId) ?? workout.exercises.at(-1);
  const updateActive = onChange;

  /** Adds exercises in order and selects the first one added. */
  const addExercises = (exerciseIds: string[]) => {
    const entryIds = exerciseIds.map(() => createId());
    setError(null);
    onChange((w) => exerciseIds.reduce((acc, id, i) => addExercise(acc, id, () => entryIds[i]!), w));
    if (entryIds[0]) setSelectedId(entryIds[0]);
  };

  /** Leaves edit mode: exercises left without sets are dropped; an emptied workout can be deleted. */
  const doneEditing = async () => {
    const kept = workout.exercises.filter((e) => e.sets.length > 0);
    if (kept.length === 0) {
      const ok = await confirm({
        title: 'לא נשארו סטים באימון',
        message: 'למחוק את האימון מההיסטוריה?',
        confirmLabel: 'מחק אימון',
        cancelLabel: 'המשך לערוך',
        danger: true,
      });
      if (!ok) return;
      update((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== workout.id) }));
      navigate({ name: 'history' }, { replace: true });
      return;
    }
    if (kept.length !== workout.exercises.length) onChange((w) => ({ ...w, exercises: kept }));
    goBack({ name: 'workoutDetail', workoutId: workout.id });
  };

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
        title={editing ? 'עריכת אימון' : 'אימון פעיל'}
        subtitle={`${summary.setCount} סטים · נפח ${formatTotal(summary.volume)} ק"ג`}
        end={
          editing ? (
            <button type="button" className="btn btn--primary btn--small" onClick={doneEditing}>
              <Icon name="check" size={16} />
              סיום
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--small" onClick={finish}>
              <Icon name="check" size={16} />
              סיים
            </button>
          )
        }
      />

      {(showDetails || workout.note !== '') && (
        <section className="card" aria-label="פרטי האימון">
          {showDetails && (
            <div className="field">
              <span className="field__label">תאריך</span>
              <DateField
                label={editing ? 'תאריך האימון' : 'תאריך האימון הפעיל'}
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
          history={history}
          onChange={onChange}
          onRemoved={() => setSelectedId(null)}
        />
      ) : editing ? (
        <EmptyState title="אין תרגילים באימון">
          <button type="button" className="btn btn--primary" onClick={() => setPicking(true)}>
            <Icon name="plus" size={18} />
            הוסף תרגיל
          </button>
        </EmptyState>
      ) : (
        <>
          <EmptyState title="עוד לא הוספת תרגילים">
            <p className="muted small">בחר תרגיל מהספרייה כדי להתחיל לרשום סטים.</p>
            <button type="button" className="btn btn--primary" onClick={() => setPicking(true)}>
              <Icon name="plus" size={18} />
              הוסף תרגיל
            </button>
          </EmptyState>
          <Templates
            onStart={(template) =>
              updateActive((w) => ({
                ...w,
                exercises: startWorkoutWith(template.exerciseIds, new Date(w.startedAt), w.date).exercises,
              }))
            }
          />
          <RepeatWorkouts
            title="או התחל כמו אימון קודם"
            onRepeat={(source) =>
              updateActive((w) => ({ ...w, exercises: startWorkoutFrom(source, new Date(w.startedAt), w.date).exercises }))
            }
          />
        </>
      )}

      {!editing && <SuggestionsCard workout={workout} onAdd={addExercises} />}

      {!editing && (
        <div className="finish-bar">
          <button type="button" className="btn btn--ghost btn--danger" onClick={discard}>
            בטל אימון
          </button>
        </div>
      )}

      {picking && (
        <ExercisePicker
          markedIds={addedIds}
          onClose={() => setPicking(false)}
          onPick={(exercise) => {
            addExercises([exercise.id]);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
