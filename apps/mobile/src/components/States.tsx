import { StyleSheet, Text, View } from 'react-native';
import type { ButtonProps } from './Button';
import { Button } from './Button';
import { theme } from '../theme/theme';

export type LoadingStateProps = { message?: string };
export type MessageStateProps = {
  title: string;
  message: string;
  action?: Pick<ButtonProps, 'label' | 'onPress'>;
};

export function LoadingState({ message = 'Loading places…' }: LoadingStateProps) {
  return <View style={styles.loading} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }} aria-busy>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.skeletons}>
      <View style={styles.skeletonHeading} />
      {([1, 2] as const).map((key) => <View key={key} style={styles.skeletonCard}>
        <View style={styles.thumbnail} />
        <View style={styles.skeletonText}>
          <View style={styles.skeletonLine} /><View style={styles.skeletonLine} /><View style={styles.skeletonShortLine} />
        </View>
      </View>)}
    </View>
    <Text style={styles.message}>{message}</Text>
  </View>;
}

export function EmptyState({ title, message, action }: MessageStateProps) {
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {action && <Button label={action.label} onPress={action.onPress} variant="outline" />}
  </View>;
}

export function ErrorState({ title, message, action }: MessageStateProps) {
  return <View style={styles.panel}>
    <Text accessibilityRole="alert" style={[styles.title, styles.error]}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {action && <Button label={action.label} onPress={action.onPress} variant="outline" />}
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: theme.spacing.xl, gap: theme.spacing.md,
    borderRadius: theme.radii.card, backgroundColor: theme.colors.background },
  loading: { gap: theme.spacing.lg },
  skeletons: { gap: theme.spacing.md },
  skeletonHeading: { width: '55%', height: theme.typography.lineHeight.button,
    borderRadius: theme.radii.field, backgroundColor: theme.colors.placeholder },
  skeletonCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderRadius: theme.radii.card, padding: theme.spacing.md },
  thumbnail: { width: theme.sizes.thumbnail, height: theme.sizes.thumbnail,
    borderRadius: theme.radii.field, backgroundColor: theme.colors.placeholder },
  skeletonText: { flex: 1, gap: theme.spacing.xs },
  skeletonLine: { height: theme.spacing.md, borderRadius: theme.radii.pill, backgroundColor: theme.colors.placeholder },
  skeletonShortLine: { width: '55%', height: theme.spacing.md, borderRadius: theme.radii.pill, backgroundColor: theme.colors.placeholder },
  title: { color: theme.colors.text, fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.size.section, lineHeight: theme.typography.lineHeight.section,
    fontWeight: theme.typography.weight.bold },
  message: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  error: { color: theme.colors.error },
});
