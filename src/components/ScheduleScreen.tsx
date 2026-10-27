import { HEBREW_WEEKDAYS, toLocalDateString, weekdayIndex } from '../lib/format';
import { googleCalendarUrl, scheduleEvents, setReminderTime, setScheduleDay } from '../lib/schedule';
import { sortTemplates } from '../lib/templates';
import { useApp } from '../state/AppContext';
import { BackButton, EmptyState, Icon, ScreenHeader } from './common';

/** Fixed weekly workouts: a template per weekday, and adding them to Google Calendar. */
export function ScheduleScreen() {
  const { data, update, goBack, exerciseById } = useApp();
  const { schedule } = data;
  const templates = sortTemplates(data.templates);
  const today = toLocalDateString(new Date());
  const todayIndex = weekdayIndex(today);
  const events = scheduleEvents(schedule, data.templates, today);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const exerciseName = (id: string) => exerciseById.get(id)?.nameHe ?? 'תרגיל';

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
            <h2>תזכורת ב-Google Calendar</h2>
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
              לחץ "הוסף" ליד כל אימון: נפתח Google Calendar עם אירוע שחוזר כל שבוע, ונשאר רק ללחוץ "שמירה". Google
              Calendar ישלח התראה גם כשהאפליקציה סגורה.
            </p>
            {events.length === 0 ? (
              <p className="small muted">בחר אימון לפחות ליום אחד.</p>
            ) : (
              <div>
                {events.map((event) => (
                  <div key={event.template.id} className="session-row calendar-row">
                    <span className="headline">
                      <span className="headline__date">{event.template.name}</span>
                      <span className="headline__stats">
                        כל {event.days.map((d) => HEBREW_WEEKDAYS[d]).join(' ו')} · {schedule.reminderTime}
                      </span>
                    </span>
                    <a
                      className="btn btn--primary btn--small"
                      href={googleCalendarUrl(event, schedule.reminderTime, exerciseName, timeZone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`הוסף את ${event.template.name} ל-Google Calendar`}
                    >
                      <Icon name="calendar" size={16} />
                      הוסף
                    </a>
                  </div>
                ))}
              </div>
            )}
            <p className="small muted">
              ההתראה נקבעת לפי ברירת המחדל של Google Calendar (בדרך כלל 30 דקות לפני). אפשר לשנות אותה באירוע לפני
              השמירה.
            </p>
            <p className="small muted">
              שינית את הלוח או את השעה? הוסף שוב ומחק ב-Google Calendar את האירועים הקודמים, כי היומן לא מתעדכן לבד.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
