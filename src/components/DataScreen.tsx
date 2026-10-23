import { useRef, useState, type ChangeEvent } from 'react';
import { exportFileName, parseImport, serializeExport } from '../lib/schema';
import { useApp } from '../state/AppContext';
import { Stat } from './WorkoutDetail';

const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

type Status = { kind: 'success'; message: string } | { kind: 'error'; message: string; details: string[] } | null;

export function DataScreen() {
  const { data, update } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);

  const exportData = () => {
    const now = new Date();
    const blob = new Blob([serializeExport(data, now)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(now);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus({ kind: 'success', message: `הקובץ ${a.download} נוצר.` });
  };

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setStatus({ kind: 'error', message: 'הקובץ גדול מדי.', details: [] });
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setStatus({ kind: 'error', message: 'לא ניתן לקרוא את הקובץ.', details: [] });
      return;
    }

    const result = parseImport(text);
    if (!result.ok) {
      setStatus({ kind: 'error', message: 'הקובץ לא יובא, והנתונים הקיימים לא השתנו.', details: result.errors });
      return;
    }

    const incoming = result.value;
    const ok = window.confirm(
      [
        `הקובץ מכיל ${incoming.workouts.length} אימונים ו-${incoming.customExercises.length} תרגילים מותאמים` +
          (incoming.activeWorkout ? ' ואימון פעיל.' : '.'),
        `הייבוא יחליף את כל הנתונים הנוכחיים (${data.workouts.length} אימונים).`,
        'מומלץ לייצא גיבוי לפני כן. להמשיך?',
      ].join('\n'),
    );
    if (!ok) return;
    update(() => incoming);
    setStatus({ kind: 'success', message: `יובאו ${incoming.workouts.length} אימונים.` });
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>הנתונים שלך</h2>
        <div className="stat-grid">
          <Stat label="אימונים שהסתיימו" value={String(data.workouts.length)} />
          <Stat label="תרגילים מותאמים" value={String(data.customExercises.length)} />
          <Stat label="אימון פעיל" value={data.activeWorkout ? 'כן' : 'לא'} />
        </div>
        <p className="small muted">
          הנתונים נשמרים רק בדפדפן הזה, במכשיר הזה. ניקוי נתוני האתר בדפדפן ימחק אותם, לכן כדאי לייצא גיבוי מדי פעם.
        </p>
        <p className="small muted">
          גרסה <bdi>{__APP_VERSION__}</bdi> · נבנתה ב-{new Date(__BUILT_AT__).toLocaleString('he-IL')}
        </p>
      </section>

      <section className="card">
        <h2>ייצוא</h2>
        <p className="small muted">שומר את כל האימונים, התרגילים המותאמים והאימון הפעיל לקובץ JSON.</p>
        <button type="button" className="btn btn--primary" onClick={exportData}>
          ייצוא לקובץ JSON
        </button>
      </section>

      <section className="card">
        <h2>ייבוא</h2>
        <p className="small muted">
          טוען קובץ גיבוי ומחליף את כל הנתונים הנוכחיים. הקובץ נבדק קודם, וקובץ פגום נדחה בלי לשנות דבר.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={importFile}
          hidden
        />
        <button type="button" className="btn btn--secondary" onClick={() => fileInput.current?.click()}>
          בחר קובץ לייבוא…
        </button>
      </section>

      {status?.kind === 'success' && (
        <div className="notice notice--success" role="status">
          {status.message}
        </div>
      )}
      {status?.kind === 'error' && (
        <div className="notice notice--error" role="alert">
          <strong>{status.message}</strong>
          {status.details.length > 0 && (
            <ul className="error-list">
              {status.details.map((d) => (
                <li key={d} dir="auto">
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
