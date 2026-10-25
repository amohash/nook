import type { Recommendation } from '@space/contracts';

/** Presentation only: omit unavailable facts; consolidate several missing facts. */
export function compactCardDetails(result: Recommendation['results'][number]) {
  const { spot } = result;
  const category = spot.categories.filter(Boolean).join(' / ');
  const walk = Number.isFinite(result.estimatedWalkMinutes) && result.estimatedWalkMinutes >= 0
    ? `${Math.round(result.estimatedWalkMinutes)} min walk` : null;
  const rating = spot.rating.value;
  const count = spot.reviewCount.value;
  const quality = rating !== null ? `★ ${rating}${count !== null ? ` (${count})` : ''}`
    : count !== null ? `${count} reviews` : null;
  const missing = [!category, walk === null, rating === null, count === null].filter(Boolean).length;
  return { metadata: [category, walk, quality].filter(Boolean).join(' · '), limited: missing >= 2 };
}
