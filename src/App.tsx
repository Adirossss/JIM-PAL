import { routeToHash, tabOf, type Route, type Tab } from './lib/route';
import { AppProvider, useApp, type InitialState } from './state/AppContext';
import { ConfirmProvider } from './state/confirm';
import { useUpdateCheck } from './state/useUpdateCheck';
import { Icon, type IconName } from './components/common';
import { DataScreen } from './components/DataScreen';
import { ExerciseDetail } from './components/ExerciseDetail';
import { ExercisesScreen, NewExerciseScreen } from './components/ExercisesScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { WorkoutDetail } from './components/WorkoutDetail';
import { EditWorkout, WorkoutScreen } from './components/WorkoutScreen';
import { BodyScreen } from './components/BodyScreen';

export function App({ initial }: { initial: InitialState }) {
  return (
    <AppProvider initial={initial}>
      <ConfirmProvider>
        <Shell />
      </ConfirmProvider>
    </AppProvider>
  );
}

/**
 * A fixed full-screen shell: only the screen area scrolls, so the page itself
 * never bounces or shows a scrollbar the way a website does.
 */
function Shell() {
  const { route } = useApp();
  return (
    <div className="app">
      <Notices />
      <main className="screen-scroll">
        <div className="content">
          <div className="screen" key={routeToHash(route)}>
            <Screen route={route} />
          </div>
        </div>
      </main>
      <TabBar active={tabOf(route)} />
    </div>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'workout':
      return <WorkoutScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'workoutDetail':
      return <WorkoutDetail workoutId={route.workoutId} />;
    case 'workoutEdit':
      return <EditWorkout workoutId={route.workoutId} />;
    case 'body':
      return <BodyScreen />;
    case 'exercises':
      return <ExercisesScreen />;
    case 'exerciseDetail':
      return <ExerciseDetail exerciseId={route.exerciseId} />;
    case 'newExercise':
      return <NewExerciseScreen />;
    case 'data':
      return <DataScreen />;
  }
}

function UpdateBanner() {
  const { update, apply } = useUpdateCheck();
  if (!update) return null;
  return (
    <div className="update-banner" role="status">
      <span>יש גרסה חדשה של האפליקציה</span>
      <button type="button" className="btn btn--primary btn--small" onClick={apply}>
        עדכן עכשיו
      </button>
    </div>
  );
}

function Notices() {
  const { loadResult, saveError, persistent } = useApp();
  return (
    <>
      <UpdateBanner />
      {!persistent && (
        <div className="notice notice--warn" role="status">
          הדפדפן חוסם אחסון מקומי, לכן הנתונים לא יישמרו אחרי סגירת הדף.
        </div>
      )}
      {saveError && (
        <div className="notice notice--error" role="alert">
          {saveError} ייתכן שהשינויים האחרונים לא נשמרו. מומלץ לייצא גיבוי.
        </div>
      )}
      {loadResult.status === 'recovered' && (
        <div className="notice notice--warn" role="status">
          לא ניתן היה לקרוא את הנתונים השמורים, לכן האפליקציה התחילה מחדש.
          {loadResult.backupKey && <> הנתונים המקוריים גובו באחסון הדפדפן תחת המפתח {loadResult.backupKey}.</>}
        </div>
      )}
    </>
  );
}

const TABS: Array<{ tab: Tab; label: string; route: Route; icon: IconName }> = [
  { tab: 'workout', label: 'אימון', route: { name: 'workout' }, icon: 'dumbbell' },
  { tab: 'history', label: 'היסטוריה', route: { name: 'history' }, icon: 'history' },
  { tab: 'exercises', label: 'תרגילים', route: { name: 'exercises' }, icon: 'list' },
  { tab: 'data', label: 'גיבוי', route: { name: 'data' }, icon: 'backup' },
];

/** Floating pill: the active tab shows a dot and its label, the others their icon. */
function TabBar({ active }: { active: Tab }) {
  const { navigate, data } = useApp();
  return (
    <nav className="tabbar" aria-label="ניווט ראשי">
      {TABS.map((t) => {
        const isActive = active === t.tab;
        return (
          <button
            key={t.tab}
            type="button"
            className={`tabbar__item ${isActive ? 'tabbar__item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            aria-label={isActive ? undefined : t.label}
            onClick={() => navigate(t.route)}
          >
            {isActive ? (
              <>
                <span className="tabbar__dot" aria-hidden="true" />
                <span>{t.label}</span>
              </>
            ) : (
              <Icon name={t.icon} size={24} />
            )}
            {t.tab === 'workout' && data.activeWorkout && <span className="tabbar__live" aria-label="אימון פעיל" />}
          </button>
        );
      })}
    </nav>
  );
}
