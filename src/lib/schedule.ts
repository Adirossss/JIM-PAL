import type { WeeklySchedule, WorkoutTemplate } from '../types';
import { weekdayIndex } from './format';
import { isValidTime } from './schema';
import { addDays } from './stats';

/** Sets (or clears, with null) the template for a weekday, 0 = Sunday. */
export function setScheduleDay(schedule: WeeklySchedule, day: number, templateId: string | null): WeeklySchedule {
  return { ...schedule, days: schedule.days.map((d, i) => (i === day ? templateId : d)) };
}

/** Changes the reminder time; an invalid "HH:MM" leaves the schedule as it is. */
export function setReminderTime(schedule: WeeklySchedule, time: string): WeeklySchedule {
  return isValidTime(time) ? { ...schedule, reminderTime: time } : schedule;
}

/** Days that used a deleted template become rest days. */
export function removeTemplateFromSchedule(schedule: WeeklySchedule, templateId: string): WeeklySchedule {
  return { ...schedule, days: schedule.days.map((d) => (d === templateId ? null : d)) };
}

/** The template planned for a date, or null on a rest day (or if the template is gone). */
export function scheduledTemplate(
  schedule: WeeklySchedule,
  templates: readonly WorkoutTemplate[],
  date: string,
): WorkoutTemplate | null {
  const id = schedule.days[weekdayIndex(date)];
  return (id && templates.find((t) => t.id === id)) || null;
}

/** The next planned workout after `date` (within a week), or null if nothing is planned. */
export function nextScheduled(
  schedule: WeeklySchedule,
  templates: readonly WorkoutTemplate[],
  date: string,
): { date: string; template: WorkoutTemplate } | null {
  for (let i = 1; i <= 7; i++) {
    const next = addDays(date, i);
    const template = scheduledTemplate(schedule, templates, next);
    if (template) return { date: next, template };
  }
  return null;
}

export function hasSchedule(schedule: WeeklySchedule, templates: readonly WorkoutTemplate[]): boolean {
  return schedule.days.some((id) => id !== null && templates.some((t) => t.id === id));
}


/** One repeating calendar event: a template on all of its weekdays. */
export interface ScheduledEvent {
  template: WorkoutTemplate;
  /** Weekdays, 0 = Sunday, ascending. */
  days: number[];
  /** First date on or after `today` that falls on one of the days. */
  firstDate: string;
}

/** Groups the schedule by template, in the order of the week. */
export function scheduleEvents(
  schedule: WeeklySchedule,
  templates: readonly WorkoutTemplate[],
  today: string,
): ScheduledEvent[] {
  const byTemplate = new Map<WorkoutTemplate, number[]>();
  schedule.days.forEach((id, day) => {
    const template = id ? templates.find((t) => t.id === id) : undefined;
    if (template) byTemplate.set(template, [...(byTemplate.get(template) ?? []), day]);
  });
  return [...byTemplate].map(([template, days]) => {
    let firstDate = today;
    while (!days.includes(weekdayIndex(firstDate))) firstDate = addDays(firstDate, 1);
    return { template, days, firstDate };
  });
}

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** "2026-10-27" + "07:30" (+ minutes) → "20261027T073000", rolling over midnight. */
function calendarDateTime(date: string, time: string, addMinutes = 0): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + addMinutes;
  const day = addDays(date, Math.floor(total / 1440));
  const minutes = total % 1440;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.replace(/-/g, '')}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
}

/**
 * A link that opens Google Calendar with the event filled in: weekly on the
 * template's days, one hour from the reminder time, in the phone's time zone.
 * Google Calendar then notifies with the calendar's default reminder.
 */
export function googleCalendarUrl(
  event: ScheduledEvent,
  time: string,
  exerciseName: (id: string) => string,
  timeZone: string,
): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `אימון: ${event.template.name}`,
    dates: `${calendarDateTime(event.firstDate, time)}/${calendarDateTime(event.firstDate, time, 60)}`,
    details: event.template.exerciseIds.map(exerciseName).join('\n'),
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${event.days.map((d) => RRULE_DAYS[d]).join(',')}`,
    ctz: timeZone,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
