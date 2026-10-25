import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationObject, LocationPermissionResponse } from 'expo-location';
import { createDemoQuery } from '@space/fixtures';
import { fixtureProvider } from '../../data/providers';
import { applyExploreFilters } from './filters';
import { CAMPUS_ORIGIN, LOCATION_TIMEOUT_MS, requestDeviceOrigin, type ForegroundLocation } from './origin';

function permission(status: 'granted' | 'undetermined' | 'denied'): LocationPermissionResponse {
  return { status: status as LocationPermissionResponse['status'], granted: status === 'granted',
    canAskAgain: true, expires: 'never' };
}
function fix(): LocationObject {
  return { timestamp: Date.now(), coords: { latitude: CAMPUS_ORIGIN.lat, longitude: CAMPUS_ORIGIN.lng,
    accuracy: 25, altitude: null, altitudeAccuracy: null, heading: null, speed: null } };
}
function locationApi() {
  return {
    hasServicesEnabledAsync: vi.fn(async () => true),
    getForegroundPermissionsAsync: vi.fn(async () => permission('granted')),
    requestForegroundPermissionsAsync: vi.fn(async () => permission('granted')),
    getCurrentPositionAsync: vi.fn(async () => fix()),
  } satisfies ForegroundLocation;
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime('2026-10-24T23:00:00Z'); });
afterEach(() => { vi.useRealTimers(); });

describe('one-shot foreground origin lookup', () => {
  it('uses granted permission without prompting and returns the shared origin shape', async () => {
    const api = locationApi();
    const result = await requestDeviceOrigin(api, new AbortController().signal);
    expect(result).toEqual({ origin: { ...CAMPUS_ORIGIN, source: 'device' }, accuracyMeters: 25 });
    expect(api.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(api.getCurrentPositionAsync).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('asks for foreground permission once when undetermined', async () => {
    const api = locationApi();
    api.getForegroundPermissionsAsync.mockResolvedValue(permission('undetermined'));
    await requestDeviceOrigin(api, new AbortController().signal);
    expect(api.requestForegroundPermissionsAsync).toHaveBeenCalledOnce();
  });

  it('does not repeat a denied prompt or try to read coordinates', async () => {
    const api = locationApi();
    api.getForegroundPermissionsAsync.mockResolvedValue(permission('denied'));
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(requestDeviceOrigin(api, new AbortController().signal)).rejects.toMatchObject({ code: 'denied' });
    }
    expect(api.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(api.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('handles denial after the first foreground prompt', async () => {
    const api = locationApi();
    api.getForegroundPermissionsAsync.mockResolvedValue(permission('undetermined'));
    api.requestForegroundPermissionsAsync.mockResolvedValue(permission('denied'));
    await expect(requestDeviceOrigin(api, new AbortController().signal)).rejects.toMatchObject({ code: 'denied' });
    expect(api.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('handles disabled services without prompting', async () => {
    const api = locationApi(); api.hasServicesEnabledAsync.mockResolvedValue(false);
    await expect(requestDeviceOrigin(api, new AbortController().signal)).rejects.toMatchObject({ code: 'services' });
    expect(api.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(api.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('bounds a stalled fix and clears the deadline timer', async () => {
    const api = locationApi();
    api.getCurrentPositionAsync.mockImplementation(() => new Promise(() => {}));
    const pending = requestDeviceOrigin(api, new AbortController().signal);
    const rejected = expect(pending).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(LOCATION_TIMEOUT_MS);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not start a fix after permission arrives beyond the deadline', async () => {
    const api = locationApi();
    let grant!: (value: LocationPermissionResponse) => void;
    api.getForegroundPermissionsAsync.mockImplementation(() => new Promise((resolve) => { grant = resolve; }));
    const pending = requestDeviceOrigin(api, new AbortController().signal);
    const rejected = expect(pending).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(LOCATION_TIMEOUT_MS);
    await rejected;
    grant(permission('granted'));
    await vi.advanceTimersByTimeAsync(0);
    expect(api.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('ignores a late fix after manual selection cancels the request', async () => {
    const api = locationApi(), controller = new AbortController();
    let resolveFix!: (value: LocationObject) => void;
    api.getCurrentPositionAsync.mockImplementation(() => new Promise((resolve) => { resolveFix = resolve; }));
    const pending = requestDeviceOrigin(api, controller.signal);
    const rejected = expect(pending).rejects.toMatchObject({ code: 'cancelled' });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await rejected;
    resolveFix(fix());
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not request permission after cancellation during the service check', async () => {
    const api = locationApi(), controller = new AbortController();
    let enabled!: (value: boolean) => void;
    api.hasServicesEnabledAsync.mockImplementation(() => new Promise((resolve) => { enabled = resolve; }));
    const pending = requestDeviceOrigin(api, controller.signal);
    const rejected = expect(pending).rejects.toMatchObject({ code: 'cancelled' });
    controller.abort(); await rejected;
    enabled(true); await vi.advanceTimersByTimeAsync(0);
    expect(api.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it.each([NaN, Infinity, 91])('rejects invalid latitude %s', async (latitude) => {
    const api = locationApi(), value = fix(); value.coords.latitude = latitude;
    api.getCurrentPositionAsync.mockResolvedValue(value);
    await expect(requestDeviceOrigin(api, new AbortController().signal)).rejects.toMatchObject({ code: 'unavailable' });
  });

  it.each([-60_001, 5_001])('rejects an invalid timestamp offset of %s ms', async (offset) => {
    const api = locationApi(), value = fix(); value.timestamp += offset;
    api.getCurrentPositionAsync.mockResolvedValue(value);
    await expect(requestDeviceOrigin(api, new AbortController().signal)).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('offers manual mode when accuracy is too coarse for campus walking estimates', async () => {
    const api = locationApi(), value = fix(); value.coords.accuracy = 5000;
    api.getCurrentPositionAsync.mockResolvedValue(value);
    await expect(requestDeviceOrigin(api, new AbortController().signal)).rejects.toMatchObject({ code: 'inaccurate' });
  });

  it('preserves unknown accuracy as null', async () => {
    const api = locationApi(), value = fix(); value.coords.accuracy = null;
    api.getCurrentPositionAsync.mockResolvedValue(value);
    expect((await requestDeviceOrigin(api, new AbortController().signal)).accuracyMeters).toBeNull();
  });

  it('returns a safe fallback message for provider failure', async () => {
    const api = locationApi(); api.getCurrentPositionAsync.mockRejectedValue(new Error('native provider diagnostic'));
    await expect(requestDeviceOrigin(api, new AbortController().signal)).rejects.toMatchObject({
      code: 'unavailable', message: 'Location could not be read. Try again or use UT Austin.',
    });
  });

  it('ranks a distant device origin as no nearby fixture matches and preserves filters on manual fallback', async () => {
    const api = locationApi(), value = fix(); value.coords.latitude = 40.7; value.coords.longitude = -74;
    api.getCurrentPositionAsync.mockResolvedValue(value);
    const device = await requestDeviceOrigin(api, new AbortController().signal);
    const query = createDemoQuery({ origin: device.origin, categories: ['cafe'], maxPriceLevel: 1, maxWalkMinutes: 5 });
    const result = await fixtureProvider.recommend(query);
    expect(result.results).toEqual([]);
    expect(result.excludedCounts.distance).toBeGreaterThan(0);
    const manual = { ...query, origin: CAMPUS_ORIGIN };
    expect((await fixtureProvider.recommend(manual)).results.length).toBeGreaterThan(0);
    expect(manual.categories).toEqual(query.categories);
    expect(manual.maxPriceLevel).toBe(query.maxPriceLevel);
  });

  it('applying an older filter draft preserves the newer GPS origin and time', () => {
    const draft = createDemoQuery({ categories: ['library'], maxPriceLevel: 0 });
    const current = createDemoQuery({ origin: { lat: 30.29, lng: -97.74, source: 'device' }, departAt: '2026-10-25T01:00:00Z' });
    const result = applyExploreFilters(current, draft);
    expect(result.origin).toEqual(current.origin);
    expect(result.departAt).toBe(current.departAt);
    expect(result.categories).toEqual(['library']);
    expect(result.maxPriceLevel).toBe(0);
  });
});
