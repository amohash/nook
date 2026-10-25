import { describe, expect, it } from 'vitest';
import { cities, DEMO_NOW, createDemoQuery } from '@space/fixtures';
import { createInitialQuery } from './initialQuery';

describe('provider city initialization', () => {
  it('preserves fixture defaults and the labeled demo clock', () => {
    expect(createInitialQuery(cities[0]!, '2030-01-01T12:00:00Z')).toEqual(createDemoQuery());
    expect(createInitialQuery(cities[0]!, DEMO_NOW).departAt).toBe(DEMO_NOW);
  });
  it.each(['cached', 'live'] as const)('uses advertised identity, origin and current time for %s data', (mode) => {
    const city = { ...cities[0]!, id: 'us-tx-austin', mode, lat: 30.29, lng: -97.74 };
    const query = createInitialQuery(city, '2026-10-25T03:00:00Z');
    expect(query.cityId).toBe(city.id);
    expect(query.origin).toEqual({lat: city.lat, lng: city.lng, source: 'manual'});
    expect(query.departAt).toBe('2026-10-25T03:00:00Z');
    expect(query.maxWalkMinutes).toBe(15);
    expect(query.categories).toEqual(['cafe', 'library']);
    expect(query.requireOpenForSession).toBe(false);
  });
});
