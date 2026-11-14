import { parseCalendarDate, toDateInputValue } from './calendar-date';

describe('calendar-date', () => {
  it.each(['2020-01-01', '2020-01-01T00:00:00.000Z', '2020-01-01T23:59:59Z'])(
    'keeps %s on January 1 in local time',
    (value) => {
      const d = parseCalendarDate(value);
      expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2020, 0, 1]);
      expect(toDateInputValue(value)).toBe('2020-01-01');
    },
  );

  it('handles missing or malformed values', () => {
    expect(isNaN(parseCalendarDate(undefined).getTime())).toBe(true);
    expect(isNaN(parseCalendarDate('not a date').getTime())).toBe(true);
    expect(toDateInputValue(null)).toBe('');
  });
});
