import { swapAlternatives } from '../lib/workout';
import { useApp } from '../state/AppContext';
import { EQUIPMENT_LABELS_HE, MUSCLE_LABELS_HE, type Exercise } from '../types';
import { Modal } from './common';

interface Props {
  current: Exercise;
  /** Exercises already in the workout (marked, still pickable). */
  inWorkoutIds: ReadonlySet<string>;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}

/** Pick a replacement from the same muscle group, closest match (same equipment) first. */
export function SwapExerciseModal({ current, inWorkoutIds, onPick, onClose }: Props) {
  const { exercises } = useApp();
  const alternatives = swapAlternatives(current, exercises);
  const sameEquipment = alternatives.filter((e) => e.equipment === current.equipment);
  const other = alternatives.filter((e) => e.equipment !== current.equipment);
  const muscle = MUSCLE_LABELS_HE[current.primaryMuscle];

  return (
    <Modal title="החלפת תרגיל" onClose={onClose}>
      <p className="muted" style={{ margin: 0 }}>
        במקום <strong>{current.nameHe}</strong> — תרגילים אחרים לאותו שריר ({muscle}).
      </p>
      {alternatives.length === 0 && <p className="muted center">אין עוד תרגילים לשריר הזה ({muscle}).</p>}
      {sameEquipment.length > 0 && (
        <SwapList title={`הכי דומים (${EQUIPMENT_LABELS_HE[current.equipment]})`} items={sameEquipment} inWorkoutIds={inWorkoutIds} onPick={onPick} />
      )}
      {other.length > 0 && <SwapList title={`עוד תרגילים · ${muscle}`} items={other} inWorkoutIds={inWorkoutIds} onPick={onPick} />}
    </Modal>
  );
}

function SwapList({
  title,
  items,
  inWorkoutIds,
  onPick,
}: {
  title: string;
  items: Exercise[];
  inWorkoutIds: ReadonlySet<string>;
  onPick: (exercise: Exercise) => void;
}) {
  return (
    <section className="stack" style={{ gap: 10 }}>
      <h3 className="section-title">{title}</h3>
      <ul className="list">
        {items.map((e) => (
          <li key={e.id}>
            <button type="button" className="list-item" onClick={() => onPick(e)}>
              <span className="list-item__main">
                <span className="list-item__title">{e.nameHe}</span>
                <span className="list-item__sub" dir="ltr" lang="en">
                  {e.nameEn}
                </span>
              </span>
              <span className="list-item__side">
                {inWorkoutIds.has(e.id) && <span className="tag tag--accent">כבר באימון</span>}
                <span className="tag tag--muted">{EQUIPMENT_LABELS_HE[e.equipment]}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
