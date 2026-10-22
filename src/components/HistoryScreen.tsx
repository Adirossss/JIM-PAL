import { groupWorkoutsByMonth } from '../lib/stats';
import { useApp } from '../state/AppContext';
import { EmptyState } from './common';
import { WorkoutHeadline } from './WorkoutScreen';

export function HistoryScreen() {
  const { data, navigate } = useApp();
  const groups = groupWorkoutsByMonth(data.workouts);

  if (groups.length === 0) {
    return (
      <EmptyState title="עוד אין אימונים בהיסטוריה">
        <p className="muted">אימון שמסיימים נשמר כאן.</p>
        <button type="button" className="btn btn--primary" onClick={() => navigate({ name: 'workout' })}>
          לאימון
        </button>
      </EmptyState>
    );
  }

  return (
    <div className="stack">
      {data.activeWorkout && (
        <button type="button" className="notice notice--warn card--link" onClick={() => navigate({ name: 'workout' })}>
          יש אימון פעיל שעוד לא הסתיים. הוא יופיע כאן אחרי שתסיים אותו.
        </button>
      )}
      {groups.map((g) => (
        <section key={g.key} className="stack" style={{ gap: 8 }} aria-label={g.label}>
          <h2 className="section-title">
            {g.label} <span className="muted">· {g.workouts.length} אימונים</span>
          </h2>
          {g.workouts.map((w) => (
            <button
              key={w.id}
              type="button"
              className="card card--link"
              onClick={() => navigate({ name: 'workoutDetail', workoutId: w.id })}
            >
              <WorkoutHeadline workout={w} />
              {w.note && <span className="small muted">“{w.note}”</span>}
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
