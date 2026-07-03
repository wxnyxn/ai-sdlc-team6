// lib/timezone.ts
// Single source of truth for all Singapore timezone (Asia/Singapore) operations.
// NEVER use new Date() directly in this project — always use getSingaporeNow().

const SINGAPORE_TZ = 'Asia/Singapore';

/**
 * Returns the current date/time in Singapore timezone.
 * Use this everywhere instead of new Date().
 */
export function getSingaporeNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: SINGAPORE_TZ }));
}

/**
 * Formats a Date object as a human-readable string in Singapore timezone.
 * e.g. "Jul 11, 2:48 PM"
 */
export function formatSingaporeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-SG', {
    timeZone: SINGAPORE_TZ,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Returns a Date representing the start of a given day in Singapore timezone.
 */
export function getSingaporeDayStart(date: Date): Date {
  const sgStr = date.toLocaleDateString('en-CA', { timeZone: SINGAPORE_TZ }); // YYYY-MM-DD
  return new Date(`${sgStr}T00:00:00+08:00`);
}

/**
 * Returns YYYY-MM-DD string for a date in Singapore timezone.
 */
export function toSingaporeDateString(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: SINGAPORE_TZ });
}

/**
 * Calculates the next due date for a recurring todo based on its pattern.
 * Daily +1d, Weekly +7d, Monthly +1mo, Yearly +1yr — all in Singapore timezone.
 */
export function getNextRecurrenceDate(
  currentDue: Date,
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly'
): Date {
  const d = new Date(currentDue);
  switch (pattern) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}
