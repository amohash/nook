import type { Evidence, Query, RankingResult, Recommendation, Spot } from '@space/contracts';

export type RecommendationContext = {query: Query; response: Recommendation};

// Object key order is not part of query or fact identity. No context is persisted or routed.
function identity(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(identity).join(',')}]`;
  if (value !== null && typeof value === 'object') return JSON.stringify(Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, identity(item)]));
  return JSON.stringify(value) ?? 'undefined';
}

export function matchingRecommendation(spot: Spot, query: Query, context: RecommendationContext | null): RankingResult | null {
  if (!context || identity(query) !== identity(context.query) || spot.cityId !== query.cityId ||
    context.response.mode !== spot.datasetMode || context.response.datasetVersion !== spot.datasetVersion) return null;
  const result = context.response.results.find((item) => item.spotId === spot.id && item.spot.id === spot.id);
  // A newer detail snapshot must not inherit reasons based on older facts, even under the same ID.
  return result && identity(result.spot) === identity(spot) ? result : null;
}

export type DetailReason = RankingResult['reasons'][number] & {evidence?: Evidence<unknown>};
export function supportedReasons(spot: Spot, result: RankingResult | null): DetailReason[] {
  if (!result) return [];
  return result.reasons.flatMap((reason): DetailReason[] => {
    if (!reason.text.trim()) return [];
    if (reason.code === 'walk') return [{...reason}]; // Existing scorer's estimate, never a route guarantee.
    const facts: Record<string, Evidence<unknown>> = {
      price: spot.priceLevel, atmosphere: spot.noise, wifi: spot.wifi, outlets: spot.outlets,
    };
    const evidence = facts[reason.code];
    if (!evidence || evidence.value === null || evidence.value === 'unknown' || evidence.confidence <= 0 ||
      reason.evidenceIds.some((id) => !evidence.evidenceIds?.includes(id))) return [];
    return [{...reason, evidence}];
  }).slice(0, 3);
}

export function publicAccessLabel(spot: Spot): string {
  if (spot.publicAccess.value === 'yes') return 'Public access supported by source evidence; check current entry requirements.';
  if (spot.publicAccess.value === 'no') return 'Access is restricted; check entry requirements before visiting.';
  return 'Public access unknown; check entry requirements before visiting.';
}

// Always a public Maps URL for real venues; fictional places must never send someone to real coordinates.
export function publicMapsUrl(spot: Spot): string | null {
  if (spot.datasetMode === 'demo') return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spot.lat},${spot.lng}`)}${
    spot.providerPlaceId ? `&query_place_id=${encodeURIComponent(spot.providerPlaceId)}` : ''}`;
}

export function shareMessage(spot: Spot, query: Query, context: RecommendationContext | null): string {
  const result = matchingRecommendation(spot, query, context);
  const reasons = supportedReasons(spot, result);
  const url = publicMapsUrl(spot);
  return [spot.datasetMode === 'demo' ? `[Demo scenario — fictional venue and synthetic facts] ${spot.name}` : spot.name,
    spot.address,
    ...(result ? ['Fits my selected preferences:', ...reasons.map((reason) => `• ${reason.text}`),
      ...result.warnings.map((warning) => `Note: ${warning}`)] : ['Shared place; fit with current preferences has not been verified.']),
    publicAccessLabel(spot),
    ...(url ? [url] : ['Maps unavailable for fictional demo places.']),
  ].join('\n');
}

export function isShareCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('name' in error && error.name === 'AbortError') return true;
  if (!('code' in error)) return false;
  return error.code === 'ERR_CANCELED' || error.code === 'ERR_CANCELLED' || error.code === 'ECANCELLED';
}
