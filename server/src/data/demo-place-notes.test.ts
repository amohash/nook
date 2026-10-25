import { describe, expect, it } from 'vitest';
import { demoNoteWarnings, demoPlaceNotes } from '@space/fixtures';

const place = { cityId: 'us-tx-austin', datasetMode: 'cached' as const, lat: 30.2862, lng: -97.7394,
  providerPlaceId: 'ChIJK1vgC3i1RIYRsSCz9uP0hkQ', name: 'Lucky Lab Coffee Co.' };
describe('team-provided demo presentation notes', () => {
  it('attaches Lucky Lab notes to the captured provider identity, without modifying the source place', () => {
    const before = structuredClone(place), result = demoPlaceNotes(place)!;
    expect(result.facts).toEqual({ publicAccess: 'Yes', wifi: 'University Wi-Fi available', outlets: 'Sufficient',
      price: '~$10+', noise: 'Medium', hours: '6:30 AM–5:00 PM' });
    expect(result.typicalActivity).toBe('Moderately busy'); expect(result.label).toContain('Team-provided');
    expect(result.label).toContain('not independently verified'); expect(place).toEqual(before);
  });
  it('retains restricted access and exact approximate prices rather than claiming public/free access', () => {
    const library = demoPlaceNotes({ ...place, providerPlaceId: 'ChIJgV2CQJ21RIYReuasCr8k6pE', name: 'Life Science Library' })!;
    expect(library.facts.publicAccess).toBe('No · restricted'); expect(library.facts.price).toBe('~$0+');
    expect(library.facts.hours).toBe('9:00 AM–6:00 PM'); expect(library.facts.noise).toBe('Low');
  });
  it('matches FAC only by exact campus title/location until a real provider identity is captured', () => {
    const fac = { ...place, providerPlaceId: 'test-fixture-only', name: 'Peter T. Flawn Academic Center (FAC)' };
    expect(demoPlaceNotes(fac)?.facts.hours).toBe('8:00 AM–6:00 PM');
    expect(demoPlaceNotes({ ...fac, name: 'Another Academic Center' })).toBeNull();
    expect(demoPlaceNotes({ ...fac, lat: 31 })).toBeNull();
  });
  it('does not annotate fictional demo fixtures, other cities, or another Lucky Lab branch matched by name', () => {
    expect(demoPlaceNotes({ ...place, datasetMode: 'demo' })).toBeNull();
    expect(demoPlaceNotes({ ...place, cityId: 'elsewhere' })).toBeNull();
    expect(demoPlaceNotes({ ...place, providerPlaceId: 'another-branch' })).toBeNull();
  });
  it('replaces repetitive unknown warnings while keeping supported closure/session warnings and access cautions', () => {
    const warnings = ['Wi-Fi unknown', 'Price unknown', 'Hours do not cover the full session', 'Temporarily closed'];
    expect(demoNoteWarnings(warnings, null)).toEqual(warnings);
    const note = demoPlaceNotes({ ...place, providerPlaceId: 'ChIJgV2CQJ21RIYReuasCr8k6pE' })!;
    const result = demoNoteWarnings(warnings, note);
    expect(result).not.toContain('Wi-Fi unknown'); expect(result).not.toContain('Price unknown');
    expect(result).toContain('Hours do not cover the full session'); expect(result).toContain('Temporarily closed');
    expect(result.some((text) => text.startsWith('Access is restricted'))).toBe(true);
  });
});
