import { useApp } from '../state/AppContext';
import { BackButton } from './common';
import { CustomExerciseForm } from './CustomExerciseForm';
import { ExerciseBrowser } from './ExerciseBrowser';

export function ExercisesScreen() {
  const { navigate, data } = useApp();
  return (
    <div className="stack">
      <div className="active-header">
        <h2>ספריית תרגילים</h2>
        <button type="button" className="btn btn--secondary" onClick={() => navigate({ name: 'newExercise' })}>
          + תרגיל מותאם
        </button>
      </div>
      {data.customExercises.length > 0 && (
        <p className="small muted">כולל {data.customExercises.length} תרגילים מותאמים אישית.</p>
      )}
      <ExerciseBrowser onSelect={(e) => navigate({ name: 'exerciseDetail', exerciseId: e.id })} />
    </div>
  );
}

export function NewExerciseScreen() {
  const { navigate, goBack } = useApp();
  return (
    <div className="stack">
      <BackButton onClick={() => goBack({ name: 'exercises' })} />
      <section className="card">
        <h2>תרגיל מותאם אישית</h2>
        <p className="small muted">התרגיל נשמר במכשיר הזה יחד עם הספרייה, ונכלל בגיבוי.</p>
        <CustomExerciseForm
          onCreated={(e) => navigate({ name: 'exerciseDetail', exerciseId: e.id })}
          onCancel={() => goBack({ name: 'exercises' })}
        />
      </section>
    </div>
  );
}
