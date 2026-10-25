import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../theme';

export type FormFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  helper?: string;
  /** Shown instead of the helper and announced politely. */
  error?: string | null;
  /** Status line below the input (e.g. username availability). */
  status?: { text: string; tone: 'neutral' | 'good' | 'bad' } | null;
  trailing?: ReactNode;
};

export function FormField({ label, helper, error, status, trailing, ...input }: FormFieldProps) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.box, !!error && styles.boxError]}>
      <TextInput accessibilityLabel={label} placeholderTextColor={theme.colors.textMuted}
        accessibilityHint={error ?? helper} style={styles.input} {...input} />
      {trailing}
    </View>
    {status && !error && <Text accessibilityLiveRegion="polite"
      style={[styles.note, status.tone === 'good' && styles.good, status.tone === 'bad' && styles.bad]}>{status.text}</Text>}
    {error ? <Text accessibilityLiveRegion="polite" style={[styles.note, styles.bad]}>{error}</Text>
      : helper ? <Text style={styles.note}>{helper}</Text> : null}
  </View>;
}

export const formStyles = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center',
    paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.xl, gap: theme.spacing.xl },
  title: { color: theme.colors.text, fontFamily: theme.typography.headingFamily, fontSize: theme.typography.size.title,
    lineHeight: theme.typography.lineHeight.title, fontWeight: theme.typography.weight.bold },
  body: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body },
  section: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, fontWeight: theme.typography.weight.semibold },
  alert: { color: theme.colors.error, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body, fontWeight: theme.typography.weight.medium },
  textButton: { minWidth: theme.sizes.tapTarget, minHeight: theme.sizes.tapTarget, paddingHorizontal: theme.spacing.md,
    alignItems: 'center', justifyContent: 'center' },
  textButtonLabel: { color: theme.colors.sageText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body, fontWeight: theme.typography.weight.semibold },
});

const styles = StyleSheet.create({
  field: { gap: theme.spacing.xs },
  label: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body, fontWeight: theme.typography.weight.semibold },
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background,
    borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder, borderRadius: theme.radii.field,
    paddingLeft: theme.spacing.lg },
  boxError: { borderColor: theme.colors.error },
  input: { flex: 1, minWidth: theme.spacing.none, minHeight: theme.sizes.tapTarget, paddingVertical: theme.spacing.md,
    paddingRight: theme.spacing.lg, color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button },
  note: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.caption,
    lineHeight: theme.typography.lineHeight.caption },
  good: { color: theme.colors.sageText },
  bad: { color: theme.colors.error },
});
