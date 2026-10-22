import { useState, type FormEvent } from 'react';
import { formatDateHe } from '../lib/format';
import { exerciseSessions } from '../lib/stats';
import {
  addSet,
  deleteSet,
  duplicateLastSet,
  lastLoggedSet,
  moveExercise,
  removeExercise,
  setExerciseNote,
  setToInputText,
  updateSet,
  validateSetInput,
} from '../lib/workout';
import { useApp } from '../state/AppContext';
import type { EquipmentType, SetEntry, Workout, WorkoutExercise } from '../types';
import { ExerciseTags, ExerciseTitle, SetText, formatSet, useExercise } from './common';

interface Props {
  workout: Workout;
  entry: WorkoutExercise;
  index: number;
}

export function ExerciseEntryCard({ workout, entry, index }: Props) {
  const { data, updateActive, navigate } = useApp();
  const { exercise } = useExercise(entry.exerciseId);
  const history = data.workouts;
  const [showNote, setShowNote] = useState(entry.note !== '');

  const previous = exerciseSessions(history, entry.exerciseId)[0];
  const canDuplicate = entry.sets.length > 0 || lastLoggedSet(entry.exerciseId, null, history) !== null;

  const remove = () => {
    if (entry.sets.length > 0 && !window.confirm(`להסיר את "${exercise.nameHe}" ואת ${entry.sets.length} הסטים שלו?`)) {
      return;
    }
    updateActive((w) => removeExercise(w, entry.id));
  };

  return (
    <section className="card entry">
      <header className="entry__header">
        <span className="entry__index">{index + 1}</span>
        <div className="entry__title">
          <ExerciseTitle exercise={exercise} />
          <ExerciseTags exercise={exercise} />
        </div>
        <div className="entry__tools">
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => updateActive((w) => moveExercise(w, entry.id, -1))}
            disabled={index === 0}
            aria-label="הזז למעלה"
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => updateActive((w) => moveExercise(w, entry.id, 1))}
            disabled={index === workout.exercises.length - 1}
            aria-label="הזז למטה"
          >
            ↓
          </button>
          <button type="button" className="btn btn--ghost btn--icon btn--danger" onClick={remove} aria-label="הסר תרגיל">
            ✕
          </button>
        </div>
      </header>

      {previous && (
        <p className="entry__previous muted">
          בפעם הקודמת ({formatDateHe(previous.date)}):{' '}
          {previous.sets.map((s) => formatSet(s, exercise.equipment)).join(' · ')}
        </p>
      )}

      {entry.sets.length > 0 && (
        <ol className="sets">
          {entry.sets.map((s, i) => (
            <SetRow key={s.id} set={s} number={i + 1} entryId={entry.id} equipment={exercise.equipment} />
          ))}
        </ol>
      )}

      <NewSetForm
        entryId={entry.id}
        equipment={exercise.equipment}
        initial={setToInputText(lastLoggedSet(entry.exerciseId, workout, history))}
      />

      <div className="entry__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => updateActive((w) => duplicateLastSet(w, entry.id, history))}
          disabled={!canDuplicate}
        >
          ⧉ שכפל סט אחרון
        </button>
        {!showNote && (
          <button type="button" className="btn btn--ghost" onClick={() => setShowNote(true)}>
            + הערה
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => navigate({ name: 'exerciseDetail', exerciseId: entry.exerciseId })}
        >
          התקדמות
        </button>
      </div>

      {showNote && (
        <textarea
          className="input note"
          placeholder="הערה לתרגיל…"
          value={entry.note}
          onChange={(e) => updateActive((w) => setExerciseNote(w, entry.id, e.target.value))}
          rows={2}
        />
      )}
    </section>
  );
}

function SetInputs({
  weight,
  reps,
  onWeight,
  onReps,
  equipment,
}: {
  weight: string;
  reps: string;
  onWeight: (v: string) => void;
  onReps: (v: string) => void;
  equipment: EquipmentType;
}) {
  const bodyweight = equipment === 'bodyweight';
  return (
    <>
      <label className="set-input">
        <span className="set-input__label">{bodyweight ? 'תוספת (ק"ג)' : 'משקל (ק"ג)'}</span>
        <input
          className="input input--num"
          inputMode="decimal"
          enterKeyHint="next"
          placeholder={bodyweight ? 'ללא' : '0'}
          value={weight}
          onChange={(e) => onWeight(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
      </label>
      <label className="set-input">
        <span className="set-input__label">חזרות</span>
        <input
          className="input input--num"
          inputMode="numeric"
          enterKeyHint="done"
          placeholder="0"
          value={reps}
          onChange={(e) => onReps(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
      </label>
    </>
  );
}

function NewSetForm({
  entryId,
  equipment,
  initial,
}: {
  entryId: string;
  equipment: EquipmentType;
  initial: { weight: string; reps: string };
}) {
  const { updateActive } = useApp();
  // Pre-filled once from the last logged set; afterwards it keeps what the
  // user typed, which after "add" equals the set just logged.
  const [weight, setWeight] = useState(initial.weight);
  const [reps, setReps] = useState(initial.reps);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateSetInput(weight, reps, equipment);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    updateActive((w) => addSet(w, entryId, result.values));
  };

  return (
    <form className="set-form" onSubmit={submit} noValidate>
      <SetInputs weight={weight} reps={reps} onWeight={setWeight} onReps={setReps} equipment={equipment} />
      <button type="submit" className="btn btn--primary set-form__submit">
        + הוסף סט
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function SetRow({
  set,
  number,
  entryId,
  equipment,
}: {
  set: SetEntry;
  number: number;
  entryId: string;
  equipment: EquipmentType;
}) {
  const { updateActive } = useApp();
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    const text = setToInputText(set);
    setWeight(text.weight);
    setReps(text.reps);
    setError(null);
    setEditing(true);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    const result = validateSetInput(weight, reps, equipment);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    updateActive((w) => updateSet(w, entryId, set.id, result.values));
    setEditing(false);
  };

  const remove = () => {
    if (window.confirm(`למחוק את סט ${number}?`)) updateActive((w) => deleteSet(w, entryId, set.id));
  };

  if (editing) {
    return (
      <li className="set set--editing">
        <form className="set-form" onSubmit={save} noValidate>
          <span className="set__number">{number}</span>
          <SetInputs weight={weight} reps={reps} onWeight={setWeight} onReps={setReps} equipment={equipment} />
          <div className="row">
            <button type="submit" className="btn btn--primary">
              שמור
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>
              ביטול
            </button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className="set">
      <span className="set__number">{number}</span>
      <SetText set={set} equipment={equipment} />
      <span className="set__tools">
        <button type="button" className="btn btn--ghost btn--small" onClick={startEdit}>
          ערוך
        </button>
        <button type="button" className="btn btn--ghost btn--small btn--danger" onClick={remove}>
          מחק
        </button>
      </span>
    </li>
  );
}
