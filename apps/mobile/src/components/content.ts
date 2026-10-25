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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const ISO_WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/** Readable source time at the source's own wall clock; no time zone conversion. Raw value if unparseable. */
export function sourceTime(iso: string): string {
  const match = ISO_WALL_CLOCK.exec(iso);
  if (!match) return iso;
  const month = Number(match[2]), day = Number(match[3]), hour = Number(match[4]), minute = Number(match[5]);
  const monthName = MONTHS[month - 1];
  if (!monthName || day < 1 || day > 31 || hour > 23 || minute > 59) return iso;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${monthName} ${day}, ${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function datasetCaption(mode: DatasetMode, description?: string): string {
  const label = datasetLabel(mode);
  if (!description) return label;
  return description.toLowerCase().startsWith(label.toLowerCase()) ? description : `${label} · ${description}`;
}

export function filtersChipLabel(count: number) {
  return count > 0
    ? { label: `Filters · ${count}`, accessibilityLabel: `Filters, ${count} active` }
    : { label: 'Filters', accessibilityLabel: 'Filters, none active' };
}

/** Compact cards show one note and a count; details show every warning. */
export function cardNotes(warnings: readonly string[]) {
  return { first: warnings[0] ?? null, more: Math.max(0, warnings.length - 1) };
}
