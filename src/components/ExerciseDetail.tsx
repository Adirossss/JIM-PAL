import { useMemo } from 'react';
import { formatDateHe, formatKg, formatTotal, weekdayHe } from '../lib/format';
import { exerciseStats, oneRepMaxProgress, setOneRepMax } from '../lib/stats';
import { useApp } from '../state/AppContext';
import { MUSCLE_LABELS_HE } from '../types';
import { BackButton, EmptyState, ExerciseTags, ExerciseTitle, SetText, formatSet, useExercise } from './common';
import { ProgressChart } from './ProgressChart';
import { Stat } from './WorkoutDetail';

export function ExerciseDetail({ exerciseId }: { exerciseId: string }) {
  const { data, goBack, navigate } = useApp();
  const { exercise, known } = useExercise(exerciseId);
  const stats = useMemo(() => exerciseStats(data.workouts, exerciseId), [data.workouts, exerciseId]);
  const progress = useMemo(() => oneRepMaxProgress(data.workouts, exerciseId), [data.workouts, exerciseId]);
  const inActive = data.activeWorkout?.exercises.some((e) => e.exerciseId === exerciseId) ?? false;
  const best = stats.bestSet;

  return (
    <div className="stack">
      <BackButton onClick={() => goBack({ name: 'exercises' })} />

      <section className="card">
        <ExerciseTitle exercise={exercise} as="h2" />
        <ExerciseTags exercise={exercise} />
        {exercise.secondaryMuscles.length > 0 && (
          <p className="small muted">שרירים משניים: {exercise.secondaryMuscles.map((m) => MUSCLE_LABELS_HE[m]).join(', ')}</p>
        )}
        {!known && <p className="small muted">התרגיל לא נמצא בספרייה (ייתכן שהגיע מקובץ מיובא).</p>}
      </section>

      {stats.sessions.length === 0 ? (
        <EmptyState title="עוד אין אימונים עם התרגיל הזה">
          <p className="muted">
            {inActive ? 'הסטים מהאימון הפעיל יופיעו כאן אחרי שתסיים אותו.' : 'הוסף אותו לאימון כדי לראות התקדמות.'}
          </p>
        </EmptyState>
      ) : (
        <>
          <div className="stat-grid">
            {best && (
              <Stat
                label="הסט הטוב ביותר"
                value={formatSet(best, exercise.equipment)}
                sub={`${stats.bestSetDate ? formatDateHe(stats.bestSetDate) : ''}${
                  setOneRepMax(best) > 0 ? ` · 1RM משוער ${formatKg(setOneRepMax(best))} ק"ג` : ''
                }`}
              />
            )}
            <Stat label='נפח כולל (ק"ג)' value={formatTotal(stats.totalVolume)} sub="סכום משקל × חזרות" />
            <Stat label="אימונים" value={String(stats.sessions.length)} sub={`${stats.totalSets} סטים`} />
          </div>

          <section className="card">
            <h3>1RM משוער לאורך זמן</h3>
            <p className="small muted">הסט הטוב ביותר בכל אימון, לפי נוסחת Epley: משקל × (1 + חזרות / 30).</p>
            {progress.length > 0 ? (
              <ProgressChart key={exerciseId} points={progress} equipment={exercise.equipment} />
            ) : (
              <p className="muted">אין עדיין סטים עם משקל, אז אין מה להציג בגרף.</p>
            )}
          </section>

          {inActive && <p className="small muted">הסטים מהאימון הפעיל ייכללו אחרי שתסיים אותו.</p>}

          <h2 className="section-title">כל האימונים ({stats.sessions.length})</h2>
          {stats.sessions.map((s) => (
            <button
              key={s.workoutId}
              type="button"
              className="card card--link"
              onClick={() => navigate({ name: 'workoutDetail', workoutId: s.workoutId })}
            >
              <span className="headline">
                <span className="headline__date">
                  {weekdayHe(s.date)}, {formatDateHe(s.date)}
                </span>
                <span className="session-sets">
                  {s.sets.map((set) => (
                    <span key={set.id} className={`set-chip ${set === s.bestSet ? 'set-chip--best' : ''}`}>
                      <SetText set={set} equipment={exercise.equipment} />
                    </span>
                  ))}
                </span>
                <span className="headline__stats muted">
                  נפח {formatTotal(s.volume)} ק"ג
                  {s.bestOneRepMax > 0 && ` · 1RM משוער ${formatKg(s.bestOneRepMax)} ק"ג`}
                </span>
                {s.note && <span className="small muted">“{s.note}”</span>}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
