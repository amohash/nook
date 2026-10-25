import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PressableProps } from 'react-native';
import { theme } from '../theme/theme';

export type ChipProps = Pick<PressableProps, 'accessibilityHint' | 'testID'> & {
  label: string;
  onPress: NonNullable<PressableProps['onPress']>;
  selected: boolean;
  /** Use radio inside the caller's radiogroup; checkbox supports independent picks. */
  selectionRole?: 'checkbox' | 'radio';
  disabled?: boolean;
};

export function Chip({ label, selected, selectionRole = 'checkbox', disabled = false, ...props }: ChipProps) {
  // The visual pill is 36pt; its non-overlapping touch target is at least 44pt.
  return <Pressable {...props} accessibilityRole={selectionRole} accessibilityLabel={label} disabled={disabled}
    accessibilityState={{ checked: selected, selected, disabled }} aria-checked={selected}
    style={[styles.target, disabled && styles.disabled]}>
    {({ pressed }) => <View style={[styles.pill, selected && styles.selected, pressed && styles.pressed]}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </View>}
  </Pressable>;
}

const styles = StyleSheet.create({
  target: { minHeight: theme.sizes.tapTarget, maxWidth: '100%', justifyContent: 'center' },
  pill: {
    minHeight: theme.sizes.chipMinHeight, justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radii.pill, borderWidth: theme.borders.thin,
    backgroundColor: theme.colors.chipBackground, borderColor: theme.colors.chipBorder,
  },
  selected: { backgroundColor: theme.colors.chipSelectedBackground, borderColor: theme.colors.chipSelectedBorder },
  pressed: { borderColor: theme.colors.textMuted },
  disabled: { opacity: theme.opacity.disabled },
  label: {
    color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body,
    fontWeight: theme.typography.weight.regular, flexShrink: 1,
  },
  selectedLabel: { color: theme.colors.chipSelectedText, fontWeight: theme.typography.weight.medium },
});
