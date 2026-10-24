import type { Spot } from '@space/contracts';

const DAY_MS = 86_400_000;

/** Check real instants in the venue timezone, including repeated/skipped DST minutes.
 * Hours are minute-resolution; the session end is exclusive. No device timezone is used.
 */
export function coversSession(spot: Spot, arrivalMs: number, endMs: number): boolean {
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone: spot.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const isOpen = (instant: number): boolean => {
    const parts = Object.fromEntries(format.formatToParts(instant).map((p) => [p.type, p.value]));
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const dateMs = Date.parse(`${date}T00:00:00Z`);
    const minute = Number(parts.hour) * 60 + Number(parts.minute);
    return [0, 1].some((daysBack) => {
      const day = new Date(dateMs - daysBack * DAY_MS);
      const key = day.toISOString().slice(0, 10);
      const intervals = spot.hoursExceptions[key] ?? spot.weeklyHours.filter((h) => h.weekday === day.getUTCDay());
      const relativeMinute = minute + daysBack * 1440;
      return intervals.some((h) => h.startMinute <= relativeMinute && relativeMinute < h.endMinute);
    });
  };
  for (let t = arrivalMs; t < endMs; t += 60_000) {
    if (!isOpen(t)) return false;
  }
  return endMs > arrivalMs && isOpen(endMs - 1);
}
