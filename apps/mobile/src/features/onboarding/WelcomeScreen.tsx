import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components';
import { theme } from '../../theme/theme';
import { OnboardingProgress, onboardingStyles as s } from './OnboardingParts';
import wordmark from '../../../assets/nook-wordmark.png';

export type WelcomeScreenProps = { onGetStarted: () => void; onSkip: () => void };

export function WelcomeScreen({ onGetStarted, onSkip }: WelcomeScreenProps) {
  return <SafeAreaView style={s.safeArea}>
    <ScrollView style={s.scroll} contentContainerStyle={s.page}>
      <View style={styles.brand}>
        <Image source={wordmark} accessibilityLabel="Nook" resizeMode="contain" style={styles.logo} />
      </View>
      <View style={styles.introduction}>
        <Text accessibilityRole="header" style={styles.title}>Find your nook</Text>
        <Text style={styles.helper}>Study and meet-up spots around UT that fit your preferences, with clear evidence and honest labels when details are unknown.</Text>
      </View>
      <Text style={[s.helper, {marginTop: theme.spacing.lg}]}>Skip uses Study, Quiet, a 15-minute estimated walk, no price cap and manual UT Austin origin. No account or GPS needed.</Text>
      <View style={styles.progress}><OnboardingProgress step={1} /></View>
      <View style={styles.actions}>
        <Button label="Get started" onPress={onGetStarted} />
        <Button label="Skip for now" variant="outline" onPress={onSkip} />
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  brand: { flexGrow: 1, minHeight: theme.sizes.logoMinSpace, alignItems: 'flex-start', justifyContent: 'center' },
  logo: { width: theme.sizes.logoWidth, maxWidth: '100%', height: theme.sizes.logoHeight },
  introduction: { gap: theme.spacing.xl },
  title: { ...s.title, fontSize: theme.typography.size.hero, lineHeight: theme.typography.lineHeight.hero },
  helper: { ...s.helper, fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button },
  progress: { marginTop: theme.spacing.xl },
  actions: { gap: theme.spacing.xl, marginTop: theme.spacing.hero },
});
