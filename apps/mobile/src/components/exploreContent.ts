import type { Spot } from '@space/contracts';

export type TypicalCrowd = Spot['typicalCrowd'];
export type LiveObservation = Spot['liveObservation'];
export type TypicalLevel = 'quiet' | 'moderate' | 'busy' | 'unknown';
export type OpenStatus = 'open' | 'closing_soon' | 'closed' | 'temporarily_closed' | 'permanently_closed' | 'unknown' | 'stale';

export function validHour(hour: number): boolean {
  return Number.isInteger(hour) && hour >= 0 && hour <= 23;
}

/** Display normalization only. Last duplicate in input order wins, including null.
 * Missing/invalid values remain gaps; no interpolation or timezone conversion. */
export function crowdHours(crowd: TypicalCrowd, weekday: number): (number | null)[] {
  const hours: (number | null)[] = Array.from({ length: 24 }, () => null);
  if (!crowd || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return hours;
  for (const entry of crowd.entries) {
    if (entry.weekday !== weekday || !validHour(entry.hour)) continue;
    hours[entry.hour] = entry.value !== null && Number.isFinite(entry.value) && entry.value >= 0 && entry.value <= 1
      ? entry.value : null;
  }
  return hours;
}

/** UI bands for a historical 0–1 value, not occupancy or a ranking calculation. */
export function typicalLevel(value: number | null): TypicalLevel {
  if (value === null || !Number.isFinite(value) || value < 0 || value > 1) return 'unknown';
  return value < 1 / 3 ? 'quiet' : value < 2 / 3 ? 'moderate' : 'busy';
}

export function typicalWording(value: number | null): string {
  const level = typicalLevel(value);
  return level === 'unknown' ? 'No typical crowd data for this hour' : `Usually ${level} at this hour`;
}

export function crowdSourceLabel(source: NonNullable<TypicalCrowd>['source']): string {
  return { serpapi: 'Google popular times', muse: 'Estimated by Muse', curated: 'Curated by Nook', synthetic: 'Demo estimate' }[source];
}

export function observationTime(observation: NonNullable<LiveObservation>): string {
  return observation.observedAt ? `Observed ${observation.observedAt}` : `Fetched ${observation.fetchedAt}`;
}

export function normalizedFit(score: number | null): number | null {
  return score === null || !Number.isFinite(score) ? null : Math.max(0, Math.min(100, score));
}

export const OPEN_STATUS_LABELS: Record<OpenStatus, string> = {
  open: 'Open', closing_soon: 'Closing soon', closed: 'Closed', temporarily_closed: 'Temporarily closed',
  permanently_closed: 'Permanently closed', unknown: 'Hours unknown', stale: 'Hours may be outdated',
};
