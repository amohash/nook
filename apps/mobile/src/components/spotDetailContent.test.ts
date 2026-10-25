import { describe, expect, it } from 'vitest';
import { detailFacts, detailMeta, type SpotDetailFacts } from './spotDetailContent';

const unknown: SpotDetailFacts = { wifi: null, outlets: null, noise: null, price: null, hours: null, publicAccess: null };
describe('detail display facts', () => {
  it('consolidates unknown facts into one caption and keeps known negative facts', () => {
    expect(detailFacts({ ...unknown, outlets: 'No', price: 'Free' })).toEqual({
      known: [{ id: 'outlets', label: 'Outlets', value: 'No' }, { id: 'price', label: 'Price', value: 'Free' }],
      unknownCaption: 'Not yet known: Wi-Fi, noise, hours, public access',
    });
  });
  it('does not turn blank or literal unknown values into known facts', () => {
    expect(detailFacts({ ...unknown, wifi: ' ', hours: 'unknown' }).known).toEqual([]);
    expect(detailFacts(unknown).unknownCaption).toBe('Not yet known: Wi-Fi, outlets, noise, price, hours, public access');
  });
  it('hides the unknown caption when all facts are supplied without interpreting hours', () => {
    const result = detailFacts({ wifi: 'Yes', outlets: 'No', noise: 'Low', price: 'Free', hours: 'D-computed hours', publicAccess: 'Public' });
    expect(result.unknownCaption).toBeNull();
    expect(result.known.find(({ id }) => id === 'hours')?.value).toBe('D-computed hours');
  });
  it('preserves zero walk/rating/count and skips absent metadata', () => {
    expect(detailMeta({ category: 'Library', walkMinutes: 0, rating: 0, reviewCount: 0 })).toBe('Library · 0 min walk · ★ 0 (0)');
    expect(detailMeta({ category: 'Cafe', rating: null, walkMinutes: null })).toBe('Cafe');
    expect(detailMeta({ walkMinutes: NaN, rating: null, reviewCount: 0 })).toBe('0 reviews');
    expect(detailMeta({})).toBe('');
  });
});
