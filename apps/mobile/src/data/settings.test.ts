import { describe, expect, it } from 'vitest';
import { cities, createDemoQuery } from '@space/fixtures';
import { applyPreferences, applyStudyStyles, createSettingsStore, defaultSettings,
  restoredQuery, settingsKey, type SettingsStorage } from './settings';

function memory() {
  const values = new Map<string, string>();
  const storage: SettingsStorage = {
    async getItem(key) {return values.get(key) ?? null;},
    async setItem(key, value) {values.set(key, value);},
  };
  return {values, storage, store: createSettingsStore(storage)};
}
describe('device preference persistence', () => {
  it('keeps demo, real city and capture versions separate', () => {
    const city = cities[0]!;
    expect(new Set([settingsKey(city), settingsKey({...city, mode: 'cached'}),
      settingsKey({...city, datasetVersion: 'next'}), settingsKey({...city, id: 'different'})]).size).toBe(4);
  });
  it('round trips preferences without storing GPS coordinates or a stale departure time', async () => {
    const {store, values} = memory();
    const query = createDemoQuery({origin: {lat: 10, lng: 20, source: 'device'}, maxPriceLevel: 0});
    const settings = {...defaultSettings(query), completed: true, styles: ['wifi'] as const};
    await store.save('test', {...settings, styles: [...settings.styles]});
    const saved = await store.load('test');
    expect(saved?.preferences.maxPriceLevel).toBe(0);
    expect(saved?.completed).toBe(true);
    expect(values.get('test')).not.toContain('origin');
    expect(values.get('test')).not.toContain('departAt');
    expect(await store.load('missing')).toBeNull();
  });
  it('surfaces corrupt storage and write failure instead of claiming a save', async () => {
    const {store, values} = memory();
    values.set('bad', '{broken');
    await expect(store.load('bad')).rejects.toThrow();
    const failing = createSettingsStore({async getItem() {throw new Error('read failed');},
      async setItem() {throw new Error('disk full');}});
    await expect(failing.load('x')).rejects.toThrow('read failed');
    await expect(failing.save('x', defaultSettings(createDemoQuery()))).rejects.toThrow('disk full');
  });
  it('serializes reset after an in-flight save', async () => {
    let release: (() => void) | undefined;
    const writes: string[] = [];
    const store = createSettingsStore({async getItem() {return null;}, async setItem(_key, value) {
      if (!writes.length) await new Promise<void>((resolve) => {release = resolve;});
      writes.push(value);
    }});
    const defaults = defaultSettings(createDemoQuery());
    const save = store.save('x', {...defaults, completed: true});
    const reset = store.save('x', defaults);
    await Promise.resolve();
    release!();
    await Promise.all([save, reset]);
    expect(JSON.parse(writes[0]!).completed).toBe(true);
    expect(JSON.parse(writes[1]!).completed).toBe(false);
  });
  it('keeps current origin/time and unrelated strict constraints when preferences are saved', () => {
    const query = createDemoQuery({categories: ['library'], requireOpenForSession: true, access: 'public_only',
      origin: {lat: 30, lng: -97, source: 'device'}, departAt: '2026-10-26T01:00:00Z'});
    const next = applyPreferences(query, {...query, intent: 'friends', maxPriceLevel: 0,
      amenities: {wifi: 'require', outlets: 'require'}});
    expect(next).toMatchObject({categories: ['library'], requireOpenForSession: true, access: 'public_only',
      origin: query.origin, departAt: query.departAt, maxPriceLevel: 0, groupSize: 4});
    expect(next.amenities).toEqual({wifi: 'require', outlets: 'require'});
    expect(query.intent).toBe('study');
  });
  it('uses supported soft inputs without inventing whiteboards or coffee filters', () => {
    const query = createDemoQuery({categories: ['library'], amenities: {wifi: 'require', outlets: 'require'}});
    const next = applyStudyStyles(query, ['whiteboards', 'coffee_nearby', 'quiet', 'some_chatter', 'outdoor', 'solo']);
    expect(next.categories).toEqual(['library']);
    expect(next.amenities).toEqual(query.amenities);
    expect(next.tagWeights).not.toHaveProperty('whiteboards');
    expect(next.tagWeights).not.toHaveProperty('coffee_nearby');
    expect(next.tagWeights.outdoor).toBe(1);
    expect(next.targetNoise).toBe(0.4);
    expect(next.groupSize).toBe(1);
  });
  it('restores saved preference edits ahead of earlier onboarding tags', () => {
    const city = {...cities[0]!, id: 'us-tx-austin', mode: 'cached' as const};
    const settings = {...defaultSettings(createDemoQuery()), completed: true, styles: ['outdoor'] as ['outdoor']};
    settings.preferences.tagWeights = {cozy: 1};
    const restored = restoredQuery(city, settings, '2026-10-26T01:00:00Z');
    expect(restored.tagWeights).toEqual({cozy: 1});
    expect(restored.cityId).toBe('us-tx-austin');
    expect(restored.departAt).toBe('2026-10-26T01:00:00Z');
    expect(restored.origin.source).toBe('manual');
  });
});
