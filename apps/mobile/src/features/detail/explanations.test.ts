import { describe, expect, it } from 'vitest';
import { createDemoQuery, snapshot } from '@space/fixtures';
import { fixtureProvider } from '../../data/providers';
import { isShareCancellation, matchingRecommendation, publicAccessLabel, publicMapsUrl,
  shareMessage, supportedReasons, type RecommendationContext } from './explanations';

async function example() {
  const query = createDemoQuery();
  const response = await fixtureProvider.recommend(query);
  const spot = response.results[0]!.spot;
  const context: RecommendationContext = {query, response};
  return {query, response, spot, context};
}

describe('detail recommendation context', () => {
  it('uses exactly the existing ranking reasons, warnings and arrival for a matching place', async () => {
    const {query, response, spot, context} = await example();
    const result = matchingRecommendation(spot, query, context);
    expect(result).toBe(response.results[0]);
    expect(supportedReasons(spot, result).map(({evidence: _evidence, ...reason}) => reason))
      .toEqual(result!.reasons);
  });
  it('invalidates every changed query field, including nested origin, preferences, time and strict filters', async () => {
    const {query, spot, context} = await example();
    const changed = {...query, schemaVersion: 2, cityId: 'other', origin: {...query.origin, lat: query.origin.lat + 1},
      departAt: '2026-10-26T00:00:00Z', sessionMinutes: 90, categories: ['other'], maxWalkMinutes: 60,
      maxPriceLevel: 4, requireOpenForSession: !query.requireOpenForSession, intent: 'friends', groupSize: 8,
      targetNoise: 0.99, targetCrowd: 0.99, tagWeights: {lively: 1}, amenities: {wifi: 'require', outlets: 'require'},
      access: 'public_only', limit: 10};
    for (const key of Object.keys(query) as (keyof typeof query)[]) {
      if (JSON.stringify(query[key]) === JSON.stringify(changed[key])) continue;
      expect(matchingRecommendation(spot, {...query, [key]: changed[key]}, context), key).toBeNull();
    }
    expect(matchingRecommendation(spot, {...query, tagWeights: Object.fromEntries(Object.entries(query.tagWeights).reverse())}, context))
      .not.toBeNull();
  });
  it('rejects absent, old, cross-city, cross-mode and changed dataset contexts', async () => {
    const {query, spot, context} = await example();
    expect(matchingRecommendation(spot, query, null)).toBeNull();
    expect(matchingRecommendation({...spot, cityId: 'other'}, query, context)).toBeNull();
    expect(matchingRecommendation({...spot, datasetMode: 'cached'}, query, context)).toBeNull();
    expect(matchingRecommendation({...spot, datasetVersion: 'new'}, query, context)).toBeNull();
    expect(matchingRecommendation({...spot, wifi: {...spot.wifi, value: 'no'}}, query, context)).toBeNull();
    expect(matchingRecommendation({...spot, fetchedAt: '2026-10-26T00:00:00Z'}, query, context)).toBeNull();
  });
  it('never promotes saved/lookup places outside the returned shortlist or excluded by current filters', async () => {
    const {query, response, context} = await example();
    const unranked = snapshot.spots.find((spot) => !response.results.some((result) => result.spotId === spot.id))!;
    expect(matchingRecommendation(unranked, query, context)).toBeNull();
    const strict = {...query, maxPriceLevel: 0, categories: ['cafe']};
    const strictContext = {query: strict, response: await fixtureProvider.recommend(strict)};
    expect(matchingRecommendation(response.results[0]!.spot, strict, strictContext)).toBeNull();
  });
  it('omits unsupported reason codes, unknown facts and mismatched evidence references', async () => {
    const {spot, response} = await example();
    const result = {...response.results[0]!, reasons: [
      {code: 'wifi', text: 'Wi-Fi supported', evidenceIds: ['missing']},
      {code: 'seats', text: 'Seats available', evidenceIds: []},
      {code: 'price', text: 'Within cap', evidenceIds: []},
    ]};
    expect(supportedReasons({...spot, priceLevel: {...spot.priceLevel, value: null}}, result)).toEqual([]);
    expect(supportedReasons(spot, null)).toEqual([]);
  });
});

describe('public access and native share content', () => {
  it('distinguishes public, restricted, null and unknown access', async () => {
    const {spot} = await example();
    for (const value of [null, 'unknown', 'no', 'yes'] as const) {
      const text = publicAccessLabel({...spot, publicAccess: {...spot.publicAccess, value}});
      expect(text).toContain(value === 'yes' ? 'supported by source evidence' : value === 'no' ? 'restricted' : 'unknown');
    }
  });
  it('shares real place name, scorer reasons, warnings and public Maps without origin or serialized context', async () => {
    const {query, spot, response} = await example();
    const real = {...spot, datasetMode: 'cached' as const, providerPlaceId: 'place id&x=1'};
    const result = {...response.results[0]!, spot: real, warnings: ['Public access unknown']};
    const context = {query, response: {...response, mode: 'cached' as const, results: [result]}};
    const message = shareMessage(real, query, context);
    expect(message).toContain(real.name);
    expect(message).toContain(result.reasons[0]!.text);
    expect(message).toContain('Note: Public access unknown');
    expect(message).toContain(publicMapsUrl(real));
    expect(message).not.toContain(JSON.stringify(query.origin));
    expect(message).not.toContain('requestId');
    const url = new URL(publicMapsUrl(real)!);
    expect(url.hostname).toBe('www.google.com');
    expect(url.searchParams.get('query_place_id')).toBe(real.providerPlaceId);
    expect(url.searchParams.get('query')).toBe(`${real.lat},${real.lng}`);
  });
  it('shares facts without fit claims when context is missing or stale', async () => {
    const {query, spot, context} = await example();
    const message = shareMessage(spot, {...query, maxWalkMinutes: 60}, context);
    expect(message).toContain('fit with current preferences has not been verified');
    expect(message).not.toContain('Fits my selected preferences');
    expect(shareMessage(spot, query, null)).not.toContain('estimated walk');
  });
  it('labels synthetic demo facts and never links fictional coordinates', async () => {
    const {query, spot, context} = await example();
    const message = shareMessage(spot, query, context);
    expect(message).toContain('Demo scenario — fictional venue and synthetic facts');
    expect(message).toContain('Maps unavailable for fictional demo places');
    expect(message).not.toContain('https://');
    expect(publicMapsUrl(spot)).toBeNull();
  });
  it('recognizes cancellation rejections without hiding other failures', () => {
    for (const code of ['ERR_CANCELED', 'ERR_CANCELLED', 'ECANCELLED']) expect(isShareCancellation({code})).toBe(true);
    expect(isShareCancellation({name: 'AbortError'})).toBe(true);
    expect(isShareCancellation(new Error('unavailable'))).toBe(false);
    expect(isShareCancellation({code: 'E_UNAVAILABLE'})).toBe(false);
    expect(isShareCancellation(null)).toBe(false);
    // React Native dismissedAction is a fulfilled result; it never enters the error handler.
  });
});
