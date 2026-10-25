import { type City, type Query } from '@space/contracts';
import { createDemoQuery, DEMO_NOW } from '@space/fixtures';

// Discover identity from the provider; API transport may serve demo or real data.
export function createInitialQuery(city: City, now: string): Query {
  return createDemoQuery({ cityId: city.id,
    // Start real discovery with study venue categories, visibly selected in Filters.
    // Missing atmosphere evidence must not make a nearby restaurant the default study pick.
    ...(city.mode !== 'demo' ? { categories: ['cafe', 'library'] } : {}),
    origin: { lat: city.lat, lng: city.lng, source: 'manual' },
    departAt: city.mode === 'demo' ? DEMO_NOW : now });
}
