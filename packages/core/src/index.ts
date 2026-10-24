import { QuerySchema, SpotSchema, type Evidence, type ExclusionCode, type Query,
  type RankingResult, type Spot } from '@space/contracts';
import { coversSession } from './hours';
export { coversSession } from './hours';

export type Clock = { now: string };
type Feature = { value: number; confidence: number };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const known = (value: number, confidence = 1): Feature => ({ value: clamp(value), confidence: clamp(confidence) });
const unknown = (): Feature => known(0.5, 0);
const numeric = (e: Evidence<number>): Feature => e.value === null ? unknown() : known(e.value, e.confidence);
const amenity = (e: Evidence<string>): Feature =>
  e.value === null || e.value === 'unknown' ? unknown() : known(e.value === 'yes' ? 1 : 0, e.confidence);
const positive = (e: Evidence<string>) => e.value === 'yes' && e.confidence >= 0.7;
const fresh = (fetchedAt: string | null, now: number, days: number) => fetchedAt !== null &&
  Date.parse(fetchedAt) <= now && now - Date.parse(fetchedAt) <= days * 86_400_000;

export function estimatedWalkMinutes(origin: Query['origin'], spot: Pick<Spot, 'lat' | 'lng'>): number {
  const radians = (v: number) => v * Math.PI / 180;
  const a = Math.sin(radians(spot.lat - origin.lat) / 2) ** 2 + Math.cos(radians(origin.lat)) *
    Math.cos(radians(spot.lat)) * Math.sin(radians(spot.lng - origin.lng) / 2) ** 2;
  const meters = 6_371_000 * 2 * Math.asin(Math.sqrt(clamp(a)));
  return Math.ceil(meters * 1.3 / 80);
}

function normalize(vector: Record<string, number | undefined>) {
  const total = Object.values(vector).reduce<number>((sum, n) => sum + (n ?? 0), 0);
  return Object.fromEntries(Object.entries(vector).map(([tag, n]) => [tag, total ? (n ?? 0) / total : 0]));
}
function vibe(spot: Spot, query: Query): Feature {
  if (!spot.tags.value || spot.tags.confidence === 0) return unknown();
  const user = normalize(query.tagWeights), place = normalize(spot.tags.value);
  const keys = new Set([...Object.keys(user), ...Object.keys(place)]);
  let intersection = 0, union = 0;
  for (const key of keys) {
    intersection += Math.min(user[key] ?? 0, place[key] ?? 0);
    union += Math.max(user[key] ?? 0, place[key] ?? 0);
  }
  return union ? known(intersection / union, spot.tags.confidence) : unknown();
}
function crowdAt(spot: Spot, arrivalMs: number, now: number): Feature {
  if (!spot.typicalCrowd || !fresh(spot.typicalCrowd.fetchedAt, now, 7)) return unknown();
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: spot.timezone,
    weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(arrivalMs);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.find((p) => p.type === 'weekday')?.value ?? '');
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  const entry = spot.typicalCrowd.entries.find((e) => e.weekday === weekday && e.hour === hour);
  return entry?.value === undefined || entry.value === null ? unknown() : known(entry.value, 0.9);
}

export function rankSpots(input: readonly Spot[], inputQuery: Query, clock: Clock) {
  const query = QuerySchema.parse(inputQuery), now = Date.parse(clock.now);
  if (!Number.isFinite(now)) throw new Error('An explicit valid clock is required');
  // Invalid source candidates cannot establish eligibility; provider identity deduplicates snapshots.
  const seen = new Set<string>();
  const spots = [...input].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).filter((spot) => {
    if (!SpotSchema.safeParse(spot).success || spot.cityId !== query.cityId || seen.has(spot.providerPlaceId)) return false;
    seen.add(spot.providerPlaceId); return true;
  });
  const weights = query.intent === 'friends' || query.intent === 'date'
    ? { P: 0.15, A: 0.15, V: 0.15, Q: 0.10, B: 0.10, M: 0.10, G: 0.25 }
    : { P: 0.20, A: 0.30, V: 0.15, Q: 0.10, B: 0.10, M: 0.10, G: 0.05 };
  const preferred = (['wifi', 'outlets'] as const).filter((key) => query.amenities[key] === 'prefer');
  if (!preferred.length) weights.M = 0;
  if (!Object.values(query.tagWeights).some((n) => n && n > 0)) weights.V = 0;
  const weightTotal = Object.values(weights).reduce((sum, n) => sum + n, 0);
  const excludedCounts: Partial<Record<ExclusionCode, number>> = {};
  const results: RankingResult[] = [];
  for (const spot of spots) {
    const walk = estimatedWalkMinutes(query.origin, spot);
    const arrivalMs = Date.parse(query.departAt) + walk * 60_000;
    const endMs = arrivalMs + query.sessionMinutes * 60_000;
    const hoursKnown = spot.hoursStatus === 'known' && fresh(spot.hoursFetchedAt, now, 1);
    const open = hoursKnown && coversSession(spot, arrivalMs, endMs);
    let excluded: ExclusionCode | undefined;
    if (spot.status === 'permanently_closed' || spot.status === 'temporarily_closed') excluded = 'closed';
    else if (query.categories.length && !query.categories.some((c) => spot.categories.includes(c))) excluded = 'category';
    else if (walk > query.maxWalkMinutes) excluded = 'distance';
    else if (query.maxPriceLevel !== null && spot.priceLevel.value === null) excluded = 'unknown_price';
    else if (query.maxPriceLevel !== null && spot.priceLevel.value! > query.maxPriceLevel) excluded = 'price';
    else if (query.requireOpenForSession && !hoursKnown) excluded = 'unknown_hours';
    else if (query.requireOpenForSession && !open) excluded = 'hours';
    else if ((['wifi', 'outlets'] as const).some((key) => query.amenities[key] === 'require' && !positive(spot[key]))) excluded = 'amenity';
    else if (query.access === 'public_only' && !positive(spot.publicAccess)) excluded = 'access';
    if (excluded) { excludedCounts[excluded] = (excludedCounts[excluded] ?? 0) + 1; continue; }

    const noise = numeric(spot.noise), crowd = crowdAt(spot, arrivalMs, now);
    // Unknown subfeatures contribute neutral values, with zero confidence, before matching targets.
    const noiseMatch = noise.confidence === 0 ? 0.5 : 1 - Math.abs(noise.value - query.targetNoise);
    const crowdMatch = crowd.confidence === 0 ? 0.5 : 1 - Math.abs(crowd.value - query.targetCrowd);
    const amenityFeatures = preferred.map((key) => amenity(spot[key]));
    const ratingKnown = spot.rating.value !== null && spot.reviewCount.value !== null;
    const features = {
      P: known(1 - walk / query.maxWalkMinutes),
      A: known(0.6 * noiseMatch + 0.4 * crowdMatch, 0.6 * noise.confidence + 0.4 * crowd.confidence),
      V: vibe(spot, query),
      Q: ratingKnown ? known(((spot.reviewCount.value! * spot.rating.value! + 20 * 4) /
        (spot.reviewCount.value! + 20)) / 5, Math.min(spot.rating.confidence, spot.reviewCount.confidence)) : known(0.8, 0),
      B: spot.priceLevel.value === null ? unknown() : known(1 - spot.priceLevel.value / 4, spot.priceLevel.confidence),
      M: amenityFeatures.length ? known(amenityFeatures.reduce((s, f) => s + f.value, 0) / amenityFeatures.length,
        amenityFeatures.reduce((s, f) => s + f.confidence, 0) / amenityFeatures.length) : unknown(),
      G: numeric(spot.groupFriendly),
    };
    let base = 0, coverage = 0;
    for (const key of Object.keys(weights) as (keyof typeof weights)[]) {
      const w = weights[key] / weightTotal;
      base += w * features[key].value; coverage += w * features[key].confidence;
    }
    const reasons: RankingResult['reasons'] = [{ code: 'walk', text: `About ${walk} min estimated walk`, evidenceIds: [] }];
    if (query.maxPriceLevel !== null) reasons.push({ code: 'price', text: 'Within your price cap', evidenceIds: spot.priceLevel.evidenceIds ?? [] });
    if (spot.noise.value !== null && spot.noise.confidence >= 0.7 && Math.abs(spot.noise.value - query.targetNoise) <= 0.2) {
      reasons.push({ code: 'atmosphere', text: spot.datasetMode === 'demo' ? 'Demo atmosphere fits your preference' : 'Atmosphere evidence fits your preference', evidenceIds: spot.noise.evidenceIds ?? [] });
    }
    const warnings = [];
    if (!hoursKnown) warnings.push('Opening hours unknown or stale');
    else if (!open) warnings.push('Hours do not cover the full session');
    if (spot.priceLevel.value === null) warnings.push('Price unknown');
    if (noise.confidence === 0) warnings.push('Noise unknown');
    if (crowd.confidence === 0) warnings.push('Typical activity unknown; no seat availability estimate');
    if (spot.status === 'unknown') warnings.push('Operating status unknown');
    results.push({ spotId: spot.id, score: 100 * clamp(base - 0.10 * (1 - coverage)),
      evidenceCoverage: coverage, estimatedWalkMinutes: walk, arrivalAt: new Date(arrivalMs).toISOString(),
      reasons: reasons.slice(0, 3), warnings });
  }
  results.sort((a, b) => b.score - a.score || b.evidenceCoverage - a.evidenceCoverage ||
    a.estimatedWalkMinutes - b.estimatedWalkMinutes || (a.spotId < b.spotId ? -1 : a.spotId > b.spotId ? 1 : 0));
  const relaxations = [];
  if ((excludedCounts.distance ?? 0) > 0 && query.maxWalkMinutes < 60) relaxations.push({
    label: `Try a ${Math.min(60, query.maxWalkMinutes + 5)}-minute estimated walk`,
    patch: { maxWalkMinutes: Math.min(60, query.maxWalkMinutes + 5) },
  });
  if ((excludedCounts.price ?? 0) + (excludedCounts.unknown_price ?? 0) > 0) relaxations.push({
    label: 'Remove the price cap', patch: { maxPriceLevel: null },
  });
  return { results: results.slice(0, query.limit), excludedCounts, relaxations,
    candidateCount: spots.length, qualifyingCount: results.length };
}
