import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { formatDateHe, formatKg, isValidDateString, relativeDayHe, toLocalDateString, weekdayHe } from '../lib/format';
import { toggleFavorite } from '../lib/templates';
import { useApp } from '../state/AppContext';
import { useScrollLock } from '../state/scrollLock';
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

const ICON_PATHS = {
  back: 'M5 12h14M13 6l6 6-6 6',
  go: 'M15 6l-6 6 6 6',
  dumbbell: 'M6 9v6M18 9v6M3 11v2M21 11v2M6 12h12',
  history: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  list: 'M4 6h16M4 12h16M4 18h10',
  backup: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  chart: 'M4 19h16M6 15l4-4 3 3 5-6',
  note: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  calendar: 'M8 3v4M16 3v4M4 10h16M7 5h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  close: 'M6 6l12 12M18 6L6 18',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5 9-10',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4',
  trend: 'M4 16l6-6 4 4 6-7M15 7h5v5',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  flame: 'M12 3c.5 3 4 5 4 9.5a4 4 0 0 1-8 0c0-2 1-3.4 2.3-4.4-.1 1.8.7 3 1.7 3.4.2-3.1-.6-5.6 0-8.5z',
  bookmark: 'M7 4h10v16l-5-3.5L7 20z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

/** Inline stroke icon; decorative, so hidden from screen readers (label the button instead). */
export function Icon({ name, size = 20, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={ICON_PATHS[name]}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Star toggle for an exercise's favorite status. */
export function FavoriteButton({ exerciseId, name }: { exerciseId: string; name: string }) {
  const { data, update } = useApp();
  const on = data.favoriteExerciseIds.includes(exerciseId);
  return (
    <button
      type="button"
      className={`icon-btn ${on ? 'icon-btn--star' : ''}`}
      aria-pressed={on}
      aria-label={on ? `הסר את ${name} מהמועדפים` : `הוסף את ${name} למועדפים`}
      onClick={() => update((d) => ({ ...d, favoriteExerciseIds: toggleFavorite(d.favoriteExerciseIds, exerciseId) }))}
    >
      <Icon name="star" filled={on} />
    </button>
  );
}

/** Header row: start slot, centered title (with optional subtitle), end slot. */
export function ScreenHeader({
  start,
  title,
  subtitle,
  end,
}: {
  start?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  end?: ReactNode;
}) {
  return (
    <header className="screen-header">
      <div className="screen-header__slot screen-header__slot--wide">{start}</div>
      <div className="screen-header__title">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="screen-header__slot screen-header__slot--wide">{end}</div>
    </header>
  );
}

/**
 * Date picker that reads like the app: shows "היום · 23.10.2026" in Hebrew,
 * while an invisible native date input on top opens the phone's own date
 * wheel on tap (the native control would show the device's locale format).
 */
export function DateField({
  value,
  onChange,
  label,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  const today = toLocalDateString(new Date());
  let text = 'בחר תאריך';
  if (isValidDateString(value)) {
    const relative = relativeDayHe(value, today);
    text = relative === formatDateHe(value) ? `${weekdayHe(value)}, ${relative}` : `${relative} · ${formatDateHe(value)}`;
  }
  return (
    <label className={`date-field ${className}`}>
      <Icon name="calendar" size={18} />
      <span className="date-field__text">{text}</span>
      <input
        type="date"
        className="date-field__native"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            // Some browsers only allow showPicker from certain gestures; the tap still focuses the input.
          }
        }}
      />
    </label>
  );
}

export function BackButton({ onClick, label = 'חזרה' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="icon-btn" onClick={onClick} aria-label={label}>
      <Icon name="back" />
    </button>
  );
}

export function ExerciseTitle({ exercise, as: Tag = 'h3' }: { exercise: Exercise; as?: 'h1' | 'h2' | 'h3' | 'span' }) {
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

/** "82.5 ק"ג × 6", bodyweight "משקל גוף × 10" / "משקל גוף +10 ק"ג × 6"; a drop set ends with " · דרופ". */
export function formatSet(set: SetEntry, equipment: EquipmentType): string {
  if (equipment === 'bodyweight') {
    // LRI…PDI keeps "+10" from rendering as "10+" inside right-to-left text.
    const load = set.weight ? ` ⁦+${formatKg(set.weight)}⁩ ק"ג` : '';
    return `משקל גוף${load} × ${set.reps}${set.drop ? ' · דרופ' : ''}`;
  }
  return `${formatKg(set.weight ?? 0)} ק"ג × ${set.reps}${set.drop ? ' · דרופ' : ''}`;
}

export function SetText({ set, equipment }: { set: SetEntry; equipment: EquipmentType }) {
  return <bdi className="set-text">{formatSet(set, equipment)}</bdi>;
}

/**
 * The part of the screen not covered by the on-screen keyboard. iOS does not
 * shrink fixed elements when the keyboard opens, so a sheet sized to the full
 * screen would hide its bottom rows behind the keyboard, out of scroll reach.
 */
function useVisibleViewport(): { top: number; height: number } | null {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setBox({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return box;
}

/**
 * Bottom sheet. Rendered into <body> (outside the screen's scroll area, so a
 * swipe cannot chain to the screen behind it) and locks that area while open;
 * only `.modal__body` scrolls.
 */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const visible = useVisibleViewport();
  const backdropRef = useRef<HTMLDivElement>(null);
  useScrollLock(backdropRef, '.modal__body');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      ref={backdropRef}
      className="modal-backdrop"
      style={visible ? { top: visible.top, height: visible.height, bottom: 'auto' } : undefined}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="סגור">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Short-lived message at the top of the screen (e.g. a new personal record). */
export function Toast({ message, icon = 'trophy', onDone }: { message: string; icon?: IconName; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 3500);
    return () => window.clearTimeout(timer);
  }, [message, onDone]);
  return createPortal(
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <span>{message}</span>
    </div>,
    document.body,
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
