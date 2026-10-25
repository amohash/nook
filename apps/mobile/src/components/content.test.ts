import { describe, expect, it } from 'vitest';
import { datasetLabel, evidenceLabel, priceLabel, ratingLabel } from './content';

describe('truthful shared UI labels', () => {
  it('keeps free, zero ratings and zero reviews distinct from unknowns', () => {
    expect(priceLabel(0)).toBe('Free');
    expect(priceLabel(null)).toBe('Price unknown');
    expect(ratingLabel(0, 0)).toBe('Rating 0/5 · 0 reviews');
    expect(ratingLabel(null, null)).toBe('Rating unknown · Review count unknown');
  });

  it('does not equate a live request with live observations', () => {
    expect(datasetLabel('live')).toBe('Live request · source times vary');
    expect(datasetLabel('demo')).toBe('Demo scenario');
    expect(datasetLabel('cached')).toBe('Cached dataset');
  });

  it('preserves source timestamps and unknown observation times', () => {
    expect(evidenceLabel({ value: null, source: 'synthetic', observedAt: null,
      fetchedAt: '2026-10-24T18:00:00-05:00', confidence: 0 })).toBe(
      'Unknown · Source: synthetic · Observation time unknown · Fetched: 2026-10-24T18:00:00-05:00');
  });

  it('treats an unknown amenity as unknown and does not hide an observed zero', () => {
    const base = { source: 'serpapi' as const, observedAt: '2026-10-24T18:00:00-05:00',
      fetchedAt: '2026-10-24T18:05:00-05:00', confidence: 0.5 };
    expect(evidenceLabel({ ...base, value: 'unknown' })).toContain('Unknown · Source: serpapi');
    expect(evidenceLabel({ ...base, value: 0 })).not.toContain('Unknown');
    expect(evidenceLabel({ ...base, value: 0 })).toContain(`Observed: ${base.observedAt}`);
  });
});
