import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../theme';

export type FieldStatus = { text: string; tone: 'neutral' | 'good' | 'bad' };

export type FormFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  helper?: string;
  /** Shown instead of the helper and status, announced politely. */
  error?: string | null;
  /** Status line below the input (e.g. username availability); replaces the helper. */
  status?: FieldStatus | null;
  /** Fixed text before the input, e.g. "@". */
  prefix?: string;
  trailing?: ReactNode;
};

export function FormField({ label, helper, error, status, prefix, trailing, ...input }: FormFieldProps) {
  const note: FieldStatus | null = error ? { text: error, tone: 'bad' } : status ?? (helper ? { text: helper, tone: 'neutral' } : null);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.box, note?.tone === 'good' && styles.boxGood, !!error && styles.boxBad]}>
      {prefix && <Text accessible={false} style={styles.prefix}>{prefix}</Text>}
      <TextInput accessibilityLabel={label} accessibilityHint={note?.text} placeholderTextColor={theme.colors.textMuted}
        style={styles.input} {...input} />
      {trailing}
    </View>
    {note && <Text accessibilityLiveRegion={note.tone === 'neutral' ? 'none' : 'polite'}
      style={[styles.note, note.tone === 'good' && styles.good, note.tone === 'bad' && styles.bad]}>{note.text}</Text>}
  </View>;
}

export const formStyles = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center',
    paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.xl, gap: theme.spacing.xl },
  title: { color: theme.colors.text, fontFamily: theme.typography.headingFamily, fontSize: theme.typography.size.title,
    lineHeight: theme.typography.lineHeight.title, fontWeight: theme.typography.weight.bold },
  body: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body },
  card: { gap: theme.spacing.md, padding: theme.spacing.section, borderRadius: theme.radii.card,
    borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder, backgroundColor: theme.colors.surface },
  cardTitle: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, fontWeight: theme.typography.weight.medium },
  eyebrow: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.caption,
    lineHeight: theme.typography.lineHeight.caption, fontWeight: theme.typography.weight.medium, letterSpacing: 0.6,
    textTransform: 'uppercase' },
  small: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body },
  alert: { color: theme.colors.error, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body, fontWeight: theme.typography.weight.medium },
  link: { color: theme.colors.sageText, fontWeight: theme.typography.weight.semibold },
  iconButton: { minWidth: theme.sizes.tapTarget, minHeight: theme.sizes.tapTarget, alignItems: 'center', justifyContent: 'center' },
});

const styles = StyleSheet.create({
  field: { gap: theme.spacing.xs },
  label: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body, fontWeight: theme.typography.weight.medium },
  box: { flexDirection: 'row', alignItems: 'center', minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.surface, borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder,
    borderRadius: theme.radii.field, paddingLeft: theme.spacing.lg, paddingRight: theme.spacing.xxs },
  boxGood: { borderColor: theme.colors.chipSelectedBorder, borderWidth: theme.borders.outline },
  boxBad: { borderColor: theme.colors.error, borderWidth: theme.borders.outline },
  prefix: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, marginRight: theme.spacing.xs },
  input: { flex: 1, minWidth: theme.spacing.none, minHeight: theme.sizes.tapTarget, paddingVertical: theme.spacing.md,
    paddingRight: theme.spacing.md, color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button },
  note: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.caption,
    lineHeight: theme.typography.lineHeight.caption },
  good: { color: theme.colors.sageText },
  bad: { color: theme.colors.error },
});
