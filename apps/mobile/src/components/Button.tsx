import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps } from 'react-native';
import { theme } from '../theme/theme';

export type ButtonProps = Pick<PressableProps, 'accessibilityLabel' | 'accessibilityHint' | 'testID'> & {
  label: string;
  onPress: NonNullable<PressableProps['onPress']>;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  busy?: boolean;
  selected?: boolean;
};

export function Button({ label, variant = 'primary', disabled = false, busy = false, selected, ...props }: ButtonProps) {
  const outlined = variant === 'outline';
  const unavailable = disabled || busy;
  return <Pressable {...props} accessibilityRole="button" disabled={unavailable}
    accessibilityState={{ disabled: unavailable, busy, ...(selected === undefined ? {} : { selected }) }}
    aria-pressed={selected} aria-busy={busy} aria-disabled={unavailable}
    style={({ pressed }) => [styles.button, outlined ? styles.outline : styles.primary,
      pressed && styles.pressed, unavailable && styles.disabled]}>
    {busy && <ActivityIndicator accessible={false} color={outlined ? theme.colors.text : theme.colors.buttonText} />}
    <Text style={[styles.label, outlined ? styles.outlineLabel : styles.primaryLabel]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: {
    width: '100%', minHeight: theme.sizes.buttonMinHeight,
    flexDirection: 'row', gap: theme.spacing.xs,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.pill, borderWidth: theme.borders.outline,
  },
  primary: { backgroundColor: theme.colors.buttonBackground, borderColor: theme.colors.buttonBackground },
  // Secondary actions stay quieter than the one primary action on a screen.
  outline: { backgroundColor: theme.colors.chipBackground, borderColor: theme.colors.chipBorder, borderWidth: theme.borders.thin },
  pressed: { borderColor: theme.colors.chipSelectedBorder },
  disabled: { opacity: theme.opacity.disabled },
  label: {
    fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, fontWeight: theme.typography.weight.semibold,
    textAlign: 'center', flexShrink: 1,
  },
  primaryLabel: { color: theme.colors.buttonText },
  outlineLabel: { color: theme.colors.text },
});
