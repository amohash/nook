import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Button } from './Button';

export type SheetContainerProps = {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onReset: () => void;
  onApply: () => void;
  applying?: boolean;
  applyDisabled?: boolean;
};

/** D owns the surrounding modal, visibility, dismissal and draft/Apply state. */
export function SheetContainer({ title, children, onCancel, onReset, onApply,
  applying = false, applyDisabled = false }: SheetContainerProps) {
  return <View style={styles.sheet}>
    <View style={styles.header}>
      <View style={styles.control}><Button label="Cancel" variant="outline" onPress={onCancel} /></View>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <View style={styles.control}><Button label="Reset" variant="outline" disabled={applying} onPress={onReset} /></View>
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled>{children}</ScrollView>
    <SafeAreaView edges={['bottom']} style={styles.footer}>
      <Button label="Apply" onPress={onApply} busy={applying} disabled={applyDisabled} />
    </SafeAreaView>
  </View>;
}
const styles = StyleSheet.create({
  sheet: { flex: 1, minHeight: theme.spacing.none, backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.card, borderTopRightRadius: theme.radii.card },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
    gap: theme.spacing.xs, padding: theme.spacing.lg },
  control: { minWidth: theme.sizes.controlMinWidth },
  title: { flexGrow: 1, flexShrink: 1, textAlign: 'center', color: theme.colors.text,
    fontFamily: theme.typography.headingFamily, fontSize: theme.typography.size.section,
    lineHeight: theme.typography.lineHeight.section, fontWeight: theme.typography.weight.bold },
  scroll: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  footer: { padding: theme.spacing.lg, borderTopWidth: theme.borders.thin, borderTopColor: theme.colors.chipBorder },
});
