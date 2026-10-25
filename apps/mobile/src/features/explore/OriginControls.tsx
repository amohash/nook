import { theme } from '../../theme';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Query } from '@space/contracts';

export function OriginControls({ origin, busy, error, accuracyMeters, onDevice, onManual }: {
  origin: Query['origin']; busy: boolean; error: string | null; accuracyMeters: number | null;
  onDevice: () => void; onManual: () => void;
}) {
  return <View style={s.panel}>
    <Text style={s.label}>{origin.source === 'manual' ? 'Manual origin · UT Austin campus' : 'Device location · one-time reading'}</Text>
    {origin.source === 'device' && <Text style={s.body}>{accuracyMeters === null ? 'Location accuracy unknown.' : `Reported accuracy: ±${Math.ceil(accuracyMeters)} m.`} Walking times are estimates.</Text>}
    <Text style={s.body}>This dataset covers the UT Austin area. Use UT Austin to explore without location permission.</Text>
    <View style={s.row}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy}
        onPress={onDevice} style={s.button}><Text style={s.buttonText}>{busy ? 'Finding location…' : 'Use my location'}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onManual} style={s.button}><Text style={s.buttonText}>Use UT Austin</Text></Pressable>
    </View>
    {busy && <><ActivityIndicator accessibilityLabel="Finding device location" color={theme.colors.chipSelectedText} />
      <Text style={s.body}>Keeping the selected origin until a location is ready. Use UT Austin to cancel.</Text></>}
    {error && <Text accessibilityRole="alert" role="alert" style={s.body}>{error} The selected origin has not changed.</Text>}
  </View>;
}

const s = StyleSheet.create({
  panel: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, gap: 12 },
  label: { color: theme.colors.text, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  body: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: theme.colors.chipBorder, borderRadius: 24 },
  buttonText: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
});
