import { coversSession } from '@space/core';
import type { Spot } from '@space/contracts';
import type { OpenStatus } from '../../components';

export function venueTime(instant: string, timezone: string): {weekday: number; hour: number; label: string} {
  try {
    const date = new Date(instant);
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: timezone,
      weekday: 'short', hour: '2-digit', hourCycle: 'h23'}).formatToParts(date).map((p) => [p.type, p.value]));
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday ?? '');
    const label = new Intl.DateTimeFormat('en-US', {timeZone: timezone, month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'}).format(date);
    return {weekday, hour: Number(parts.hour), label};
  } catch {return {weekday: -1, hour: -1, label: 'Time unavailable'};}
}
export function departureAt(now: string, offsetMinutes: 0 | 60 | 120): string {
  return new Date(Date.parse(now) + offsetMinutes * 60_000).toISOString();
}
export function hoursStatus(spot: Spot, start: string, minutes: number, now: string): {status: OpenStatus; label?: string} {
  if (spot.status === 'permanently_closed' || spot.status === 'temporarily_closed') return {status: spot.status};
  if (spot.hoursStatus !== 'known' || !spot.hoursFetchedAt) return {status: 'unknown'};
  const fetched = Date.parse(spot.hoursFetchedAt), clock = Date.parse(now), arrival = Date.parse(start);
  if (!Number.isFinite(fetched) || !Number.isFinite(clock) || !Number.isFinite(arrival)) return {status: 'unknown'};
  if (fetched > clock || clock - fetched > 86_400_000) return {status: 'stale'};
  try {
    if (!coversSession(spot, arrival, arrival + 60_000)) return {status: 'closed', label: 'Closed at selected time'};
    if (!coversSession(spot, arrival, arrival + minutes * 60_000)) return {status: 'closing_soon', label: 'Closes during selected session'};
    return {status: 'open', label: 'Open for selected session'};
  } catch {return {status: 'unknown'};}
}
// A separate place lookup; it never changes or reranks recommendation results.
export function lookupPlaces(spots: readonly Spot[], text: string): Spot[] {
  const needle = text.trim().toLocaleLowerCase();
  return needle ? spots.filter((spot) => `${spot.name} ${spot.address}`.toLocaleLowerCase().includes(needle)).slice(0, 10) : [];
}
export function mapsUrl(spot: Spot): string | null {
  if (spot.datasetMode === 'demo') return null;
  if (spot.publicPlaceUrl && /^https?:\/\//.test(spot.publicPlaceUrl)) return spot.publicPlaceUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spot.lat},${spot.lng}`)}`;
}
