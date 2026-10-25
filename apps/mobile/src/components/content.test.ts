import { describe, expect, it } from 'vitest';
import { cardNotes, datasetCaption, datasetLabel, evidenceLabel, filtersChipLabel, priceLabel, ratingLabel,
  sourceTime } from './content';

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

  it('formats source timestamps at the source wall clock without converting time zones', () => {
    expect(sourceTime('2026-10-24T18:00:00-05:00')).toBe('Oct 24, 6:00 PM');
    expect(sourceTime('2026-01-03T00:05:00Z')).toBe('Jan 3, 12:05 AM');
    expect(sourceTime('2026-07-09T12:30:00+02:00')).toBe('Jul 9, 12:30 PM');
  });

  it('falls back to the raw value instead of inventing a time', () => {
    expect(sourceTime('unknown')).toBe('unknown');
    expect(sourceTime('2026-13-40T99:00:00Z')).toBe('2026-13-40T99:00:00Z');
  });

  it('does not repeat the dataset label when the description already starts with it', () => {
    expect(datasetCaption('demo', 'Demo scenario · fictional venues and synthetic facts'))
      .toBe('Demo scenario · fictional venues and synthetic facts');
    expect(datasetCaption('demo', 'Fictional venue')).toBe('Demo scenario · Fictional venue');
    expect(datasetCaption('cached')).toBe('Cached dataset');
  });

  it('labels the filters control without a zero count', () => {
    expect(filtersChipLabel(0)).toEqual({ label: 'Filters', accessibilityLabel: 'Filters, none active' });
    expect(filtersChipLabel(2)).toEqual({ label: 'Filters · 2', accessibilityLabel: 'Filters, 2 active' });
    expect(filtersChipLabel(1)).toEqual({ label: 'Filters · 1', accessibilityLabel: 'Filters, 1 active' });
  });

  it('keeps the first warning visible and counts the rest instead of dropping them', () => {
    expect(cardNotes([])).toEqual({ first: null, more: 0 });
    expect(cardNotes(['Rating unknown'])).toEqual({ first: 'Rating unknown', more: 0 });
    expect(cardNotes(['A', 'B', 'C'])).toEqual({ first: 'A', more: 2 });
  });
});
