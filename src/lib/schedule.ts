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

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds a content line at 75 octets (RFC 5545), never splitting a UTF-8 character. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const bytes = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + bytes > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function icsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * A calendar file with one weekly repeating event per template (on all of its
 * days) at the reminder time, each with an alert when it starts. Times are
 * "floating" (no time zone), so the phone reads them as local time.
 */
export function buildCalendar(
  schedule: WeeklySchedule,
  templates: readonly WorkoutTemplate[],
  exerciseName: (id: string) => string,
  today: string,
  now: Date,
): string {
  const byTemplate = new Map<WorkoutTemplate, number[]>();
  schedule.days.forEach((id, day) => {
    const template = id ? templates.find((t) => t.id === id) : undefined;
    if (template) byTemplate.set(template, [...(byTemplate.get(template) ?? []), day]);
  });

  const time = schedule.reminderTime.replace(':', '') + '00';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jim-Pal//Workout schedule//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const [template, days] of byTemplate) {
    let first = today;
    while (!days.includes(weekdayIndex(first))) first = addDays(first, 1);
    const summary = `אימון: ${template.name}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:jim-pal-${template.id}@jim-pal`,
      `DTSTAMP:${icsUtc(now)}`,
      `DTSTART:${first.replace(/-/g, '')}T${time}`,
      'DURATION:PT1H',
      `RRULE:FREQ=WEEKLY;BYDAY=${days.map((d) => ICS_DAYS[d]).join(',')}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(template.exerciseIds.map(exerciseName).join('\n'))}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(summary)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
