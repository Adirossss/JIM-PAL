import { useId, useState, type FormEvent } from 'react';
import { formatDateHe, formatKg } from '../lib/format';
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
  stepReps,
  stepWeight,
  updateSet,
  validateSetInput,
} from '../lib/workout';
import { useApp } from '../state/AppContext';
import type { EquipmentType, SetEntry, Workout, WorkoutExercise } from '../types';
import { ExerciseTags, ExerciseTitle, Icon, formatSet, useExercise } from './common';

const WEIGHT_STEP_KG = 2.5;

interface Props {
  workout: Workout;
  entry: WorkoutExercise;
  index: number;
  onRemoved: () => void;
}

export function ExerciseEntryCard({ workout, entry, index, onRemoved }: Props) {
  const { data, updateActive, navigate } = useApp();
  const { exercise } = useExercise(entry.exerciseId);
  const history = data.workouts;
  const formId = useId();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(entry.note !== '');

  const previous = exerciseSessions(history, entry.exerciseId)[0];
  const canDuplicate = entry.sets.length > 0 || lastLoggedSet(entry.exerciseId, null, history) !== null;
  const editing = entry.sets.find((s) => s.id === editingId) ?? null;

  const remove = () => {
    if (entry.sets.length > 0 && !window.confirm(`להסיר את "${exercise.nameHe}" ואת ${entry.sets.length} הסטים שלו?`)) {
      return;
    }
    updateActive((w) => removeExercise(w, entry.id));
    onRemoved();
  };

  return (
    <section className="card entry" aria-label={exercise.nameHe}>
      <div className="entry__head">
        <div className="stack" style={{ gap: 6 }}>
          <ExerciseTitle exercise={exercise} as="h2" />
          <ExerciseTags exercise={exercise} />
        </div>
        <button
          type="button"
          className="icon-btn icon-btn--panel"
          aria-label="התקדמות בתרגיל"
          onClick={() => navigate({ name: 'exerciseDetail', exerciseId: entry.exerciseId })}
        >
          <Icon name="chart" />
        </button>
      </div>

      {previous && (
        <p className="entry__previous">
          בפעם הקודמת ({formatDateHe(previous.date)}):{' '}
          {previous.sets.map((s, i) => (
            <span key={s.id} style={{ whiteSpace: 'nowrap' }}>
              {i > 0 && ' · '}
              <bdi>{formatSet(s, exercise.equipment)}</bdi>
            </span>
          ))}
        </p>
      )}

      <div className="stack" style={{ gap: 8 }}>
        <span className="entry__label">סטים</span>
        <div className="set-circles">
          {entry.sets.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`set-circle ${s.id === editingId ? 'set-circle--on' : ''}`}
              aria-pressed={s.id === editingId}
              aria-label={`סט ${i + 1}: ${formatSet(s, exercise.equipment)}. לחץ לעריכה`}
              onClick={() => setEditingId(s.id === editingId ? null : s.id)}
            >
              <b dir="ltr">{circleWeight(s, exercise.equipment)}</b>
              <span>× {s.reps}</span>
            </button>
          ))}
          {!editing && (
            <button type="submit" form={formId} className="set-circle set-circle--add" aria-label="הוסף סט">
              +
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <EditSetPanel
          key={editing.id}
          set={editing}
          number={entry.sets.indexOf(editing) + 1}
          equipment={exercise.equipment}
          onSave={(values) => {
            updateActive((w) => updateSet(w, entry.id, editing.id, values));
            setEditingId(null);
          }}
          onDelete={() => {
            if (!window.confirm(`למחוק את סט ${entry.sets.indexOf(editing) + 1}?`)) return;
            updateActive((w) => deleteSet(w, entry.id, editing.id));
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <NewSetForm
          id={formId}
          entryId={entry.id}
          equipment={exercise.equipment}
          initial={setToInputText(lastLoggedSet(entry.exerciseId, workout, history))}
        />
      )}

      {showNote && (
        <label className="field">
          <span className="field__label">הערה לתרגיל</span>
          <textarea
            className="input"
            placeholder="אחיזה, תחושה, מה לשנות בפעם הבאה…"
            value={entry.note}
            onChange={(e) => updateActive((w) => setExerciseNote(w, entry.id, e.target.value))}
            rows={2}
          />
        </label>
      )}

      <div className="entry__tools">
        {!showNote && (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setShowNote(true)}>
            + הערה
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="icon-btn icon-btn--panel"
          onClick={() => updateActive((w) => moveExercise(w, entry.id, -1))}
          disabled={index <= 0}
          aria-label="הזז את התרגיל קודם"
        >
          <Icon name="up" size={18} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--panel"
          onClick={() => updateActive((w) => moveExercise(w, entry.id, 1))}
          disabled={index >= workout.exercises.length - 1}
          aria-label="הזז את התרגיל אחר כך"
        >
          <Icon name="down" size={18} />
        </button>
        <button type="button" className="icon-btn icon-btn--panel icon-btn--danger" onClick={remove} aria-label="הסר תרגיל">
          <Icon name="trash" size={18} />
        </button>
      </div>

      {!editing && (
        <div className="entry__actions">
          <button
            type="button"
            className="btn btn--secondary btn--large"
            onClick={() => updateActive((w) => duplicateLastSet(w, entry.id, history))}
            disabled={!canDuplicate}
          >
            שכפל סט אחרון
          </button>
          <button type="submit" form={formId} className="btn btn--primary btn--large">
            הוסף סט
          </button>
        </div>
      )}
    </section>
  );
}

/** Weight as shown inside a set circle: "82.5", "+10" (added load) or "גוף" (bodyweight only). */
function circleWeight(set: SetEntry, equipment: EquipmentType): string {
  if (equipment === 'bodyweight') return set.weight ? `+${formatKg(set.weight)}` : 'גוף';
  return formatKg(set.weight ?? 0);
}

function SetSteppers({
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
  const weightLabel = bodyweight ? 'תוספת משקל' : 'משקל';
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="stepper-row">
        <span className="stepper-row__label">
          {bodyweight ? 'תוספת' : 'משקל'} <span className="muted">(ק"ג)</span>
        </span>
        <div className="stepper">
          <button type="button" aria-label={`פחות ${weightLabel}`} onClick={() => onWeight(stepWeight(weight, -WEIGHT_STEP_KG, equipment))}>
            −
          </button>
          <input
            inputMode="decimal"
            enterKeyHint="done"
            aria-label={`${weightLabel} בק"ג`}
            placeholder={bodyweight ? 'ללא' : '0'}
            value={weight}
            onChange={(e) => onWeight(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          <button type="button" aria-label={`יותר ${weightLabel}`} onClick={() => onWeight(stepWeight(weight, WEIGHT_STEP_KG, equipment))}>
            +
          </button>
        </div>
      </div>
      <div className="stepper-row">
        <span className="stepper-row__label">חזרות</span>
        <div className="stepper">
          <button type="button" aria-label="פחות חזרות" onClick={() => onReps(stepReps(reps, -1))}>
            −
          </button>
          <input
            inputMode="numeric"
            enterKeyHint="done"
            aria-label="חזרות"
            placeholder="0"
            value={reps}
            onChange={(e) => onReps(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          <button type="button" aria-label="יותר חזרות" onClick={() => onReps(stepReps(reps, 1))}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function NewSetForm({
  id,
  entryId,
  equipment,
  initial,
}: {
  id: string;
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
    <form id={id} className="panel" onSubmit={submit} noValidate aria-label="סט חדש">
      <SetSteppers weight={weight} reps={reps} onWeight={setWeight} onReps={setReps} equipment={equipment} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function EditSetPanel({
  set,
  number,
  equipment,
  onSave,
  onDelete,
  onCancel,
}: {
  set: SetEntry;
  number: number;
  equipment: EquipmentType;
  onSave: (values: { weight: number | null; reps: number }) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const text = setToInputText(set);
  const [weight, setWeight] = useState(text.weight);
  const [reps, setReps] = useState(text.reps);
  const [error, setError] = useState<string | null>(null);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const result = validateSetInput(weight, reps, equipment);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSave(result.values);
  };

  return (
    <form className="edit-panel" onSubmit={save} noValidate aria-label={`עריכת סט ${number}`}>
      <span className="entry__label">עריכת סט {number}</span>
      <SetSteppers weight={weight} reps={reps} onWeight={setWeight} onReps={setReps} equipment={equipment} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="edit-panel__actions">
        <button type="submit" className="btn btn--primary">
          שמור
        </button>
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          ביטול
        </button>
        <button type="button" className="btn btn--ghost btn--danger" onClick={onDelete}>
          מחק סט
        </button>
      </div>
    </form>
  );
}
