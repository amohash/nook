import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Button } from './Button';

export type MuseAssistantEntryProps = {
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  unavailableReason?: string;
};

/** D places this in Explore/detail; it does not start a request. */
export function MuseAssistantEntry({ onPress, disabled = false, busy = false, unavailableReason }: MuseAssistantEntryProps) {
  return <View style={styles.entry}>
    <Text style={styles.title}>A little help from Muse</Text>
    <Text style={styles.body}>{unavailableReason ?? 'Compare places, understand the fit, or review a quieter search.'}</Text>
    <Button label="Ask Muse about places" variant="outline" onPress={onPress} disabled={disabled} busy={busy} />
  </View>;
}
const styles = StyleSheet.create({
  entry: { padding: theme.spacing.lg, gap: theme.spacing.xs, borderRadius: theme.radii.card, backgroundColor: theme.colors.surface },
  title: { color: theme.colors.text, fontFamily: theme.typography.headingFamily, fontSize: 20, lineHeight: 26 },
  body: { color: theme.colors.secondaryText, fontSize: 14, lineHeight: 20 },
});
