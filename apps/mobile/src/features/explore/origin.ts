import { QuerySchema, type Query } from '@space/contracts';
import { createDemoQuery } from '@space/fixtures';

export const CAMPUS_ORIGIN: Query['origin'] = createDemoQuery().origin;
export const LOCATION_TIMEOUT_MS = 10_000;
export type ForegroundLocation = Pick<typeof import('expo-location'), 'hasServicesEnabledAsync'
  | 'getForegroundPermissionsAsync' | 'requestForegroundPermissionsAsync' | 'getCurrentPositionAsync'>;

export class LocationLookupError extends Error {
  constructor(public readonly code: 'denied' | 'services' | 'timeout' | 'inaccurate' | 'unavailable' | 'cancelled', message: string) {
    super(message);
    this.name = 'LocationLookupError';
  }
}

// One foreground fix only. Aborting cannot close an OS prompt or cancel the native
// call, but it prevents further work and any late result from selecting an origin.
export async function requestDeviceOrigin(location: ForegroundLocation, signal: AbortSignal): Promise<{
  origin: Query['origin']; accuracyMeters: number | null;
}> {
  let timedOut = false;
  const checkActive = () => {
    if (signal.aborted) throw new LocationLookupError('cancelled', 'Location request cancelled.');
    if (timedOut) throw new LocationLookupError('timeout', 'Location took too long. Try again or use UT Austin.');
  };
  checkActive();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort: () => void = () => {};
  const interrupted = new Promise<never>((_resolve, reject) => {
    abort = () => reject(new LocationLookupError('cancelled', 'Location request cancelled.'));
    signal.addEventListener('abort', abort, { once: true });
    timeout = setTimeout(() => {
      timedOut = true;
      reject(new LocationLookupError('timeout', 'Location took too long. Try again or use UT Austin.'));
    }, LOCATION_TIMEOUT_MS);
  });
  const locate = async () => {
    const enabled = await location.hasServicesEnabledAsync();
    checkActive();
    if (!enabled) throw new LocationLookupError('services', 'Location services are off. Use UT Austin or enable location services in Settings.');
    let permission = await location.getForegroundPermissionsAsync();
    checkActive();
    if (permission.status === 'undetermined' && permission.canAskAgain) {
      permission = await location.requestForegroundPermissionsAsync();
      checkActive();
    }
    // A denied permission is not requested repeatedly; Settings or manual mode
    // remains available. This function is called only after an explicit tap.
    if (permission.status !== 'granted' || !permission.granted) {
      throw new LocationLookupError('denied', 'Location permission is off. Use UT Austin, or allow location for Expo Go in Settings and try again.');
    }
    const fix = await location.getCurrentPositionAsync();
    checkActive();
    const origin = QuerySchema.shape.origin.safeParse({ lat: fix.coords.latitude, lng: fix.coords.longitude, source: 'device' });
    const accuracy = fix.coords.accuracy;
    if (!origin.success || !Number.isFinite(fix.timestamp) || Date.now() - fix.timestamp > 60_000 || fix.timestamp > Date.now() + 5_000
      || (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0))) {
      throw new LocationLookupError('unavailable', 'A recent location could not be verified. Try again or use UT Austin.');
    }
    if (accuracy !== null && accuracy > 1000) {
      throw new LocationLookupError('inaccurate', 'Location is too approximate for campus walking estimates. Use UT Austin or try again with better accuracy.');
    }
    return { origin: origin.data, accuracyMeters: accuracy };
  };
  try {
    return await Promise.race([locate(), interrupted]);
  } catch (cause) {
    if (cause instanceof LocationLookupError) throw cause;
    throw new LocationLookupError('unavailable', 'Location could not be read. Try again or use UT Austin.');
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}
