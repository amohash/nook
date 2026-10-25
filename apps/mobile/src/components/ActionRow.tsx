import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Button } from './Button';

export type ActionRowProps = {
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onOpenMaps: () => void;
  saving?: boolean;
  mapsDisabled?: boolean;
};

export function ActionRow({ saved, onSave, onShare, onOpenMaps, saving = false, mapsDisabled = false }: ActionRowProps) {
  return <View style={styles.row}>
    <View style={styles.action}><Button label={saved ? 'Saved' : 'Save'} selected={saved}
      accessibilityLabel={saved ? 'Unsave place' : 'Save place'} accessibilityHint="Toggles your saved state"
      variant={saved ? 'primary' : 'outline'} busy={saving} onPress={onSave} /></View>
    <View style={styles.action}><Button label="Share" variant="outline" onPress={onShare} /></View>
    <View style={styles.action}><Button label="Open in Maps" variant="outline" disabled={mapsDisabled} onPress={onOpenMaps} /></View>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  action: { flexGrow: 1, flexBasis: theme.sizes.controlMinWidth, minWidth: theme.sizes.controlMinWidth },
});
