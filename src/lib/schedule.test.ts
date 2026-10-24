import { describe, expect, it } from 'vitest';
import type { WorkoutTemplate } from '../types';
import { emptySchedule } from './schema';
import {
  buildCalendar,
  hasSchedule,
  nextScheduled,
  removeTemplateFromSchedule,
  scheduledTemplate,
  setReminderTime,
  setScheduleDay,
} from './schedule';

const legs: WorkoutTemplate = { id: 't-legs', name: 'רגליים', exerciseIds: ['leg-press', 'barbell-squat'], createdAt: '2026-10-01T00:00:00.000Z' };
const chest: WorkoutTemplate = { id: 't-chest', name: 'חזה, גב', exerciseIds: ['barbell-bench-press'], createdAt: '2026-10-02T00:00:00.000Z' };
const templates = [legs, chest];

// 2026-10-25 is a Sunday.
const plan = setScheduleDay(setScheduleDay(setScheduleDay(emptySchedule(), 0, legs.id), 2, chest.id), 4, legs.id);

describe('weekly schedule', () => {
  it('sets and clears days', () => {
    expect(plan.days).toEqual(['t-legs', null, 't-chest', null, 't-legs', null, null]);
    expect(setScheduleDay(plan, 2, null).days[2]).toBeNull();
    expect(hasSchedule(emptySchedule(), templates)).toBe(false);
    expect(hasSchedule(plan, templates)).toBe(true);
  });

  it('accepts only valid reminder times', () => {
    expect(setReminderTime(plan, '07:30').reminderTime).toBe('07:30');
    expect(setReminderTime(plan, '7:30').reminderTime).toBe('18:00');
    expect(setReminderTime(plan, '24:00').reminderTime).toBe('18:00');
  });

  it("finds today's and the next workout", () => {
    expect(scheduledTemplate(plan, templates, '2026-10-25')).toBe(legs);
    expect(scheduledTemplate(plan, templates, '2026-10-26')).toBeNull();
    expect(nextScheduled(plan, templates, '2026-10-25')).toEqual({ date: '2026-10-27', template: chest });
    expect(nextScheduled(plan, templates, '2026-10-29')).toEqual({ date: '2026-11-01', template: legs });
    expect(nextScheduled(emptySchedule(), templates, '2026-10-25')).toBeNull();
  });

  it('turns days of a deleted template into rest days', () => {
    const after = removeTemplateFromSchedule(plan, legs.id);
    expect(after.days).toEqual([null, null, 't-chest', null, null, null, null]);
    expect(scheduledTemplate(plan, [chest], '2026-10-25')).toBeNull();
  });
});

describe('buildCalendar', () => {
  const names: Record<string, string> = { 'leg-press': 'לחיצת רגליים', 'barbell-squat': 'סקוואט', 'barbell-bench-press': 'לחיצת חזה' };
  const ics = buildCalendar(setReminderTime(plan, '07:30'), templates, (id) => names[id] ?? id, '2026-10-26', new Date('2026-10-26T10:00:00.000Z'));
  const unfolded = ics.replace(/\r\n /g, '');

  it('is a CRLF calendar with one weekly event per template', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true);
    expect(unfolded.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(unfolded).toContain('RRULE:FREQ=WEEKLY;BYDAY=SU,TH');
    expect(unfolded).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU');
  });

  it('starts each event on its next day at the reminder time, with an alert', () => {
    // From Monday 26.10: legs (Sun/Thu) first falls on Thursday 29.10, chest on Tuesday 27.10.
    expect(unfolded).toContain('UID:jim-pal-t-legs@jim-pal\r\nDTSTAMP:20261026T100000Z\r\nDTSTART:20261029T073000');
    expect(unfolded).toContain('DTSTART:20261027T073000');
    expect(unfolded.match(/TRIGGER:PT0M/g)).toHaveLength(2);
  });

  it('escapes text and lists the exercises', () => {
    expect(unfolded).toContain('SUMMARY:אימון: חזה\\, גב');
    expect(unfolded).toContain('DESCRIPTION:לחיצת רגליים\\nסקוואט');
  });

  it('folds long lines at 75 bytes without splitting Hebrew letters', () => {
    const long = { ...legs, name: 'א'.repeat(80) };
    const everyDay = { ...emptySchedule(), days: Array<string | null>(7).fill(long.id) };
    const out = buildCalendar(everyDay, [long], (id) => id, '2026-10-26', new Date());
    const encoder = new TextEncoder();
    for (const line of out.split('\r\n')) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    expect(out.replace(/\r\n /g, '')).toContain(`SUMMARY:אימון: ${'א'.repeat(80)}`);
  });
});
