import { describe, expect, it } from 'vitest';
import { SpotDetailSchema } from '@space/contracts';
import { rankSpots } from '@space/core';
import { campusCity, campusProvider, campusSnapshot } from './campus';
import { createInitialQuery } from './initialQuery';

describe('real UT Austin study collection', () => {
  it('bundles five real identities and public SerpApi photos, without fictional evidence', async () => {
    expect(campusSnapshot.spots).toHaveLength(5);
    expect(new Set(campusSnapshot.spots.map((spot) => spot.providerPlaceId)).size).toBe(5);
    expect(JSON.stringify(campusSnapshot)).not.toMatch(/fictional|synthetic/);
    for (const spot of campusSnapshot.spots) {
      expect(spot.datasetMode).toBe('cached');
      expect(spot.image?.attribution).toContain('SerpApi');
      expect(new URL(spot.image!.url).protocol).toBe('https:');
      expect(spot.image!.url).not.toMatch(/api_key|service_role|sb_secret/);
      expect(SpotDetailSchema.safeParse(await campusProvider.getSpot(spot.id)).success).toBe(true);
    }
  });
  it('shows all five initially and applies the shared strict ranker without overriding winners', async () => {
    const query = {...createInitialQuery(campusCity, new Date().toISOString()), limit: 200};
    const expected = rankSpots(campusSnapshot.spots, query, {now: new Date().toISOString()});
    const actual = await campusProvider.recommend(query);
    expect(actual.results.map((result) => result.spotId)).toEqual(expected.results.map((result) => result.spotId));
    expect(actual.results).toHaveLength(5);
    const publicOnly = await campusProvider.recommend({...query, access: 'public_only'});
    expect(publicOnly.results.every((result) => result.spot.publicAccess.value === 'yes')).toBe(true);
    expect(publicOnly.results.some((result) => /Flawn|Life Science/.test(result.spot.name))).toBe(false);
  });
  it('keeps team notes distinct from provider observations and does not invent numeric crowd history', async () => {
    const fac = campusSnapshot.spots.find((spot) => spot.name.includes('Flawn'))!;
    const detail = await campusProvider.getSpot(fac.id);
    expect(fac.publicAccess).toMatchObject({source: 'curated', value: 'no', observedAt: null});
    expect(fac.wifi).toMatchObject({source: 'curated', value: 'yes'});
    expect(fac.typicalCrowd).toBeNull();
    expect(detail.evidence.some((item) => item.text.includes('Moderately busy'))).toBe(true);
    const lucky = campusSnapshot.spots.find((spot) => spot.name.includes('Lucky'))!;
    expect(lucky.priceLevel.value).toBeNull(); // $10+ is an approximate amount, not a dollar-sign tier.
  });
});
