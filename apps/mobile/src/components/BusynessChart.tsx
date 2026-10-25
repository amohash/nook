import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { theme } from '../theme';
import { EvidenceLabel } from './EvidenceLabel';
import { crowdHours, typicalWording, validHour, type TypicalCrowd } from './exploreContent';

export type BusynessChartProps = { typicalCrowd: TypicalCrowd; weekday: number; currentHour: number };

export function BusynessChart({ typicalCrowd, weekday, currentHour }: BusynessChartProps) {
  const hours = crowdHours(typicalCrowd, weekday);
  const hasData = hours.some((value) => value !== null);
  const scroll = useRef<ScrollViewInstance>(null);
  const [chartWidth, setChartWidth] = useState(0);
  useEffect(() => {
    if (hasData && chartWidth > 0 && validHour(currentHour)) {
      const center = currentHour * (theme.sizes.chartColumn + theme.spacing.xs) + theme.sizes.chartColumn / 2;
      scroll.current?.scrollTo({ x: Math.max(0, center - chartWidth / 2), animated: false });
    }
  }, [currentHour, hasData, chartWidth]);
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>Typical crowd</Text>
    {!hasData ? <Text style={styles.body}>No typical crowd data yet</Text> : <>
      <Text style={styles.body}>{typicalWording(validHour(currentHour) ? hours[currentHour] ?? null : null)}</Text>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.chart}
        onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
        accessibilityLabel="Typical crowd by hour. Swipe horizontally to see all 24 hours.">
        {hours.map((value, hour) => <View key={hour} accessible
          accessibilityLabel={`${hour}:00, ${value === null ? 'no data' : `typical crowd value ${value}`}${hour === currentHour ? ', highlighted hour' : ''}`}
          style={[styles.column, hour === currentHour && styles.current]}>
          <View style={styles.barSlot}>
            {value === null ? <View style={styles.gap} /> : <View style={[styles.bar,
              { height: Math.max(theme.sizes.chartZero, value * theme.sizes.chartHeight) },
              hour === currentHour && styles.currentBar]} />}
          </View>
          <Text style={styles.hour}>{hour % 3 === 0 || hour === currentHour ? String(hour).padStart(2, '0') : ' '}</Text>
        </View>)}
      </ScrollView>
      <Text style={styles.caption}>Hours 00–23 · Dashed gaps = no data</Text>
    </>}
    {typicalCrowd && <EvidenceLabel source={typicalCrowd.source} fetchedAt={typicalCrowd.fetchedAt} />}
  </View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.card,
    borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder, padding: theme.spacing.lg, gap: theme.spacing.md },
  title: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.section, lineHeight: theme.typography.lineHeight.section, fontWeight: theme.typography.weight.semibold },
  body: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  chart: { gap: theme.spacing.xs, paddingVertical: theme.spacing.xxs },
  column: { width: theme.sizes.chartColumn, gap: theme.spacing.xs, alignItems: 'center',
    borderBottomWidth: theme.borders.icon, borderBottomColor: theme.colors.transparent },
  current: { borderBottomColor: theme.colors.text },
  barSlot: { width: '100%', height: theme.sizes.chartHeight, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: theme.radii.field, backgroundColor: theme.colors.sage },
  currentBar: { backgroundColor: theme.colors.sageText },
  gap: { width: '100%', height: theme.sizes.chartGap, borderRadius: theme.radii.field,
    borderWidth: theme.borders.thin, borderStyle: 'dashed', borderColor: theme.colors.grey },
  hour: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
  caption: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
});
