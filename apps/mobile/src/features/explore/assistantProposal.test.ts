import { describe, expect, it } from 'vitest';
import { createDemoQuery } from '@space/fixtures';
import { applyAssistantProposal } from './assistantProposal';

describe('explicit assistant proposal application', () => {
  it('rejects attempts to replace identity, location, snapshot or time', () => {
    const query = createDemoQuery();
    for (const patch of [{origin: {lat: 0, lng: 0, source: 'device'}}, {cityId: 'other'},
      {snapshotId: 'other'}, {departAt: '2027-01-01T00:00:00Z'}, {maxPriceLevel: -1}]) {
      expect(() => applyAssistantProposal(query, query, patch)).toThrow();
    }
  });
  it('preserves strict constraints omitted from an explicitly applied patch', () => {
    const query = createDemoQuery({maxPriceLevel: 1, categories: ['library'], maxWalkMinutes: 5,
      amenities: {wifi: 'require', outlets: 'require'}, requireOpenForSession: true});
    const next = applyAssistantProposal(query, query, {targetNoise: 0.1});
    expect(next).toEqual({...query, targetNoise: 0.1});
  });
  it('discards a proposal after another origin or filter change', () => {
    const reviewed = createDemoQuery();
    const current = {...reviewed, origin: {...reviewed.origin, lat: 30.3}, maxPriceLevel: 0};
    expect(applyAssistantProposal(current, reviewed, {maxWalkMinutes: 60})).toBe(current);
  });
});
