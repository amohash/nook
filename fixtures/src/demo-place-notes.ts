import type { Spot } from '@space/contracts';

/** User-supplied presentation notes for the October 25 demo. These do not replace
 * provider facts, alter ranking/filter eligibility, or manufacture live evidence. */
export type DemoPlaceNotes = {
  label: string;
  facts: { publicAccess: string; wifi: string; outlets: string; price: string; noise: string; hours: string };
  typicalActivity: string;
};
const label = 'Team-provided demo notes · October 25, 2026 · not independently verified';
const notes: Record<'lucky' | 'fac' | 'lifeScience', DemoPlaceNotes> = {
  lucky: { label, facts: { publicAccess: 'Yes', wifi: 'University Wi-Fi available', outlets: 'Sufficient',
    price: '~$10+', noise: 'Medium', hours: '6:30 AM–5:00 PM' }, typicalActivity: 'Moderately busy' },
  fac: { label, facts: { publicAccess: 'No · restricted', wifi: 'University Wi-Fi available', outlets: 'Abundant',
    price: '~$0+', noise: 'Low', hours: '8:00 AM–6:00 PM' }, typicalActivity: 'Moderately busy' },
  lifeScience: { label, facts: { publicAccess: 'No · restricted', wifi: 'University Wi-Fi available', outlets: 'Abundant',
    price: '~$0+', noise: 'Low', hours: '9:00 AM–6:00 PM' }, typicalActivity: 'Moderately busy' },
};
export function demoPlaceNotes(spot: Pick<Spot, 'providerPlaceId' | 'name' | 'cityId' | 'datasetMode' | 'lat' | 'lng'>): DemoPlaceNotes | null {
  if (spot.cityId !== 'us-tx-austin' || spot.datasetMode === 'demo') return null;
  if (spot.providerPlaceId === 'ChIJK1vgC3i1RIYRsSCz9uP0hkQ') return notes.lucky;
  if (spot.providerPlaceId === 'ChIJgV2CQJ21RIYReuasCr8k6pE') return notes.lifeScience;
  // FAC has no identity in the pinned snapshot. Require an exact campus title
  // and campus coordinates; never create a provider ID or match a generic library.
  const facNames = ['peter t. flawn academic center (fac)', 'peter t. flawn academic center',
    'flawn academic center', 'flawn academic center (fac)'];
  if (spot.lat >= 30.28 && spot.lat <= 30.29 && spot.lng >= -97.75 && spot.lng <= -97.73
    && facNames.includes(spot.name.trim().toLowerCase())) return notes.fac;
  return null;
}

const coveredWarnings = new Set(['Public access unknown', 'Wi-Fi unknown', 'Outlets unknown', 'Price unknown',
  'Noise unknown', 'Typical activity unknown; no seat availability estimate', 'Operating status unknown',
  'Opening hours unknown or stale']);
export function demoNoteWarnings(warnings: readonly string[], note: DemoPlaceNotes | null): string[] {
  if (!note) return [...warnings];
  return [...warnings.filter((warning) => !coveredWarnings.has(warning)),
    ...(note.facts.publicAccess.startsWith('No') ? ['Access is restricted; check entry requirements before visiting.'] : []),
    'Confirm today’s hours and university Wi-Fi access before visiting. Demo notes do not establish current conditions.'];
}
