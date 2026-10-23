import { useState } from 'react';
import { relativeDayHe, toLocalDateString } from '../lib/format';
import { recentExercises } from '../lib/stats';
import { useApp } from '../state/AppContext';
import type { Exercise } from '../types';
import { CustomExerciseForm } from './CustomExerciseForm';
import { ExerciseBrowser } from './ExerciseBrowser';
import { Icon, Modal, formatSet } from './common';

interface Props {
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
  markedIds?: ReadonlySet<string>;
}

export function ExercisePicker({ onPick, onClose, markedIds }: Props) {
  const [creating, setCreating] = useState(false);

  return (
    <Modal title={creating ? 'תרגיל חדש' : 'הוספת תרגיל'} onClose={onClose}>
      {creating ? (
        <CustomExerciseForm onCreated={onPick} onCancel={() => setCreating(false)} />
      ) : (
        <>
          <ExerciseBrowser
            onSelect={onPick}
            markedIds={markedIds}
            unfilteredTop={<RecentTiles onPick={onPick} markedIds={markedIds} />}
          />
          <button type="button" className="btn btn--secondary btn--block" onClick={() => setCreating(true)}>
            + תרגיל מותאם אישית
          </button>
        </>
      )}
    </Modal>
  );
}

/** Big one-tap tiles for the exercises done most recently, with the last set as a reminder. */
function RecentTiles({ onPick, markedIds }: { onPick: (exercise: Exercise) => void; markedIds?: ReadonlySet<string> }) {
  const { data, exerciseById } = useApp();
  const today = toLocalDateString(new Date());
  const recent = recentExercises(data.workouts, 6).filter((r) => exerciseById.has(r.exerciseId));
  if (recent.length === 0) return null;

  return (
    <section className="stack" style={{ gap: 10 }} aria-label="עשית לאחרונה">
      <h3 className="section-title">עשית לאחרונה</h3>
      <div className="tile-grid">
        {recent.map((r) => {
          const exercise = exerciseById.get(r.exerciseId)!;
          const added = markedIds?.has(r.exerciseId) ?? false;
          return (
            <button
              key={r.exerciseId}
              type="button"
              className={`tile ${added ? 'tile--added' : ''}`}
              onClick={() => onPick(exercise)}
              aria-label={`הוסף ${exercise.nameHe}${added ? ' (כבר באימון)' : ''}`}
            >
              <span className="tile__title">{exercise.nameHe}</span>
              <span className="tile__sub">
                <bdi>{formatSet(r.lastSet, exercise.equipment)}</bdi> · {relativeDayHe(r.lastDate, today)}
              </span>
              <span className="tile__action" aria-hidden="true">
                {added ? (
                  <>
                    <Icon name="check" size={16} /> נוסף
                  </>
                ) : (
                  <Icon name="plus" size={18} />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <h3 className="section-title">כל התרגילים</h3>
    </section>
  );
}
