import { LocalDateSchema, type Spot } from '@space/contracts';

// Shapes checked against SerpApi's public maps-place-results and google-maps-api
// examples. Fixtures are synthetic; private Austin payload validation is pending.
type TimeEvidence = Pick<Spot, 'hoursStatus' | 'hoursFetchedAt' | 'weeklyHours' |
  'hoursExceptions' | 'typicalCrowd' | 'liveObservation'>;
type Interval = { startMinute: number; endMinute: number };
const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const clean = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ').trim();
const percent = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value / 100 : null;

function clock(text: string, inherited?: string): number | null {
  const match = clean(text).match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  const hour = Number(match[1]), minute = Number(match[2] ?? 0);
  const meridiem = match[3]?.toUpperCase() ?? inherited;
  if (minute > 59) return null;
  if (meridiem) return hour >= 1 && hour <= 12 ? (hour % 12 + (meridiem === 'PM' ? 12 : 0)) * 60 + minute : null;
  // Bare hours without a meridiem are ambiguous; explicit 24h clocks are accepted.
  return match[2] !== undefined && hour <= 23 ? hour * 60 + minute : null;
}

/** Parse only complete, bounded day schedules. A qualifier like "hours may differ"
 * invalidates the day; equal endpoints never imply a 24-hour opening. */
export function parseDayHours(value: unknown): Interval[] | null {
  if (typeof value !== 'string' || value.length > 300) return null;
  const text = clean(value);
  if (/^closed$/i.test(text)) return [];
  if (/^open 24 hours$/i.test(text)) return [{ startMinute: 0, endMinute: 1440 }];
  const ranges = text.split(',');
  if (ranges.length > 7) return null;
  const result: Interval[] = [];
  for (const range of ranges) {
    const parts = range.trim().split(/\s*[–—-]\s*/);
    if (parts.length !== 2) return null;
    const [startText, endText] = parts;
    if (startText === undefined || endText === undefined) return null;
    const endMeridiem = endText.match(/(AM|PM)$/i)?.[1]?.toUpperCase();
    const hasStartMeridiem = /(AM|PM)$/i.test(startText);
    const startMinute = clock(startText, endMeridiem);
    let endMinute = clock(endText);
    if (startMinute === null || endMinute === null || startMinute === endMinute) return null;
    // Abbreviated "7:30–10:30 AM" is supported. "9–5 PM" is ambiguous;
    // do not guess morning vs overnight when sharing the suffix reverses time.
    if (!hasStartMeridiem && endMeridiem && startMinute >= endMinute) return null;
    if (endMinute < startMinute) endMinute += 1440;
    result.push({ startMinute, endMinute });
  }
  return result.sort((a, b) => a.startMinute - b.startMinute);
}

function openingHours(place: { hours?: unknown; operating_hours?: unknown }, fetchedAt: string):
  Pick<TimeEvidence, 'hoursStatus' | 'hoursFetchedAt' | 'weeklyHours' | 'hoursExceptions'> {
  const unknown = { hoursStatus: 'unknown' as const, hoursFetchedAt: null, weeklyHours: [], hoursExceptions: {} };
  // Listing hours is an open-state string, NOT a schedule. Detail rows take
  // precedence over the listing map; a malformed detail does not fall back.
  const raw = Array.isArray(place.hours) ? place.hours : place.operating_hours;
  if (raw === undefined) return unknown;
  const rows = Array.isArray(raw) ? raw : [raw];
  if (rows.length > 50) return unknown;
  const days = new Map<number, Interval[]>();
  const exceptions: Spot['hoursExceptions'] = {};
  for (const row of rows) {
    const record = object(row);
    if (!record || Object.keys(record).length === 0) return unknown;
    for (const [key, value] of Object.entries(record)) {
      const weekday = weekdays.indexOf(key.toLowerCase());
      const date = LocalDateSchema.safeParse(key);
      // An exact local date is the only accepted exception key. No dates are
      // manufactured from weekday names, holidays or relative update labels.
      if (weekday === -1 && !date.success) return unknown;
      const intervals = parseDayHours(value);
      if (intervals === null) return unknown;
      if (weekday >= 0) {
        if (days.has(weekday)) return unknown;
        days.set(weekday, intervals);
      } else {
        if (Object.hasOwn(exceptions, key)) return unknown;
        exceptions[key] = intervals;
      }
    }
  }
  // The schema cannot distinguish an omitted weekday from an explicit closure.
  // Require all seven so missing/invalid days never become implied closed days.
  const weeklyHours = [...days].flatMap(([weekday, hours]) => hours.map((h) => ({ weekday, ...h })))
    .sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
  if (weeklyHours.length > 50) return unknown;
  return { hoursStatus: days.size === 7 ? 'known' : 'unknown', hoursFetchedAt: fetchedAt,
    weeklyHours: days.size === 7 ? weeklyHours : [], hoursExceptions: exceptions };
}

export function normalizeTimeEvidence(place: { hours?: unknown; operating_hours?: unknown; popular_times?: unknown },
  fetchedAt: string): TimeEvidence {
  const hours = openingHours(place, fetchedAt);
  const popular = object(place.popular_times);
  const graph = object(popular?.graph_results);
  const entries = new Map<string, { weekday: number; hour: number; value: number | null }>();
  const liveScores: { key: string; value: number | null }[] = [];
  const duplicateHours = new Set<string>();
  if (graph) for (const [day, raw] of Object.entries(graph)) {
    const weekday = weekdays.indexOf(day.toLowerCase());
    if (weekday < 0 || !Array.isArray(raw) || raw.length > 24) continue;
    for (const item of raw) {
      const row = object(item);
      const minute = typeof row?.time === 'string' ? clock(row.time) : null;
      if (!row || minute === null || minute % 60 !== 0) continue;
      const hour = minute / 60, key = `${weekday}:${hour}`;
      const duplicate = entries.has(key);
      if (duplicate) duplicateHours.add(key);
      entries.set(key, { weekday, hour, value: duplicate ? null : percent(row.busyness_score) });
      const live = percent(row.live_busyness_score);
      // Historical info is never used as live text, and historical scores never
      // become live values. Accept only explicitly current numeric measurements.
      if (day === popular?.current_day && row.current === true) liveScores.push({ key, value: live });
    }
  }
  const live = object(popular?.live_hash);
  const text = typeof live?.info === 'string' ? live.info.trim().slice(0, 300) : '';
  const measurement = liveScores.length === 1 ? liveScores[0] : undefined;
  const numericValue = measurement && !duplicateHours.has(measurement.key) ? measurement.value : null;
  return { ...hours,
    typicalCrowd: entries.size ? { entries: [...entries.values()].sort((a, b) => a.weekday - b.weekday || a.hour - b.hour),
      source: 'serpapi', fetchedAt } : null,
    // Provider examples supply no observation instant. Neither current_day, the
    // hour label nor cache retrieval time establishes one (especially across DST).
    liveObservation: text || numericValue !== null ? { text, numericValue, observedAt: null, fetchedAt } : null,
  };
}
