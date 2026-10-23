import { tabOf, type Route, type Tab } from './lib/route';
import { AppProvider, useApp, type InitialState } from './state/AppContext';
import { useUpdateCheck } from './state/useUpdateCheck';
import { DataScreen } from './components/DataScreen';
import { ExerciseDetail } from './components/ExerciseDetail';
import { ExercisesScreen, NewExerciseScreen } from './components/ExercisesScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { WorkoutDetail } from './components/WorkoutDetail';
import { WorkoutScreen } from './components/WorkoutScreen';

export function App({ initial }: { initial: InitialState }) {
  return (
    <AppProvider initial={initial}>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { route } = useApp();
  return (
    <div className="app">
      <header className="topbar">
        <h1 className="brand">
          Jim-Pal <span className="brand__sub">יומן אימונים</span>
        </h1>
      </header>
      <Notices />
      <main className="content">
        <Screen route={route} />
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
      <span>🎉 יש גרסה חדשה של האפליקציה</span>
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

const TABS: Array<{ tab: Tab; label: string; route: Route; icon: string }> = [
  { tab: 'workout', label: 'אימון', route: { name: 'workout' }, icon: 'M6 9v6M18 9v6M3 11v2M21 11v2M6 12h12' },
  { tab: 'history', label: 'היסטוריה', route: { name: 'history' }, icon: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0' },
  { tab: 'exercises', label: 'תרגילים', route: { name: 'exercises' }, icon: 'M4 6h16M4 12h16M4 18h10' },
  { tab: 'data', label: 'גיבוי', route: { name: 'data' }, icon: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14' },
];

function TabBar({ active }: { active: Tab }) {
  const { navigate, data } = useApp();
  return (
    <nav className="tabbar" aria-label="ניווט ראשי">
      {TABS.map((t) => (
        <button
          key={t.tab}
          type="button"
          className={`tabbar__item ${active === t.tab ? 'tabbar__item--active' : ''}`}
          aria-current={active === t.tab ? 'page' : undefined}
          onClick={() => navigate(t.route)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d={t.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t.label}</span>
          {t.tab === 'workout' && data.activeWorkout && <span className="tabbar__dot" aria-label="אימון פעיל" />}
        </button>
      ))}
    </nav>
  );
}
