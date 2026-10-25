import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Query } from '@space/contracts';
import { Button } from '../../components';
import { theme } from '../../theme/theme';
import { OnboardingHeader, OnboardingProgress, onboardingStyles as s } from './OnboardingParts';

export type ManualOriginOption = {
  id: string;
  label: string;
  origin: Omit<Query['origin'], 'source'> & { source: 'manual' };
};
export type LocationStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable' | 'outside_coverage';
export type LocationScreenProps = {
  options: readonly ManualOriginOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUseLocation: () => void;
  onBack: () => void;
  onContinue: () => void;
  status?: LocationStatus;
  /** Public area label from D's foreground location adapter, never raw GPS coordinates. */
  deviceOriginLabel?: string;
  error?: string | null;
};

const statusMessages: Partial<Record<LocationStatus, string>> = {
  requesting: 'Getting your location… You can still choose a starting point below.',
  denied: 'Location access is off. Choose a starting point below to continue.',
  unavailable: 'Your location is unavailable. Choose a starting point below.',
  outside_coverage: 'Your location is outside our current coverage. Choose a supported starting point below.',
};

export function LocationScreen({ options, selectedId, onSelect, onUseLocation, onBack, onContinue,
  status = 'idle', deviceOriginLabel, error }: LocationScreenProps) {
  const hasManualOrigin = options.some((option) => option.id === selectedId);
  const hasOrigin = hasManualOrigin || (status === 'ready' && !!deviceOriginLabel);
  return <SafeAreaView style={s.safeArea}>
    <ScrollView style={s.scroll} contentContainerStyle={s.page}>
      <OnboardingHeader step={3} onBack={onBack} />
      <View style={s.introduction}>
        <Text accessibilityRole="header" style={s.title}>Where do you study from?</Text>
        <Text style={s.helper}>We use your location to sort spots by distance. You can pick a starting point without sharing GPS.</Text>
      </View>
      <View style={styles.choices}>
        <Button label="Use my location" onPress={onUseLocation} busy={status === 'requesting'} />
        {statusMessages[status] && <Text accessibilityLiveRegion="polite" style={s.helper}>{statusMessages[status]}</Text>}
        {status === 'ready' && deviceOriginLabel && <Text accessibilityLiveRegion="polite" style={s.helper}>Selected area: {deviceOriginLabel}</Text>}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Text style={styles.label}>Or pick a starting point</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Starting point" style={styles.options}>
          {options.map(({ id, label }) => <Pressable key={id} accessibilityRole="radio" accessibilityLabel={label}
            accessibilityState={{ checked: selectedId === id }} aria-checked={selectedId === id}
            onPress={() => onSelect(id)} style={[styles.option, selectedId === id && styles.selected]}>
            <View accessible={false} style={[styles.radio, selectedId === id && styles.radioSelected]} />
            <Text style={[styles.optionLabel, selectedId === id && styles.selectedLabel]}>{label}</Text>
          </Pressable>)}
        </View>
        {options.length === 0 && <Text style={s.helper}>No supported starting points are available. Go back or try your location.</Text>}
      </View>
      <View style={s.footer}>
        <Text style={s.helper}>You can change this anytime in Preferences.</Text>
        <OnboardingProgress step={3} />
        <Button label="Start exploring" disabled={!hasOrigin || status === 'requesting'} onPress={onContinue} />
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  choices: { marginTop: theme.spacing.xl, gap: theme.spacing.xl },
  label: { ...s.helper, fontWeight: theme.typography.weight.medium },
  options: { gap: theme.spacing.xs },
  option: { minHeight: theme.sizes.buttonMinHeight, padding: theme.spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    backgroundColor: theme.colors.chipBackground, borderColor: theme.colors.chipBorder,
    borderWidth: theme.borders.thin, borderRadius: theme.radii.field },
  selected: { backgroundColor: theme.colors.chipSelectedBackground, borderColor: theme.colors.chipSelectedBorder },
  radio: { width: theme.sizes.radio, height: theme.sizes.radio, flexShrink: 0,
    borderRadius: theme.radii.pill, borderWidth: theme.borders.outline, borderColor: theme.colors.textMuted },
  radioSelected: { borderWidth: theme.sizes.radioSelectedBorder, borderColor: theme.colors.chipSelectedText },
  optionLabel: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button, flexShrink: 1 },
  selectedLabel: { color: theme.colors.chipSelectedText },
  error: { ...s.helper, color: theme.colors.error },
});
