/**
 * Utilities for formatting and converting time strings between 12-hour AM/PM and 24-hour formats.
 */

/**
 * Converts any time string (e.g., "18:00", "9:30", "19:45:00", "7:30 PM")
 * into a clean 12-hour format with AM/PM (e.g., "6:00 PM", "9:30 AM").
 */
export function formatTime(timeStr?: string): string {
  if (!timeStr || !timeStr.trim()) return '';

  const trimmed = timeStr.trim();

  // If already formatted like "7:30 PM" or "11:00 AM", clean up spacing and return
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)$/i);
  if (ampmMatch) {
    const hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const ampm = ampmMatch[3].toUpperCase();
    return `${hours}:${minutes} ${ampm}`;
  }

  // Handle 24-hour time "HH:MM" or "HH:MM:SS"
  const time24Match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (time24Match) {
    let hours = parseInt(time24Match[1], 10);
    const minutes = time24Match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  return trimmed;
}

/**
 * Converts any time string (e.g., "7:30 PM", "6:00 PM", "18:00")
 * into standard 24-hour "HH:MM" format for HTML5 time inputs and ISO builders.
 */
export function to24HourTime(timeStr?: string): string {
  if (!timeStr || !timeStr.trim()) return '18:00';

  const trimmed = timeStr.trim();

  // If 12-hour AM/PM format
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const ampm = ampmMatch[3].toUpperCase();

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  // If already 24-hour format
  const time24Match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (time24Match) {
    const hours = String(parseInt(time24Match[1], 10)).padStart(2, '0');
    const minutes = time24Match[2];
    return `${hours}:${minutes}`;
  }

  return '18:00';
}

/**
 * Formats a start and end time into a clean AM/PM range string.
 * e.g., "6:00 PM - 10:00 PM" or just "6:00 PM" if end time is omitted.
 */
export function formatTimeRange(start?: string, end?: string): string {
  const formattedStart = formatTime(start);
  const formattedEnd = formatTime(end);

  if (formattedStart && formattedEnd) {
    return `${formattedStart} - ${formattedEnd}`;
  }
  return formattedStart || formattedEnd || '';
}
