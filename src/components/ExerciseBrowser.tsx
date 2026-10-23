import { useMemo, useState } from 'react';
import { searchExercises } from '../lib/exercises';
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
import { ExerciseTags, Icon } from './common';

interface Props {
  onSelect: (exercise: Exercise) => void;
  autoFocus?: boolean;
  /** Ids shown with a "נוסף" badge (e.g. already in the current workout). */
  markedIds?: ReadonlySet<string>;
}

export function ExerciseBrowser({ onSelect, autoFocus = false, markedIds }: Props) {
  const { exercises } = useApp();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('');
  const [equipment, setEquipment] = useState<EquipmentType | ''>('');

  const results = useMemo(
    () => searchExercises(exercises, { query, muscle: muscle || null, equipment: equipment || null }),
    [exercises, query, muscle, equipment],
  );
  const filtered = query.trim() !== '' || muscle !== '' || equipment !== '';

  return (
    <div className="browser">
      <div className="browser__filters">
        <div className="search">
          <Icon name="search" size={18} />
          <input
            type="search"
            className="input input--surface"
            placeholder="חיפוש בעברית או באנגלית…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // The keyboard's "Search" key closes the keyboard so the whole result list is visible.
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            enterKeyHint="search"
            autoFocus={autoFocus}
            aria-label="חיפוש תרגיל"
          />
        </div>
        <div className="row">
          <select
            className="input input--surface"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as MuscleGroup | '')}
            aria-label="סינון לפי קבוצת שריר"
          >
            <option value="">כל השרירים</option>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABELS_HE[m]}
              </option>
            ))}
          </select>
          <select
            className="input input--surface"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as EquipmentType | '')}
            aria-label="סינון לפי ציוד"
          >
            <option value="">כל הציוד</option>
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EQUIPMENT_LABELS_HE[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="browser__count muted">
          {results.length} תרגילים
          {filtered && (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setQuery('');
                setMuscle('');
                setEquipment('');
              }}
            >
              נקה סינון
            </button>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <p className="muted center">לא נמצאו תרגילים.</p>
      ) : (
        <ul className="list">
          {results.map((e) => (
            <li key={e.id}>
              <button type="button" className="list-item" onClick={() => onSelect(e)}>
                <span className="list-item__main">
                  <span className="list-item__title">{e.nameHe}</span>
                  <span className="list-item__sub" dir="ltr" lang="en">
                    {e.nameEn}
                  </span>
                </span>
                <span className="list-item__side">
                  {markedIds?.has(e.id) && <span className="tag tag--accent">נוסף</span>}
                  <ExerciseTags exercise={e} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
