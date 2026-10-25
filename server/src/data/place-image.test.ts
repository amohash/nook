import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { providerImage } from './place-image';
import { normalizePlace } from './normalize';
import { DatasetSchema } from './dataset';

describe('public place photos', () => {
  it('keeps a public provider thumbnail with attribution during normalization', () => {
    const url = 'https://lh3.googleusercontent.com/p/test-photo=w800-h600-k-no';
    const spot = normalizePlace({ place_id: 'test-photo', title: 'Test cafe', address: 'Test address',
      gps_coordinates: { latitude: 30.28, longitude: -97.74 }, thumbnail: url },
    '2026-10-25T01:00:00Z', 'austin-photo-test');
    expect(spot.image).toEqual({ url, attribution: 'Google Maps via SerpApi' });
  });
  it.each([undefined, {}, 'bad', 'http://lh3.googleusercontent.com/p/photo',
    'https://lh3.googleusercontent.com.evil.example/p/photo',
    'https://serpapi.com/photo?api_key=private', 'https://user:private@lh3.googleusercontent.com/p/photo',
    'https://lh3.googleusercontent.com/p/photo?token=private', 'https://lh3.googleusercontent.com:444/p/photo'])(
    'withholds unsafe or missing image sources without losing the place: %j', (thumbnail) => {
    expect(providerImage(thumbnail)).toBeNull();
    expect(normalizePlace({ place_id: 'test', title: 'Test', address: 'Test',
      gps_coordinates: { latitude: 0, longitude: 0 }, thumbnail },
    '2026-10-25T01:00:00Z', 'austin-photo-test').image).toBeNull();
  });
  it('covers all thirty places while preserving Muse records, citations and captured facts', async () => {
    const read = async (name: string) => DatasetSchema.parse(JSON.parse(await readFile(
      new URL(`../../../fixtures/data/${name}.json`, import.meta.url), 'utf8')));
    const original = await read('austin-20261025-muse-v1');
    const photos = await read('austin-20261025-muse-photos-v1');
    expect(photos.snapshot.spots).toHaveLength(30);
    for (const spot of photos.snapshot.spots) {
      expect(spot.image).toEqual(providerImage(spot.image?.url));
      expect(spot.image).not.toBeNull();
      spot.image = null; spot.datasetVersion = original.city.datasetVersion;
    }
    photos.city.datasetVersion = original.city.datasetVersion;
    photos.snapshot.datasetVersion = original.city.datasetVersion;
    photos.details.forEach((detail) => { detail.spot.image = null; detail.spot.datasetVersion = original.city.datasetVersion; });
    expect(photos).toEqual(original);
  });
});
