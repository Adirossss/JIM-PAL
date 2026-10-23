import { useApp } from '../state/AppContext';
import { BackButton, Icon, ScreenHeader } from './common';
import { CustomExerciseForm } from './CustomExerciseForm';
import { ExerciseBrowser } from './ExerciseBrowser';

export function ExercisesScreen() {
  const { navigate, data } = useApp();
  return (
    <div className="stack">
      <ScreenHeader
        title="ספריית תרגילים"
        subtitle={data.customExercises.length > 0 ? `כולל ${data.customExercises.length} מותאמים אישית` : undefined}
        end={
          <button
            type="button"
            className="icon-btn icon-btn--dark"
            aria-label="תרגיל מותאם אישית חדש"
            onClick={() => navigate({ name: 'newExercise' })}
          >
            <Icon name="plus" />
          </button>
        }
      />
      <ExerciseBrowser onSelect={(e) => navigate({ name: 'exerciseDetail', exerciseId: e.id })} />
    </div>
  );
}

export function NewExerciseScreen() {
  const { navigate, goBack } = useApp();
  return (
    <div className="stack">
      <ScreenHeader start={<BackButton onClick={() => goBack({ name: 'exercises' })} />} title="תרגיל מותאם אישית" />
      <section className="card">
        <p className="small muted">התרגיל נשמר במכשיר הזה יחד עם הספרייה, ונכלל בגיבוי.</p>
        <CustomExerciseForm
          onCreated={(e) => navigate({ name: 'exerciseDetail', exerciseId: e.id })}
          onCancel={() => goBack({ name: 'exercises' })}
        />
      </section>
    </div>
  );
}
