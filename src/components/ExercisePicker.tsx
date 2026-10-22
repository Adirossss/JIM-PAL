import { useState } from 'react';
import type { Exercise } from '../types';
import { CustomExerciseForm } from './CustomExerciseForm';
import { ExerciseBrowser } from './ExerciseBrowser';
import { Modal } from './common';

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
          <button type="button" className="btn btn--secondary btn--block" onClick={() => setCreating(true)}>
            + תרגיל מותאם אישית
          </button>
          <ExerciseBrowser onSelect={onPick} autoFocus markedIds={markedIds} />
        </>
      )}
    </Modal>
  );
}
