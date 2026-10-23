import { useRef, useState, type ChangeEvent } from 'react';
import { parseImport } from '../lib/schema';
import { useApp } from '../state/AppContext';
import { useConfirm } from '../state/confirm';
import { useThemePreference } from '../state/theme';
import { exportBackup, useBackupReminder } from '../state/backup';
import { THEME_LABELS_HE, THEME_PREFERENCES } from '../lib/theme';
import { ScreenHeader } from './common';
import { Stat } from './WorkoutDetail';

const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

type Status = { kind: 'success'; message: string } | { kind: 'error'; message: string; details: string[] } | null;

/** Light / dark / follow-the-phone switch (a per-device setting, not part of the backup). */
function ThemeCard() {
  const [preference, choose] = useThemePreference();
  return (
    <section className="card">
      <h2>מראה</h2>
      <div className="segmented" role="radiogroup" aria-label="מראה האפליקציה">
        {THEME_PREFERENCES.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={preference === p}
            className={`segmented__item ${preference === p ? 'segmented__item--on' : ''}`}
            onClick={() => choose(p)}
          >
            {THEME_LABELS_HE[p]}
          </button>
        ))}
      </div>
      <p className="small muted">"לפי הטלפון" עובר לבד בין בהיר לכהה לפי הגדרת המכשיר.</p>
    </section>
  );
}

export function DataScreen() {
  const { data, update } = useApp();
  const confirm = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);

  const backup = useBackupReminder(data);

  const exportData = async () => {
    const result = await exportBackup(data);
    if (result.kind === 'cancelled') return;
    backup.refresh();
    setStatus({
      kind: 'success',
      message: result.kind === 'shared' ? 'הגיבוי נשמר.' : `הקובץ ${result.fileName} נוצר.`,
    });
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
    const ok = await confirm({
      title: 'להחליף את כל הנתונים?',
      message:
        `הקובץ מכיל ${incoming.workouts.length} אימונים ו-${incoming.customExercises.length} תרגילים מותאמים` +
        (incoming.activeWorkout ? ' ואימון פעיל' : '') +
        `. הוא יחליף את הנתונים הנוכחיים (${data.workouts.length} אימונים). מומלץ לייצא גיבוי לפני כן.`,
      confirmLabel: 'ייבא והחלף',
      danger: true,
    });
    if (!ok) return;
    update(() => incoming);
    setStatus({ kind: 'success', message: `יובאו ${incoming.workouts.length} אימונים.` });
  };

  return (
    <div className="stack">
      <ScreenHeader title="גיבוי והגדרות" />
      <ThemeCard />
      <section className="card">
        <h2>הנתונים שלך</h2>
        <div className="stat-grid">
          <Stat label="אימונים שהסתיימו" value={String(data.workouts.length)} />
          <Stat label="תרגילים מותאמים" value={String(data.customExercises.length)} />
          <Stat label="אימון פעיל" value={data.activeWorkout ? 'כן' : 'לא'} />
          <Stat label="תבניות" value={String(data.templates.length)} />
          <Stat label="מועדפים" value={String(data.favoriteExerciseIds.length)} />
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
        <p className="small muted">שומר את כל האימונים, התבניות, המועדפים והאימון הפעיל לקובץ JSON. בטלפון נפתח תפריט השיתוף: אפשר לשמור ב"קבצים" או לשלוח לעצמך.</p>
        <p className="small">
          גיבוי אחרון: {backup.days === null ? 'עוד לא גיבית במכשיר הזה' : backup.days === 0 ? 'היום' : backup.days === 1 ? 'אתמול' : `לפני ${backup.days} ימים`}
        </p>
        <button type="button" className="btn btn--primary" onClick={exportData}>
          גבה עכשיו (ייצוא לקובץ JSON)
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
