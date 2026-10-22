import { useEffect, useRef, type ReactNode } from 'react';
import { formatKg } from '../lib/format';
import { useApp } from '../state/AppContext';
import { EQUIPMENT_LABELS_HE, MUSCLE_LABELS_HE, type EquipmentType, type Exercise, type SetEntry } from '../types';

export function unknownExercise(id: string): Exercise {
  return {
    id,
    nameEn: id,
    nameHe: 'תרגיל לא מוכר',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    equipment: 'free_weight',
  };
}

/** Looks up an exercise, falling back to a placeholder for ids missing from the library. */
export function useExercise(id: string): { exercise: Exercise; known: boolean } {
  const { exerciseById } = useApp();
  const exercise = exerciseById.get(id);
  return exercise ? { exercise, known: true } : { exercise: unknownExercise(id), known: false };
}

export function ExerciseTitle({ exercise, as: Tag = 'h3' }: { exercise: Exercise; as?: 'h2' | 'h3' | 'span' }) {
  return (
    <Tag className="exercise-title">
      <span className="exercise-title__he">{exercise.nameHe}</span>
      {exercise.nameEn !== exercise.nameHe && (
        <span className="exercise-title__en" dir="ltr" lang="en">
          {exercise.nameEn}
        </span>
      )}
    </Tag>
  );
}

export function ExerciseTags({ exercise }: { exercise: Exercise }) {
  return (
    <span className="tags">
      <span className="tag">{MUSCLE_LABELS_HE[exercise.primaryMuscle]}</span>
      <span className="tag tag--muted">{EQUIPMENT_LABELS_HE[exercise.equipment]}</span>
      {exercise.custom && <span className="tag tag--accent">מותאם</span>}
    </span>
  );
}

/** "82.5 ק"ג × 6", or for bodyweight "משקל גוף × 10" / "משקל גוף +10 ק"ג × 8". */
export function formatSet(set: SetEntry, equipment: EquipmentType): string {
  if (equipment === 'bodyweight') {
    const load = set.weight ? ` +${formatKg(set.weight)} ק"ג` : '';
    return `משקל גוף${load} × ${set.reps}`;
  }
  return `${formatKg(set.weight ?? 0)} ק"ג × ${set.reps}`;
}

export function SetText({ set, equipment }: { set: SetEntry; equipment: EquipmentType }) {
  return <bdi className="set-text">{formatSet(set, equipment)}</bdi>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef}>
        <div className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="סגור">
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {children}
    </div>
  );
}

export function BackButton({ onClick, label = 'חזרה' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="btn btn--ghost back-btn" onClick={onClick}>
      → {label}
    </button>
  );
}
