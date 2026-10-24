import { useState } from 'react';
import { HEBREW_WEEKDAYS, toLocalDateString, weekdayIndex } from '../lib/format';
import { buildCalendar, hasSchedule, setReminderTime, setScheduleDay } from '../lib/schedule';
import { sortTemplates } from '../lib/templates';
import { useApp } from '../state/AppContext';
import { openInCalendar, shareCalendarFile } from '../state/calendar';
import { BackButton, EmptyState, Icon, ScreenHeader } from './common';

/** Fixed weekly workouts: a template per weekday, and adding them to the phone's calendar. */
export function ScheduleScreen() {
  const { data, update, goBack, exerciseById } = useApp();
  const { schedule } = data;
  const templates = sortTemplates(data.templates);
  const today = toLocalDateString(new Date());
  const todayIndex = weekdayIndex(today);
  const planned = hasSchedule(schedule, data.templates);
  const [status, setStatus] = useState<string | null>(null);

  const calendar = () =>
    buildCalendar(schedule, data.templates, (id) => exerciseById.get(id)?.nameHe ?? 'תרגיל', today, new Date());

  const addToCalendar = () => {
    openInCalendar(calendar());
    setStatus('אם נפתח חלון של היומן, לחץ "הוסף הכל". מעכשיו היומן יזכיר לך בכל יום אימון.');
  };

  const saveFile = async () => {
    const result = await shareCalendarFile(calendar());
    if (result === 'cancelled') return;
    setStatus(
      result === 'shared'
        ? 'שמור את הקובץ ב"קבצים", ואז פתח אותו שם ולחץ "הוסף הכל".'
        : 'הקובץ ירד. פתח אותו כדי להוסיף את האימונים ליומן.',
    );
  };

  return (
    <div className="stack">
      <ScreenHeader start={<BackButton onClick={() => goBack({ name: 'workout' })} />} title="אימונים קבועים" />

      {templates.length === 0 ? (
        <EmptyState title="עוד אין תבניות">
          <p className="muted small">
            כדי לקבוע אימון ליום בשבוע, קודם שמור אימון כתבנית: בהיסטוריה, פתח אימון ולחץ "שמור כתבנית".
          </p>
        </EmptyState>
      ) : (
        <>
          <section className="card" aria-label="לוח שבועי">
            <h2>איזה אימון בכל יום?</h2>
            <div className="schedule-days">
              {HEBREW_WEEKDAYS.map((name, day) => (
                <label key={name} className={`schedule-day ${day === todayIndex ? 'schedule-day--today' : ''}`}>
                  <span className="schedule-day__name">
                    {name}
                    {day === todayIndex && <span className="small muted"> · היום</span>}
                  </span>
                  <select
                    className="input"
                    aria-label={`האימון ביום ${name}`}
                    value={schedule.days[day] ?? ''}
                    onChange={(e) =>
                      update((d) => ({ ...d, schedule: setScheduleDay(d.schedule, day, e.target.value || null) }))
                    }
                  >
                    <option value="">מנוחה</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section className="card" aria-label="תזכורת ביומן">
            <h2>תזכורת ביומן</h2>
            <label className="field">
              <span className="field__label">שעת האימון והתזכורת</span>
              <input
                className="input"
                type="time"
                aria-label="שעת התזכורת"
                value={schedule.reminderTime}
                onChange={(e) => update((d) => ({ ...d, schedule: setReminderTime(d.schedule, e.target.value) }))}
              />
            </label>
            <p className="small muted">
              האימונים נכנסים ליומן של הטלפון כאירוע שחוזר כל שבוע, והיומן שולח התראה בשעה הזאת גם כשהאפליקציה סגורה.
            </p>
            <button type="button" className="btn btn--primary btn--large btn--block" onClick={addToCalendar} disabled={!planned}>
              <Icon name="calendar" size={18} />
              הוסף ליומן
            </button>
            <button type="button" className="link-btn" onClick={saveFile} disabled={!planned}>
              לא נפתח? שמור כקובץ יומן
            </button>
            {!planned && <p className="small muted">בחר אימון לפחות ליום אחד.</p>}
            {status && (
              <div className="notice notice--success" role="status">
                {status}
              </div>
            )}
            <p className="small muted">
              שינית את הלוח או את השעה? הוסף שוב ליומן ומחק ביומן את האירועים הקודמים, כי היומן לא מתעדכן לבד.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
