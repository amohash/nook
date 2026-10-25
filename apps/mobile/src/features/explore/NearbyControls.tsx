import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components';
import { useSession } from '../../data/SessionProvider';
import { theme } from '../../theme';

export function NearbyControls() {
  const {nearby, refreshNearby} = useSession();
  if (!nearby.enabled) return null;
  const result = nearby.result;
  const messages = {
    ready: 'Nearby places ready.', partial: 'Some sources could not load. Available places are shown.',
    empty: 'No places were found in this area.', quota: 'The demo search budget has been reached. Previously downloaded places remain available.',
    timeout: 'Nearby search timed out.', unsupported_area: 'Your location is outside the Austin search area. Choose Use UT Austin to explore manually.',
    unavailable: 'Nearby search is unavailable right now.',
  };
  return <View style={s.panel}>
    <Text style={s.title}>Nearby places · Austin</Text>
    {nearby.busy ? <Text accessibilityLiveRegion="polite" style={s.body}>Finding places near your selected location…</Text>
      : result && <Text accessibilityLiveRegion="polite" style={s.body}>{messages[result.status]}{result.snapshot ? ` ${result.snapshot.spots.length} places found before your filters.` : ''}</Text>}
    {result?.metrics.stale && <Text style={s.body}>Showing older saved place information.</Text>}
    {nearby.error && <Text accessibilityRole="alert" style={s.body}>{nearby.error}</Text>}
    <Button label={nearby.busy ? 'Finding nearby places…' : nearby.error ? 'Retry nearby discovery' : 'Refresh nearby'}
      busy={nearby.busy} variant="outline" onPress={refreshNearby} />
  </View>;
}
const s = StyleSheet.create({panel: {padding: 16, gap: 12, borderRadius: 18, backgroundColor: theme.colors.surface},
  title: {color: theme.colors.text, fontSize: 16, fontWeight: '600'},
  body: {color: theme.colors.textMuted, fontSize: 13, lineHeight: 20}});
