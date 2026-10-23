import { groupWorkoutsByMonth } from '../lib/stats';
import { useApp } from '../state/AppContext';
import { EmptyState, Icon, ScreenHeader } from './common';
import { WorkoutHeadline } from './WorkoutScreen';

export function HistoryScreen() {
  const { data, navigate } = useApp();
  const groups = groupWorkoutsByMonth(data.workouts);

  return (
    <div className="stack">
      <ScreenHeader title="היסטוריה" subtitle={`${data.workouts.length} אימונים`} />

      {data.activeWorkout && (
        <button type="button" className="notice notice--warn card--link" onClick={() => navigate({ name: 'workout' })}>
          יש אימון פעיל שעוד לא הסתיים. הוא יופיע כאן אחרי שתסיים אותו.
        </button>
      )}

      {groups.length === 0 ? (
        <EmptyState title="עוד אין אימונים בהיסטוריה">
          <p className="muted small">אימון שמסיימים נשמר כאן.</p>
          <button type="button" className="btn btn--primary" onClick={() => navigate({ name: 'workout' })}>
            לאימון
          </button>
        </EmptyState>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="stack" style={{ gap: 8 }} aria-label={g.label}>
            <h2 className="section-title">
              {g.label} · {g.workouts.length} אימונים
            </h2>
            {g.workouts.map((w) => (
              <button
                key={w.id}
                type="button"
                className="card card--link"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => navigate({ name: 'workoutDetail', workoutId: w.id })}
              >
                <span className="stack" style={{ gap: 4, minWidth: 0 }}>
                  <WorkoutHeadline workout={w} />
                  {w.note && <span className="small muted">“{w.note}”</span>}
                </span>
                <span className="go-circle" aria-hidden="true">
                  <Icon name="go" size={18} />
                </span>
              </button>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
