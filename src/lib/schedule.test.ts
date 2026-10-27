import { describe, expect, it } from 'vitest';
import type { WorkoutTemplate } from '../types';
import { emptySchedule } from './schema';
import {
  hasSchedule,
  googleCalendarUrl,
  nextScheduled,
  removeTemplateFromSchedule,
  scheduleEvents,
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

describe('Google Calendar links', () => {
  const names: Record<string, string> = { 'leg-press': 'לחיצת רגליים', 'barbell-squat': 'סקוואט', 'barbell-bench-press': 'לחיצת חזה' };
  // From Monday 26.10: legs (Sun/Thu) first falls on Thursday 29.10, chest on Tuesday 27.10.
  const events = scheduleEvents(plan, templates, '2026-10-26');

  it('groups the week into one weekly event per template', () => {
    expect(events.map((e) => [e.template.id, e.days, e.firstDate])).toEqual([
      ['t-legs', [0, 4], '2026-10-29'],
      ['t-chest', [2], '2026-10-27'],
    ]);
    expect(scheduleEvents(emptySchedule(), templates, '2026-10-26')).toEqual([]);
  });

  it('fills in the title, time, repeat days, exercises and time zone', () => {
    const url = new URL(googleCalendarUrl(events[0]!, '07:30', (id) => names[id] ?? id, 'Asia/Jerusalem'));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: 'TEMPLATE',
      text: 'אימון: רגליים',
      dates: '20261029T073000/20261029T083000',
      details: 'לחיצת רגליים\nסקוואט',
      recur: 'RRULE:FREQ=WEEKLY;BYDAY=SU,TH',
      ctz: 'Asia/Jerusalem',
    });
  });

  it('rolls a late workout over midnight', () => {
    const url = new URL(googleCalendarUrl(events[1]!, '23:30', (id) => id, 'Asia/Jerusalem'));
    expect(url.searchParams.get('dates')).toBe('20261027T233000/20261028T003000');
  });
});
