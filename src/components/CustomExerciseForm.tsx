import { useState, type FormEvent } from 'react';
import { createCustomExercise, type CustomExerciseInput } from '../lib/exercises';
import { createId } from '../lib/ids';
import { useApp } from '../state/AppContext';
import {
  EQUIPMENT_LABELS_HE,
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  MUSCLE_LABELS_HE,
  type EquipmentType,
  type Exercise,
  type MuscleGroup,
} from '../types';

interface Props {
  onCreated: (exercise: Exercise) => void;
  onCancel: () => void;
}

export function CustomExerciseForm({ onCreated, onCancel }: Props) {
  const { exercises, update } = useApp();
  const [input, setInput] = useState<CustomExerciseInput>({
    nameHe: '',
    nameEn: '',
    primaryMuscle: '',
    secondaryMuscles: [],
    equipment: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = createCustomExercise(input, exercises, createId('custom-'));
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    update((d) => ({ ...d, customExercises: [...d.customExercises, result.exercise] }));
    onCreated(result.exercise);
  };

  const toggleSecondary = (m: MuscleGroup) =>
    setInput((s) => ({
      ...s,
      secondaryMuscles: s.secondaryMuscles.includes(m)
        ? s.secondaryMuscles.filter((x) => x !== m)
        : [...s.secondaryMuscles, m],
    }));

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span className="field__label">שם בעברית</span>
        <input
          className="input"
          value={input.nameHe}
          onChange={(e) => setInput({ ...input, nameHe: e.target.value })}
          autoFocus
        />
      </label>
      <label className="field">
        <span className="field__label">שם באנגלית (רשות)</span>
        <input
          className="input"
          dir="ltr"
          lang="en"
          value={input.nameEn}
          onChange={(e) => setInput({ ...input, nameEn: e.target.value })}
        />
      </label>
      <div className="row">
        <label className="field">
          <span className="field__label">שריר עיקרי</span>
          <select
            className="input"
            value={input.primaryMuscle}
            onChange={(e) => setInput({ ...input, primaryMuscle: e.target.value as MuscleGroup | '' })}
          >
            <option value="">בחר…</option>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABELS_HE[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">ציוד</span>
          <select
            className="input"
            value={input.equipment}
            onChange={(e) => setInput({ ...input, equipment: e.target.value as EquipmentType | '' })}
          >
            <option value="">בחר…</option>
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EQUIPMENT_LABELS_HE[t]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="field">
        <legend className="field__label">שרירים משניים (רשות)</legend>
        <div className="chips">
          {MUSCLE_GROUPS.filter((m) => m !== input.primaryMuscle).map((m) => (
            <label key={m} className={`chip ${input.secondaryMuscles.includes(m) ? 'chip--on' : ''}`}>
              <input
                type="checkbox"
                checked={input.secondaryMuscles.includes(m)}
                onChange={() => toggleSecondary(m)}
              />
              {MUSCLE_LABELS_HE[m]}
            </label>
          ))}
        </div>
      </fieldset>
      {errors.length > 0 && (
        <ul className="errors" role="alert">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
      <div className="row">
        <button type="submit" className="btn btn--primary">
          שמור תרגיל
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          ביטול
        </button>
      </div>
    </form>
  );
}
