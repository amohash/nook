import { createHash } from 'node:crypto';
import { SpotSchema, type Evidence, type Spot } from '@space/contracts';
import { ProviderPlaceSchema } from '../providers/serpapi';
import { normalizeTimeEvidence } from '../providers/serpapi-time';
import { providerImage } from './place-image';

export const AUSTIN_CITY_ID = 'us-tx-austin';
export function normalizePlace(raw: unknown, fetchedAt: string, datasetVersion: string): Spot {
  const place = ProviderPlaceSchema.parse(raw);
  const sourceUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}&query_place_id=${encodeURIComponent(place.place_id)}`;
  const fact = <T>(value: T | null): Evidence<T> => ({ value, source: 'serpapi',
    observedAt: null, fetchedAt, confidence: value === null ? 0 : 0.8, sourceUrl });
  const category = /coffee|cafe/i.test(place.type ?? '') ? 'cafe'
    : /restaurant/i.test(place.type ?? '') ? 'restaurant'
      : /library/i.test(place.type ?? '') ? 'library' : /park/i.test(place.type ?? '') ? 'park' : place.type?.toLowerCase();
  return SpotSchema.parse({
    id: `google:${createHash('sha256').update(place.place_id).digest('hex').slice(0, 32)}`,
    cityId: AUSTIN_CITY_ID, providerPlaceId: place.place_id, providerDataId: place.data_id,
    name: place.title, address: place.address, categories: category ? [category] : [],
    lat: place.gps_coordinates.latitude, lng: place.gps_coordinates.longitude, timezone: 'America/Chicago',
    datasetMode: 'cached', datasetVersion, fetchedAt,
    status: place.permanently_closed ? 'permanently_closed' : place.temporarily_closed ? 'temporarily_closed' : 'unknown',
    priceLevel: fact(place.price && /^\${1,4}$/.test(place.price) ? place.price.length : null),
    rating: fact(place.rating ?? null), reviewCount: fact(place.reviews ?? null),
    noise: fact(null), groupFriendly: fact(null), wifi: fact('unknown'), outlets: fact('unknown'), publicAccess: fact('unknown'),
    tags: fact(null), summary: fact(null), image: providerImage(place.thumbnail), publicPlaceUrl: sourceUrl,
    ...normalizeTimeEvidence(place, fetchedAt),
  });
}

export function deduplicatePlaces(spots: Spot[]): Spot[] {
  const result = new Map<string, Spot>();
  const aliases = new Map<string, string>();
  for (const spot of spots) {
    const key = (spot.providerDataId && aliases.get(spot.providerDataId)) || spot.providerPlaceId;
    const previous = result.get(key);
    if (!previous || Date.parse(spot.fetchedAt) > Date.parse(previous.fetchedAt)) {
      result.set(key, previous ? { ...spot, id: previous.id, providerPlaceId: previous.providerPlaceId } : spot);
    }
    if (spot.providerDataId) aliases.set(spot.providerDataId, key);
  }
  return [...result.values()].sort((a, b) => a.id.localeCompare(b.id));
}
