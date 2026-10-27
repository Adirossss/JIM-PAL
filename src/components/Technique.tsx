import { TECHNIQUE, demoVideoUrl } from '../data/technique';
import type { Exercise } from '../types';
import { Icon } from './common';

/** Key cues and common mistakes for an exercise, plus a link to a demo video. */
export function TechniquePanel({ exercise }: { exercise: Exercise }) {
  const technique = TECHNIQUE[exercise.id];
  return (
    <div className="technique">
      {technique ? (
        <>
          <h3 className="technique__title">איך מבצעים נכון</h3>
          <ol className="technique__list">
            {technique.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ol>
          <h3 className="technique__title">טעויות נפוצות</h3>
          <ul className="technique__list technique__list--mistakes">
            {technique.mistakes.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="small muted">לתרגיל שהוספת בעצמך אין הנחיות כתובות, אבל אפשר לראות הדגמה בסרטון.</p>
      )}
      <a className="btn btn--secondary" href={demoVideoUrl(exercise.nameEn)} target="_blank" rel="noopener noreferrer">
        <Icon name="play" size={18} />
        צפה בסרטון הדגמה
      </a>
      <p className="small muted">הנחיות כלליות, לא תחליף למאמן. אם משהו כואב, עצור.</p>
    </div>
  );
}
