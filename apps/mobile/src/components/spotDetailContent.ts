export const DETAIL_FACT_LABELS = {
  wifi: 'Wi-Fi', outlets: 'Outlets', noise: 'Noise', price: 'Price', hours: 'Hours', publicAccess: 'Public access',
} as const;

/** D formats known values; null/empty/unknown remain unknown. No hours logic. */
export type SpotDetailFacts = { [K in keyof typeof DETAIL_FACT_LABELS]: string | null };

export function detailFacts(facts: SpotDetailFacts) {
  const known: { id: keyof SpotDetailFacts; label: string; value: string }[] = [];
  const unknown: string[] = [];
  for (const id of Object.keys(DETAIL_FACT_LABELS) as (keyof SpotDetailFacts)[]) {
    const value = facts[id]?.trim();
    const label = DETAIL_FACT_LABELS[id];
    // Field labels are capitalized; the run-in caption keeps sentence case (Wi-Fi stays as written).
    if (!value || value.toLowerCase() === 'unknown') unknown.push(id === 'wifi' ? label : label.toLowerCase());
    else known.push({ id, label, value });
  }
  return { known, unknownCaption: unknown.length ? `Not yet known: ${unknown.join(', ')}` : null };
}

export function detailMeta({ category, walkMinutes, rating, reviewCount }: {
  category?: string | null; walkMinutes?: number | null; rating?: number | null; reviewCount?: number | null;
}) {
  const finite = (value: number | null | undefined) => value != null && Number.isFinite(value) && value >= 0;
  const quality = finite(rating) ? `★ ${rating}${finite(reviewCount) ? ` (${reviewCount})` : ''}`
    : finite(reviewCount) ? `${reviewCount} reviews` : null;
  return [category?.trim(), finite(walkMinutes) ? `${Math.round(walkMinutes!)} min walk` : null, quality].filter(Boolean).join(' · ');
}
