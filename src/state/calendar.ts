export const CALENDAR_FILE_NAME = 'jim-pal-workouts.ics';

function isTouch(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

function download(ics: string): void {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = CALENDAR_FILE_NAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * On a phone, opens the events the way Safari opens a calendar link, which
 * shows the system "add to calendar" sheet. On a computer, downloads the
 * .ics file (opening it adds the events to the calendar app). Returns false
 * when no window could be opened.
 */
export function openInCalendar(ics: string): boolean {
  if (!isTouch()) {
    download(ics);
    return true;
  }
  // Never navigate the app itself away: if no window opens, the screen offers the file instead.
  const url = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  return window.open(url, '_blank') !== null;
}

/** Fallback: hands the .ics file to the share sheet (save to Files, then open it), or downloads it. */
export async function shareCalendarFile(ics: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (isTouch() && typeof File !== 'undefined' && navigator.canShare) {
    const file = new File([ics], CALENDAR_FILE_NAME, { type: 'text/calendar' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'אימונים קבועים' });
        return 'shared';
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      }
    }
  }
  download(ics);
  return 'downloaded';
}
