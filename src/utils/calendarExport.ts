import { EventPlan } from '../types';
import { to24HourTime } from './timeFormat';

export type CalendarProvider = 'google' | 'apple' | 'outlook' | 'yahoo';

export interface CalendarOption {
  id: CalendarProvider;
  name: string;
  shortName: string;
  iconName: string;
}

export const CALENDAR_PROVIDERS: CalendarOption[] = [
  { id: 'google', name: 'Google Calendar', shortName: 'Google', iconName: 'google' },
  { id: 'apple', name: 'Apple Calendar / iCal', shortName: 'Apple', iconName: 'apple' },
  { id: 'outlook', name: 'Microsoft Outlook', shortName: 'Outlook', iconName: 'outlook' },
  { id: 'yahoo', name: 'Yahoo Calendar', shortName: 'Yahoo', iconName: 'yahoo' },
];

export function getPreferredCalendar(): CalendarProvider {
  try {
    const saved = localStorage.getItem('planify_preferred_calendar');
    if (saved && (saved === 'google' || saved === 'apple' || saved === 'outlook' || saved === 'yahoo')) {
      return saved as CalendarProvider;
    }
  } catch {
    // fallback
  }
  return 'google';
}

export function setPreferredCalendar(provider: CalendarProvider) {
  try {
    localStorage.setItem('planify_preferred_calendar', provider);
  } catch {
    // ignore
  }
}

export function generateIcsContent(event: EventPlan): string {
  // Format dates into YYYYMMDDTHHMMSSZ format
  const parseDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const [year, month, day] = (dateStr || '').split('-').map(Number);
    const time24 = to24HourTime(timeStr);
    const [hours, minutes] = time24.split(':').map(Number);
    const date = new Date(Date.UTC(year || 2026, (month || 1) - 1, day || 1, hours || 9, minutes || 0));
    return isNaN(date.getTime())
      ? new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      : date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startIso = parseDateTime(event?.date, event?.startTime);
  const endIso = parseDateTime(event?.date, event?.endTime || '20:00');
  const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Mifgash Group Plans//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:mifgash-${event?.id || Date.now()}@mifgash.app
DTSTAMP:${nowIso}
DTSTART:${startIso}
DTEND:${endIso}
SUMMARY:${event?.title || 'Event'} (${event?.groupName || ''})
DESCRIPTION:${(event?.description || '').replace(/\n/g, '\\n')}
LOCATION:${event?.location || ''}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

export function downloadIcsFile(event: EventPlan) {
  try {
    const content = generateIcsContent(event);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(event?.title || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.warn('Failed to download .ics file:', err);
  }
}

export function getGoogleCalendarUrl(event: EventPlan): string {
  const formatGCalDate = (dateStr: string, timeStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const time24 = to24HourTime(timeStr);
    const [hours, minutes] = time24.split(':');
    return `${year}${month}${day}T${hours.padStart(2, '0')}${minutes.padStart(2, '0')}00`;
  };

  const start = formatGCalDate(event.date, event.startTime);
  const end = formatGCalDate(event.date, event.endTime || '20:00');
  const text = encodeURIComponent(event.title);
  const details = encodeURIComponent(`${event.description || ''}\n\nGroup: ${event.groupName}`);
  const location = encodeURIComponent(event.location || '');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
}

export function getOutlookCalendarUrl(event: EventPlan): string {
  const formatOutlookDate = (dateStr: string, timeStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const time24 = to24HourTime(timeStr);
    const [hours, minutes] = time24.split(':');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
  };

  const start = formatOutlookDate(event.date, event.startTime);
  const end = formatOutlookDate(event.date, event.endTime || '20:00');
  const subject = encodeURIComponent(event.title);
  const body = encodeURIComponent(`${event.description || ''}\n\nGroup: ${event.groupName}`);
  const location = encodeURIComponent(event.location || '');

  return `https://outlook.live.com/calendar/0/action/compose?rru=addevent&subject=${subject}&startdt=${start}&enddt=${end}&body=${body}&location=${location}`;
}

export function getYahooCalendarUrl(event: EventPlan): string {
  const formatYahooDate = (dateStr: string, timeStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const time24 = to24HourTime(timeStr);
    const [hours, minutes] = time24.split(':');
    return `${year}${month}${day}T${hours.padStart(2, '0')}${minutes.padStart(2, '0')}00`;
  };

  const start = formatYahooDate(event.date, event.startTime);
  const end = formatYahooDate(event.date, event.endTime || '20:00');
  const title = encodeURIComponent(event.title);
  const desc = encodeURIComponent(`${event.description || ''}\n\nGroup: ${event.groupName}`);
  const in_loc = encodeURIComponent(event.location || '');

  return `https://calendar.yahoo.com/?v=60&title=${title}&st=${start}&et=${end}&desc=${desc}&in_loc=${in_loc}`;
}

function safeOpenWindow(url: string) {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.warn('Could not launch calendar link:', e);
  }
}

/**
 * Automatically opens the event directly in the user's preferred calendar
 */
export function openInCalendar(event: EventPlan, provider?: CalendarProvider) {
  try {
    const chosenProvider = provider || getPreferredCalendar();
    
    if (chosenProvider === 'google') {
      const url = getGoogleCalendarUrl(event);
      safeOpenWindow(url);
    } else if (chosenProvider === 'outlook') {
      const url = getOutlookCalendarUrl(event);
      safeOpenWindow(url);
    } else if (chosenProvider === 'yahoo') {
      const url = getYahooCalendarUrl(event);
      safeOpenWindow(url);
    } else if (chosenProvider === 'apple') {
      downloadIcsFile(event);
    }
  } catch (err) {
    console.warn('Error launching calendar:', err);
  }
}

