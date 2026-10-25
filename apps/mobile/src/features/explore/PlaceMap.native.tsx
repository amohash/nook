import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ErrorState, MapLegend, MapPin } from '../../components';
import { crowdHours, typicalLevel } from '../../components/exploreContent';
import { theme } from '../../theme';
import { venueTime } from './presentation';
import type { PlaceMapProps } from './PlaceMap.types';

class MapBoundary extends Component<{children: ReactNode; onFallback(): void}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {return {failed: true};}
  render() {return this.state.failed
    ? <ErrorState title="Map unavailable" message="Your place list is still available." action={{label: 'Use list', onPress: this.props.onFallback}} />
    : this.props.children;}
}
function NativeMap({results, origin, departAt, selectedId, onSelect, onFallback}: PlaceMapProps) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setTimedOut(true), 12_000);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    map.current?.fitToCoordinates([{latitude: origin.lat, longitude: origin.lng},
      ...results.map(({spot}) => ({latitude: spot.lat, longitude: spot.lng}))],
    {edgePadding: {top: 65, right: 50, bottom: 65, left: 50}, animated: true});
  }, [ready, results, origin]);
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
          onPress={() => onSelect(result.spotId)} title={result.spot.name} tracksViewChanges>
          <MapPin fitScore={result.score} rank={index + 1} typicalLevel={typicalLevel(crowd)}
            selected={selectedId === result.spotId} label={result.spot.name} />
        </Marker>;
      })}
    </MapView>
    <MapLegend />
    <Text style={s.caption}>Tap a pin to select its card. If tiles do not load, switch to List. No seat availability is implied.</Text>
  </View>;
}
export function PlaceMap(props: PlaceMapProps) {return <MapBoundary onFallback={props.onFallback}><NativeMap {...props} /></MapBoundary>;}
const s = StyleSheet.create({container: {gap: 12}, map: {height: 360, width: '100%', borderRadius: 20},
  caption: {fontSize: 12, lineHeight: 18, color: theme.colors.textMuted}});
