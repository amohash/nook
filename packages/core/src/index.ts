import { InstantSchema, QuerySchema, SpotSchema, type Evidence, type ExclusionCode, type Query,
  type RankingResult, type Spot } from '@space/contracts';
import { coversSession } from './hours';
export { coversSession } from './hours';

export type Clock = { now: string };
type Feature = { value: number; confidence: number };
export type ScoreDiagnostic = {
  spotId: string;
  components: Record<string, Feature & { weight: number; contribution: number }>;
  base: number; evidenceCoverage: number; uncertaintyPenalty: number; score: number;
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const known = (value: number, confidence = 1): Feature => ({ value: clamp(value), confidence: clamp(confidence) });
const unknown = (): Feature => known(0.5, 0);
// Confidence values are engineering heuristics, never calibrated probabilities.
const confidence = (e: Evidence<unknown>) => Math.min(e.confidence,
  e.source === 'muse' ? 0.7 : e.source === 'curated' ? 0.9 : 1);
const numeric = (e: Evidence<number>): Feature => e.value === null || confidence(e) === 0
  ? unknown() : known(e.value, confidence(e));
const amenity = (e: Evidence<string>): Feature =>
  e.value === null || e.value === 'unknown' || confidence(e) === 0 ? unknown() : known(e.value === 'yes' ? 1 : 0, confidence(e));
const positive = (e: Evidence<string>) => e.value === 'yes' && confidence(e) >= 0.7;
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
  return union ? known(intersection / union, confidence(spot.tags)) : unknown();
}
function crowdAt(spot: Spot, arrivalMs: number, now: number): Feature {
  if (!spot.typicalCrowd || !fresh(spot.typicalCrowd.fetchedAt, now, 7)) return unknown();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: spot.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', hourCycle: 'h23' })
    .formatToParts(arrivalMs).map((part) => [part.type, part.value]));
  // Hermes can label weekday text as a literal; use the venue-local calendar date.
  const weekday = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`).getUTCDay();
  const hour = Number(parts.hour);
  const entry = spot.typicalCrowd.entries.find((e) => e.weekday === weekday && e.hour === hour);
  return entry?.value === undefined || entry.value === null ? unknown() : known(entry.value, 0.9);
}

export function rankSpots(input: readonly Spot[], inputQuery: Query, clock: Clock,
  onScored?: (diagnostic: ScoreDiagnostic) => void) {
  const query = QuerySchema.parse(inputQuery), now = Date.parse(InstantSchema.parse(clock.now));
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
    else if (query.maxPriceLevel !== null && (spot.priceLevel.value === null || confidence(spot.priceLevel) === 0)) excluded = 'unknown_price';
    else if (query.maxPriceLevel !== null && spot.priceLevel.value! > query.maxPriceLevel) excluded = 'price';
    else if (query.requireOpenForSession && !hoursKnown) excluded = 'unknown_hours';
    else if (query.requireOpenForSession && !open) excluded = 'hours';
    else if ((['wifi', 'outlets'] as const).some((key) => query.amenities[key] === 'require' && !positive(spot[key]))) excluded = 'amenity';
    else if (query.access === 'public_only' && !positive(spot.publicAccess)) excluded = 'access';
    if (excluded) { excludedCounts[excluded] = (excludedCounts[excluded] ?? 0) + 1; continue; }

    const noise = fresh(spot.noise.observedAt ?? spot.noise.fetchedAt, now, 7) ? numeric(spot.noise) : unknown(), crowd = crowdAt(spot, arrivalMs, now);
    // Unknown subfeatures contribute neutral values, with zero confidence, before matching targets.
    const noiseMatch = noise.confidence === 0 ? 0.5 : 1 - Math.abs(noise.value - query.targetNoise);
    const crowdMatch = crowd.confidence === 0 ? 0.5 : 1 - Math.abs(crowd.value - query.targetCrowd);
    const amenityFeatures = preferred.map((key) => amenity(spot[key]));
    const ratingKnown = spot.rating.value !== null && spot.reviewCount.value !== null && confidence(spot.rating) > 0 && confidence(spot.reviewCount) > 0;
    const features = {
      P: known(1 - walk / query.maxWalkMinutes),
      A: known(0.6 * noiseMatch + 0.4 * crowdMatch, 0.6 * noise.confidence + 0.4 * crowd.confidence),
      V: vibe(spot, query),
      Q: ratingKnown ? known(((spot.reviewCount.value! * spot.rating.value! + 20 * 4) /
        (spot.reviewCount.value! + 20)) / 5, Math.min(confidence(spot.rating), confidence(spot.reviewCount))) : known(0.8, 0),
      B: spot.priceLevel.value === null || confidence(spot.priceLevel) === 0 ? unknown() : known(1 - spot.priceLevel.value / 4, confidence(spot.priceLevel)),
      M: amenityFeatures.length ? known(amenityFeatures.reduce((s, f) => s + f.value, 0) / amenityFeatures.length,
        amenityFeatures.reduce((s, f) => s + f.confidence, 0) / amenityFeatures.length) : unknown(),
      G: numeric(spot.groupFriendly),
    };
    let base = 0, coverage = 0;
    for (const key of Object.keys(weights) as (keyof typeof weights)[]) {
      const w = weights[key] / weightTotal;
      base += w * features[key].value; coverage += w * features[key].confidence;
    }
    // Optional instrumentation uses this exact calculation; never a separate scorer.
    onScored?.({ spotId: spot.id, base, evidenceCoverage: coverage,
      uncertaintyPenalty: 0.10 * (1 - coverage), score: 100 * clamp(base - 0.10 * (1 - coverage)),
      components: Object.fromEntries((Object.keys(weights) as (keyof typeof weights)[]).map((key) =>
        [key, { ...features[key], weight: weights[key] / weightTotal,
          contribution: weights[key] / weightTotal * features[key].value }])) });
    const reasons: RankingResult['reasons'] = [{ code: 'walk', text: `About ${walk} min estimated walk`, evidenceIds: [] }];
    if (query.maxPriceLevel !== null) reasons.push({ code: 'price', text: `Price level ${spot.priceLevel.value}/4 is within your cap of ${query.maxPriceLevel}/4`, evidenceIds: spot.priceLevel.evidenceIds ?? [] });
    if (spot.noise.value !== null && noise.confidence >= 0.7 && Math.abs(spot.noise.value - query.targetNoise) <= 0.2) {
      reasons.push({ code: 'atmosphere', text: spot.datasetMode === 'demo' ? 'Demo atmosphere fits your preference' : 'Atmosphere evidence fits your preference', evidenceIds: spot.noise.evidenceIds ?? [] });
    }
    for (const key of ['wifi', 'outlets'] as const) {
      if (query.amenities[key] !== 'ignore' && positive(spot[key])) reasons.push({
        code: key, text: `${key === 'wifi' ? 'Wi-Fi' : 'Outlets'} supported by ${spot[key].source === 'muse' ? 'review inference' : 'source evidence'}`,
        evidenceIds: spot[key].evidenceIds ?? [],
      });
    }
    const warnings = [];
    if (spot.datasetMode === 'demo') warnings.push('Demo scenario: fictional venues and synthetic facts');
    if (spot.publicAccess.value === null || spot.publicAccess.value === 'unknown') warnings.push('Public access unknown');
    for (const key of ['wifi', 'outlets'] as const) {
      if (query.amenities[key] !== 'ignore' && amenity(spot[key]).confidence === 0) warnings.push(`${key === 'wifi' ? 'Wi-Fi' : 'Outlets'} unknown`);
    }
    if (spot.rating.value === null) warnings.push('Rating unknown; scoring uses a prior');
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
  const relaxations: { label: string; patch: Partial<Query> }[] = [];
  if ((excludedCounts.distance ?? 0) > 0 && query.maxWalkMinutes < 60) relaxations.push({
    label: `Try a ${Math.min(60, query.maxWalkMinutes + 5)}-minute estimated walk`,
    patch: { maxWalkMinutes: Math.min(60, query.maxWalkMinutes + 5) },
  });
  if ((excludedCounts.price ?? 0) + (excludedCounts.unknown_price ?? 0) > 0) relaxations.push({
    label: 'Remove the price cap', patch: { maxPriceLevel: null },
  });
  if (excludedCounts.category) relaxations.push({ label: 'Consider all categories', patch: { categories: [] } });
  if (excludedCounts.hours || excludedCounts.unknown_hours) relaxations.push({
    label: 'Include places without verified full-session opening hours', patch: { requireOpenForSession: false },
  });
  if (excludedCounts.amenity) for (const key of ['wifi', 'outlets'] as const) {
    if (query.amenities[key] === 'require') relaxations.push({
      label: `Prefer ${key === 'wifi' ? 'Wi-Fi' : 'outlets'} instead of requiring it`,
      patch: { amenities: { ...query.amenities, [key]: 'prefer' } },
    });
  }
  if (excludedCounts.access) relaxations.push({ label: 'Include places without verified public access', patch: { access: 'any' } });
  return { results: results.slice(0, query.limit), excludedCounts,
    // QuerySchema.partial() applies limit's default during response parsing. Preserve the user's limit.
    relaxations: relaxations.map((r) => ({ ...r, patch: { ...r.patch, limit: query.limit } })),
    candidateCount: spots.length, qualifyingCount: results.length };
}
