import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ErrorState, MapPin } from '../../components';
import { crowdHours, typicalLevel } from '../../components/exploreContent';
import { venueTime } from './presentation';
import type { PlaceMapProps } from './PlaceMap.types';

class MapBoundary extends Component<{children: ReactNode; onFallback(): void}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {return {failed: true};}
  render() {return this.state.failed
    ? <ErrorState title="Map unavailable" message="Your place list is still available." action={{label: 'Use list', onPress: this.props.onFallback}} />
    : this.props.children;}
}
const DEFAULT_EDGE_INSETS = {top: 160, bottom: 180};
const PIN_BREATHING_ROOM = 24;
const MARKER_SETTLE_MS = 800;

function NativeMap({results, origin, departAt, selectedId, onSelect, onFallback, edgeInsets = DEFAULT_EDGE_INSETS}: PlaceMapProps) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  // Custom marker views are snapshotted once; re-snapshotting 200 views every frame is what makes the map stutter.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), MARKER_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [results, selectedId]);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setTimedOut(true), 12_000);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    map.current?.fitToCoordinates([{latitude: origin.lat, longitude: origin.lng},
      ...results.map(({spot}) => ({latitude: spot.lat, longitude: spot.lng}))],
    {edgePadding: {top: edgeInsets.top + PIN_BREATHING_ROOM, right: 30, bottom: edgeInsets.bottom + PIN_BREATHING_ROOM, left: 30}, animated: true});
  }, [ready, results, origin, edgeInsets.top, edgeInsets.bottom]);
  if (timedOut && !ready) return <ErrorState title="Map took too long" message="Use the list while map tiles are unavailable."
    action={{label: 'Use list', onPress: onFallback}} />;
  return <View style={s.container}>
    <MapView ref={map} style={s.map} onMapReady={() => setReady(true)}
      initialRegion={{latitude: origin.lat, longitude: origin.lng, latitudeDelta: 0.025, longitudeDelta: 0.025}}
      showsUserLocation={false} showsMyLocationButton={false}>
      <Marker identifier="origin" coordinate={{latitude: origin.lat, longitude: origin.lng}} title="Selected starting point" />
      {results.map((result, index) => {
        const time = venueTime(departAt, result.spot.timezone);
        const crowd = crowdHours(result.spot.typicalCrowd, time.weekday)[time.hour] ?? null;
        return <Marker key={result.spotId} identifier={result.spotId}
          coordinate={{latitude: result.spot.lat, longitude: result.spot.lng}}
          onPress={() => onSelect(result.spotId)} title={result.spot.name} tracksViewChanges={tracksViewChanges}>
          <MapPin estimatedWalkMinutes={result.estimatedWalkMinutes} fitScore={result.score} rank={index + 1} typicalLevel={typicalLevel(crowd)}
            selected={selectedId === result.spotId} label={result.spot.name} />
        </Marker>;
      })}
    </MapView>
  </View>;
}
export function PlaceMap(props: PlaceMapProps) {return <MapBoundary onFallback={props.onFallback}><NativeMap {...props} /></MapBoundary>;}
const s = StyleSheet.create({container: {flex: 1}, map: {flex: 1, width: '100%'}});
