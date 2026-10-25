import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

export function OnboardingHeader({ step, onBack }: { step: 2 | 3; onBack: () => void }) {
  return <View style={styles.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.backButton}>
      <View accessible={false} style={styles.chevron} />
    </Pressable>
    <Text style={styles.step}>Step {step} of 3</Text>
  </View>;
}

export function OnboardingProgress({ step }: { step: 1 | 2 | 3 }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.progress}>
    {([1, 2, 3] as const).map((value) => <View key={value} style={[styles.dot, step === value && styles.activeDot]} />)}
  </View>;
}

export const onboardingStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  page: { flexGrow: 1, width: '100%', maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center',
    paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xl },
  introduction: { marginTop: theme.spacing.lg, gap: theme.spacing.sm },
  title: { color: theme.colors.text, fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.size.title, lineHeight: theme.typography.lineHeight.title,
    fontWeight: theme.typography.weight.bold },
  helper: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  footer: { flexGrow: 1, justifyContent: 'flex-end', paddingTop: theme.spacing.xxxl, gap: theme.spacing.xl },
  actions: { gap: theme.spacing.xl },
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.lg },
  backButton: { minWidth: theme.sizes.tapTarget, minHeight: theme.sizes.tapTarget,
    justifyContent: 'center', alignItems: 'center', marginLeft: -theme.spacing.md },
  chevron: { width: theme.sizes.backChevron, height: theme.sizes.backChevron,
    borderLeftWidth: theme.borders.icon, borderBottomWidth: theme.borders.icon,
    borderColor: theme.colors.text, transform: [{ rotate: '45deg' }] },
  step: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body,
    fontWeight: theme.typography.weight.medium, flexShrink: 1 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  dot: { width: theme.sizes.progressDot, height: theme.sizes.progressDot,
    borderRadius: theme.radii.pill, backgroundColor: theme.colors.progressInactive },
  activeDot: { width: theme.sizes.progressActiveWidth, backgroundColor: theme.colors.text },
});
