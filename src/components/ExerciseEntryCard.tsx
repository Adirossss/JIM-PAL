import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { formatDateHe, formatKg } from '../lib/format';
import { exerciseSessions, personalRecordSetIds, setOneRepMax } from '../lib/stats';
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
  suggestNextSet,
  updateSet,
  validateSetInput,
  type SetValues,
} from '../lib/workout';
import { useApp } from '../state/AppContext';
import { useConfirm } from '../state/confirm';
import type { EquipmentType, SetEntry, Workout, WorkoutExercise } from '../types';
import { ExerciseTags, ExerciseTitle, Icon, Toast, formatSet, useExercise } from './common';

const WEIGHT_STEP_KG = 2.5;

interface Props {
  workout: Workout;
  entry: WorkoutExercise;
  index: number;
  /** Show today's weight recommendation (only while training, not when editing history). */
  suggest?: boolean;
  /** Finished workouts other than the one being edited (pre-fill and "last time" come from these). */
  history: readonly Workout[];
  /** Applies a change to the workout being edited (the active one, or a finished one). */
  onChange: (fn: (workout: Workout) => Workout) => void;
  onRemoved: () => void;
}

export function ExerciseEntryCard({ workout, entry, index, suggest = false, history, onChange, onRemoved }: Props) {
  const { navigate } = useApp();
  const confirm = useConfirm();
  const { exercise } = useExercise(entry.exerciseId);

  // Personal records: celebrate a set the moment it is added and beats the best so far.
  const records = useMemo(() => personalRecordSetIds([...history, workout]), [history, workout]);
  const [celebration, setCelebration] = useState<string | null>(null);
  const clearCelebration = useCallback(() => setCelebration(null), []);
  const knownSetIds = useRef(new Set(entry.sets.map((s) => s.id)));
  useEffect(() => {
    for (const s of entry.sets) {
      if (!knownSetIds.current.has(s.id) && records.has(s.id)) {
        setCelebration(`שיא חדש! 1RM משוער ${formatKg(setOneRepMax(s))} ק"ג`);
        // Browsers refuse (and log) vibration before any real tap on the page.
        const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
        if (activation?.hasBeenActive) navigator.vibrate?.([30, 60, 30]);
      }
    }
    knownSetIds.current = new Set(entry.sets.map((s) => s.id));
  }, [entry.sets, records]);

  // Today's recommendation (before the first set); "השתמש" re-seeds the set form.
  const nextSet = suggest && entry.sets.length === 0 ? suggestNextSet(entry.exerciseId, history, exercise.equipment) : null;
  const [seed, setSeed] = useState<{ weight: string; reps: string; version: number } | null>(null);
  const formId = useId();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(entry.note !== '');

  const previous = exerciseSessions(history, entry.exerciseId)[0];
  const canDuplicate = entry.sets.length > 0 || lastLoggedSet(entry.exerciseId, null, history) !== null;
  const editing = entry.sets.find((s) => s.id === editingId) ?? null;

  const remove = async () => {
    if (
      entry.sets.length > 0 &&
      !(await confirm({
        title: `להסיר את "${exercise.nameHe}"?`,
        message: `${entry.sets.length} הסטים שלו באימון הזה יימחקו.`,
        confirmLabel: 'הסר תרגיל',
        danger: true,
      }))
    ) {
      return;
    }
    onChange((w) => removeExercise(w, entry.id));
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
            <span key={s.id}>
              {i > 0 && ' · '}
              <bdi style={{ whiteSpace: 'nowrap' }}>{formatSet(s, exercise.equipment)}</bdi>
            </span>
          ))}
        </p>
      )}

      {nextSet && (
        <div className="suggest-set">
          <span className="suggest-set__icon" aria-hidden="true">
            <Icon name="trend" />
          </span>
          <span className="suggest-set__text">
            <strong>
              המלצה להיום: <bdi>{formatSet({ id: '', weight: nextSet.weight, reps: nextSet.reps }, exercise.equipment)}</bdi>
            </strong>
            <span>
              {nextSet.kind === 'increase'
                ? `בפעם הקודמת החזקת ${nextSet.basis.sets} סטים ב-${formatSet({ id: '', weight: nextSet.basis.weight, reps: nextSet.basis.reps }, exercise.equipment)}. הגיע הזמן להעלות.`
                : `בפעם הקודמת: ${formatSet({ id: '', weight: nextSet.basis.weight, reps: nextSet.basis.reps }, exercise.equipment)}. נסה חזרה אחת יותר.`}
            </span>
          </span>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={() =>
              setSeed((prev) => ({
                weight: nextSet.weight === null ? '' : String(nextSet.weight),
                reps: String(nextSet.reps),
                version: (prev?.version ?? 0) + 1,
              }))
            }
          >
            השתמש
          </button>
        </div>
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
              aria-label={`סט ${i + 1}: ${formatSet(s, exercise.equipment)}${records.has(s.id) ? ' (שיא)' : ''}. לחץ לעריכה`}
              onClick={() => setEditingId(s.id === editingId ? null : s.id)}
            >
              <b dir="ltr">{circleWeight(s, exercise.equipment)}</b>
              <span>× {s.reps}</span>
              {records.has(s.id) && (
                <span className="set-circle__badge" aria-hidden="true">
                  <Icon name="trophy" size={13} />
                </span>
              )}
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
            onChange((w) => updateSet(w, entry.id, editing.id, values));
            setEditingId(null);
          }}
          onDelete={async () => {
            const ok = await confirm({
              title: `למחוק את סט ${entry.sets.indexOf(editing) + 1}?`,
              message: formatSet(editing, exercise.equipment),
              confirmLabel: 'מחק סט',
              danger: true,
            });
            if (!ok) return;
            onChange((w) => deleteSet(w, entry.id, editing.id));
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <NewSetForm
          key={seed?.version ?? 0}
          id={formId}
          equipment={exercise.equipment}
          initial={seed ?? setToInputText(lastLoggedSet(entry.exerciseId, workout, history))}
          onAdd={(values) => onChange((w) => addSet(w, entry.id, values))}
        />
      )}

      {showNote && (
        <label className="field">
          <span className="field__label">הערה לתרגיל</span>
          <textarea
            className="input"
            placeholder="אחיזה, תחושה, מה לשנות בפעם הבאה…"
            value={entry.note}
            onChange={(e) => onChange((w) => setExerciseNote(w, entry.id, e.target.value))}
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
          onClick={() => onChange((w) => moveExercise(w, entry.id, -1))}
          disabled={index <= 0}
          aria-label="הזז את התרגיל קודם"
        >
          <Icon name="up" size={18} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--panel"
          onClick={() => onChange((w) => moveExercise(w, entry.id, 1))}
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
            onClick={() => onChange((w) => duplicateLastSet(w, entry.id, history))}
            disabled={!canDuplicate}
          >
            שכפל סט אחרון
          </button>
          <button type="submit" form={formId} className="btn btn--primary btn--large">
            הוסף סט
          </button>
        </div>
      )}
      {celebration && <Toast message={celebration} onDone={clearCelebration} />}
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
  equipment,
  initial,
  onAdd,
}: {
  id: string;
  equipment: EquipmentType;
  initial: { weight: string; reps: string };
  onAdd: (values: SetValues) => void;
}) {
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
    onAdd(result.values);
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
