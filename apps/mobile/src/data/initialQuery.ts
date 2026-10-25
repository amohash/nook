import { type City, type Query } from '@space/contracts';
import { createDemoQuery, DEMO_NOW } from '@space/fixtures';

// Discover identity from the provider; API transport may serve demo or real data.
export function createInitialQuery(city: City, now: string): Query {
  return createDemoQuery({ cityId: city.id,
    origin: { lat: city.lat, lng: city.lng, source: 'manual' },
    departAt: city.mode === 'demo' ? DEMO_NOW : now });
}
