import { useMemo } from 'react';
import { formatDateHe, formatKg, formatTotal, weekdayHe } from '../lib/format';
import { exerciseStats, oneRepMaxProgress, percentChange, setOneRepMax } from '../lib/stats';
import { addExercise, startWorkout } from '../lib/workout';
import { useApp } from '../state/AppContext';
import { MUSCLE_LABELS_HE } from '../types';
import {
  BackButton,
  EmptyState,
  ExerciseTags,
  ExerciseTitle,
  FavoriteButton,
  ScreenHeader,
  SetText,
  formatSet,
  useExercise,
} from './common';
import { ProgressChart } from './ProgressChart';

export function ExerciseDetail({ exerciseId }: { exerciseId: string }) {
  const { data, update, goBack, navigate } = useApp();
  const { exercise, known } = useExercise(exerciseId);
  const stats = useMemo(() => exerciseStats(data.workouts, exerciseId), [data.workouts, exerciseId]);
  const progress = useMemo(() => oneRepMaxProgress(data.workouts, exerciseId), [data.workouts, exerciseId]);
  const inActive = data.activeWorkout?.exercises.some((e) => e.exerciseId === exerciseId) ?? false;
  const best = stats.bestSet;
  const bestOneRepMax = best ? setOneRepMax(best) : 0;
  const first = progress[0];
  const latest = progress.at(-1);
  const improvement = first && latest && progress.length > 1 ? percentChange(first.oneRepMax, latest.oneRepMax) : null;

  const addToWorkout = () => {
    update((d) => {
      const workout = d.activeWorkout ?? startWorkout(new Date());
      return { ...d, activeWorkout: addExercise(workout, exerciseId) };
    });
    navigate({ name: 'workout' });
  };

  return (
    <div className="stack" style={{ gap: 0 }}>
      <div className="progress-hero">
        <ScreenHeader
          start={<BackButton onClick={() => goBack({ name: 'exercises' })} />}
          title="התקדמות"
          end={<FavoriteButton exerciseId={exerciseId} name={exercise.nameHe} />}
        />
        <div className="hero-text">
          <span className="small" style={{ color: 'var(--muted)' }}>
            1RM משוער · {exercise.nameHe}
          </span>
          <span className="big-number">
            {bestOneRepMax > 0 ? formatKg(bestOneRepMax) : '—'} <small>ק"ג</small>
          </span>
        </div>
        {progress.length > 0 ? (
          <ProgressChart key={exerciseId} points={progress} equipment={exercise.equipment} />
        ) : (
          <p className="muted small" style={{ paddingBottom: 24 }}>
            {stats.sessions.length > 0
              ? 'אין עדיין סטים עם משקל, אז אין מה להציג בגרף.'
              : 'הגרף יופיע אחרי האימון הראשון עם התרגיל.'}
          </p>
        )}
      </div>

      <div className="progress-sheet">
        <span className="progress-sheet__grip" aria-hidden="true" />

        <div className="stack" style={{ gap: 6, padding: '4px 6px' }}>
          <ExerciseTitle exercise={exercise} as="h1" />
          <ExerciseTags exercise={exercise} />
          {exercise.secondaryMuscles.length > 0 && (
            <p className="small muted">
              שרירים משניים: {exercise.secondaryMuscles.map((m) => MUSCLE_LABELS_HE[m]).join(', ')}
            </p>
          )}
          {!known && <p className="small muted">התרגיל לא נמצא בספרייה (ייתכן שהגיע מקובץ מיובא).</p>}
        </div>

        {stats.sessions.length === 0 ? (
          <EmptyState title="עוד אין אימונים עם התרגיל הזה">
            <p className="muted small">
              {inActive ? 'הסטים מהאימון הפעיל יופיעו כאן אחרי שתסיים אותו.' : 'הוסף אותו לאימון כדי לראות התקדמות.'}
            </p>
          </EmptyState>
        ) : (
          <>
            {best && (
              <div className="pr-row">
                <span className="stack" style={{ gap: 0 }}>
                  <span style={{ fontWeight: 500 }}>הסט הטוב ביותר</span>
                  {stats.bestSetDate && <span className="small muted">{formatDateHe(stats.bestSetDate)}</span>}
                </span>
                <span className="badge badge--dark">
                  <bdi>{formatSet(best, exercise.equipment)}</bdi>
                </span>
              </div>
            )}

            <div className="panel" aria-label="סיכום">
              <div className="kv">
                <span>אימונים</span>
                <span>{stats.sessions.length}</span>
              </div>
              <div className="kv">
                <span>סטים</span>
                <span>{stats.totalSets}</span>
              </div>
              {improvement !== null && (
                <div className="kv">
                  <span>שינוי ב-1RM מהאימון הראשון</span>
                  <span style={{ color: improvement >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                    <bdi>{improvement > 0 ? `+${improvement}%` : `${improvement}%`}</bdi>
                  </span>
                </div>
              )}
              <div className="divider" />
              <div className="kv kv--total">
                <span>נפח כולל (משקל × חזרות)</span>
                <span>{formatTotal(stats.totalVolume)} ק"ג</span>
              </div>
            </div>

            {inActive && <p className="small muted">הסטים מהאימון הפעיל ייכללו אחרי שתסיים אותו.</p>}

            <h2 className="section-title">כל האימונים ({stats.sessions.length})</h2>
            <div>
              {stats.sessions.map((s) => (
                <button
                  key={s.workoutId}
                  type="button"
                  className="session-row"
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
                    <span className="headline__stats">
                      נפח {formatTotal(s.volume)} ק"ג
                      {s.bestOneRepMax > 0 && ` · 1RM משוער ${formatKg(s.bestOneRepMax)} ק"ג`}
                    </span>
                    {s.note && <span className="small muted">“{s.note}”</span>}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        <button type="button" className="btn btn--primary btn--large btn--block" onClick={addToWorkout}>
          {data.activeWorkout ? 'הוסף לאימון הפעיל' : 'התחל אימון עם התרגיל'}
        </button>
      </div>
    </div>
  );
}
