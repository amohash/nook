import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import type { Query } from '@space/contracts';
import { CAMPUS_ORIGIN, LocationLookupError, requestDeviceOrigin, type ForegroundLocation } from './origin';

const foregroundLocation: ForegroundLocation = {
  hasServicesEnabledAsync: Location.hasServicesEnabledAsync,
  getForegroundPermissionsAsync: Location.getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync: Location.requestForegroundPermissionsAsync,
  getCurrentPositionAsync: () => {
    const options = { accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: false,
      ...(Platform.OS === 'web' ? { maximumAge: 0 } : {}) };
    return Location.getCurrentPositionAsync(options);
  },
};

export function useOrigin(onSelect: (origin: Query['origin']) => void) {
  const request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const cancel = useCallback(() => {
    const previous = request.current;
    request.current = null;
    previous?.abort();
    setBusy(false);
  }, []);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);

  const useManual = useCallback(() => {
    cancel();
    setError(null); setAccuracyMeters(null);
    onSelect(CAMPUS_ORIGIN);
  }, [cancel, onSelect]);
  const useDevice = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(null);
    try {
      const result = await requestDeviceOrigin(foregroundLocation, controller.signal);
      if (request.current === controller && !controller.signal.aborted) {
        setAccuracyMeters(result.accuracyMeters);
        onSelect(result.origin);
      }
    } catch (cause) {
      if (request.current === controller && !controller.signal.aborted) {
        setError(cause instanceof LocationLookupError ? cause.message : 'Location is unavailable. Use UT Austin.');
      }
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  };
  return { busy, error, accuracyMeters, useManual, useDevice, cancel };
}
