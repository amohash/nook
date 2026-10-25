import { CitySchema, QuerySchema, RecommendationSchema, SnapshotSchema, SpotDetailSchema, type DataProvider } from '@space/contracts';
import { rankSpots } from '@space/core';
import dataset from './campus-dataset.json';
import { PlaceNotFoundError } from './providers';

export const campusCity = CitySchema.parse(dataset.city);
export const campusSnapshot = SnapshotSchema.parse(dataset.snapshot);
const details = dataset.details.map((detail) => SpotDetailSchema.parse(detail));
let request = 0;

/** Bundled real places: provider captures plus explicitly team-provided study notes. */
export const campusProvider: DataProvider = {
  async listCities() {return [campusCity];},
  async listSpots(id) {
    if (id !== campusCity.id) throw new Error('City not found');
    return campusSnapshot;
  },
  async getSpot(id) {
    const detail = details.find((item) => item.spot.id === id);
    if (!detail) throw new PlaceNotFoundError();
    return detail;
  },
  async recommend(input) {
    const query = QuerySchema.parse(input);
    if (query.cityId !== campusCity.id) throw new Error('City not found');
    const now = new Date().toISOString(), started = performance.now();
    const ranked = rankSpots(campusSnapshot.spots, query, {now});
    return RecommendationSchema.parse({schemaVersion: 1, requestId: `campus-${++request}`,
      mode: 'cached', datasetVersion: campusCity.datasetVersion, generatedAt: now,
      results: ranked.results.map((result) => ({...result, spot: campusSnapshot.spots.find((spot) => spot.id === result.spotId)!})),
      excludedCounts: ranked.excludedCounts, relaxations: ranked.relaxations,
      metrics: {rankMs: performance.now() - started, candidateCount: ranked.candidateCount,
        qualifyingCount: ranked.qualifyingCount, externalCalls: 0, cacheHits: 0}});
  },
};
