import { formatDateHe, formatKg, formatTotal, weekdayHe } from '../lib/format';
import { bestSet, personalRecordSetIds, setOneRepMax, summarizeWorkout, totalVolume } from '../lib/stats';
import { useState } from 'react';
import { createId } from '../lib/ids';
import { MAX_TEMPLATE_NAME } from '../lib/schema';
import { createTemplate } from '../lib/templates';
import { useApp } from '../state/AppContext';
import { useConfirm, usePrompt } from '../state/confirm';
import { MUSCLE_LABELS_HE, type WorkoutExercise } from '../types';
import { BackButton, EmptyState, ExerciseTags, ExerciseTitle, Icon, ScreenHeader, useExercise } from './common';

export function WorkoutDetail({ workoutId }: { workoutId: string }) {
  const { data, update, goBack, navigate, exerciseById } = useApp();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [savedTemplate, setSavedTemplate] = useState<string | null>(null);
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
  const records = personalRecordSetIds(data.workouts);
  const minutes = workout.finishedAt
    ? Math.round((Date.parse(workout.finishedAt) - Date.parse(workout.startedAt)) / 60_000)
    : null;

  const saveAsTemplate = async () => {
    const muscles = [
      ...new Set(
        workout.exercises.map((e) => {
          const m = exerciseById.get(e.exerciseId)?.primaryMuscle;
          return m ? MUSCLE_LABELS_HE[m] : 'אחר';
        }),
      ),
    ];
    const name = await prompt({
      title: 'שמירה כתבנית',
      message: `${s.exerciseCount} התרגילים של האימון יישמרו, בלי הסטים. בפעם הבאה הם ייכנסו בלחיצה אחת.`,
      label: 'שם התבנית',
      initial: `יום ${muscles.join(' ו')}`.slice(0, MAX_TEMPLATE_NAME),
      maxLength: MAX_TEMPLATE_NAME,
      confirmLabel: 'שמור תבנית',
    });
    if (!name) return;
    const result = createTemplate(name, workout, createId('tpl-'), new Date());
    if (!result.ok) return;
    update((d) => ({ ...d, templates: [...d.templates, result.template] }));
    setSavedTemplate(result.template.name);
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'למחוק את האימון?',
      message: 'האימון יימחק מההיסטוריה. אי אפשר לבטל את הפעולה.',
      confirmLabel: 'מחק אימון',
      danger: true,
    });
    if (!ok) return;
    update((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== workoutId) }));
    navigate({ name: 'history' }, { replace: true });
  };

  return (
    <div className="stack">
      <ScreenHeader
        start={back}
        title={formatDateHe(workout.date)}
        subtitle={weekdayHe(workout.date)}
        end={
          <button
            type="button"
            className="icon-btn"
            aria-label="ערוך אימון"
            onClick={() => navigate({ name: 'workoutEdit', workoutId: workout.id })}
          >
            <Icon name="note" />
          </button>
        }
      />

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
          records={records}
          onOpen={() => navigate({ name: 'exerciseDetail', exerciseId: entry.exerciseId })}
        />
      ))}

      {savedTemplate && (
        <div className="notice notice--success" role="status">
          התבנית "{savedTemplate}" נשמרה. היא מחכה לך במסך הבית, עם כפתור "התחל".
        </div>
      )}

      <button type="button" className="btn btn--secondary btn--large btn--block" onClick={saveAsTemplate}>
        <Icon name="bookmark" size={18} />
        שמור כתבנית
      </button>

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

function EntrySummary({
  entry,
  records,
  onOpen,
}: {
  entry: WorkoutExercise;
  records: ReadonlySet<string>;
  onOpen: () => void;
}) {
  const { exercise } = useExercise(entry.exerciseId);
  const best = bestSet(entry.sets);
  const bodyweight = exercise.equipment === 'bodyweight';
  const hasRecord = entry.sets.some((s) => records.has(s.id));

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
                {records.has(set.id) && (
                  <span className="pr-mark" role="img" aria-label="שיא חדש">
                    <Icon name="trophy" size={15} />
                  </span>
                )}
              </td>
              <td>{set.weight === null ? '—' : `${formatKg(set.weight)} ק"ג`}</td>
              <td>{set.reps}</td>
              <td>{setOneRepMax(set) > 0 ? formatKg(setOneRepMax(set)) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="kv">
        <span>
          נפח{best && ' · ★ הסט הטוב ביותר'}
          {hasRecord && (
            <>
              {' · '}
              <span className="pr-mark" aria-hidden="true">
                <Icon name="trophy" size={14} />
              </span>{' '}
              שיא חדש
            </>
          )}
        </span>
        <span>{formatTotal(totalVolume(entry.sets))} ק"ג</span>
      </div>
      {entry.note && <p className="note-text">{entry.note}</p>}
    </section>
  );
}
