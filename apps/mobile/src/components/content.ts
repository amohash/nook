import type { DatasetMode, Evidence, Spot } from '@space/contracts';

export function datasetLabel(mode: DatasetMode): string {
  return { demo: 'Demo scenario', cached: 'Cached dataset', live: 'Live request · source times vary' }[mode];
}

export function evidenceLabel(evidence: Evidence<unknown>): string {
  const unknown = evidence.value === null || evidence.value === 'unknown';
  return [unknown ? 'Unknown' : null, `Source: ${evidence.source}`,
    evidence.observedAt ? `Observed: ${evidence.observedAt}` : 'Observation time unknown',
    `Fetched: ${evidence.fetchedAt}`].filter(Boolean).join(' · ');
}

export function priceLabel(price: Spot['priceLevel']['value']): string {
  return price === null ? 'Price unknown' : price === 0 ? 'Free' : '$'.repeat(price);
}

export function ratingLabel(rating: Spot['rating']['value'], reviews: Spot['reviewCount']['value']): string {
  const quality = rating === null ? 'Rating unknown' : `Rating ${rating}/5`;
  return `${quality} · ${reviews === null ? 'Review count unknown' : `${reviews} ${reviews === 1 ? 'review' : 'reviews'}`}`;
}
