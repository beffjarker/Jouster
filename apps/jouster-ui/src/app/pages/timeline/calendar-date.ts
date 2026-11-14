/**
 * Life-map entry dates are calendar dates, not instants. Values are stored either as
 * `YYYY-MM-DD` or as an ISO timestamp at UTC midnight; reading them with `new Date()`
 * would shift them to the previous day west of UTC. These helpers keep the calendar
 * day stable for display, filtering and editing.
 */
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Local-midnight Date for the calendar day encoded in `value` (falls back to `new Date`). */
export function parseCalendarDate(value: string | null | undefined): Date {
  const match = CALENDAR_DATE.exec(value ?? '');
  if (!match) return new Date(value ?? NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** `YYYY-MM-DD` calendar day for a stored entry date (for `<input type="date">`). */
export function toDateInputValue(value: string | null | undefined): string {
  const match = CALENDAR_DATE.exec(value ?? '');
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}
