import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DesignPreview, type DesignPreviewProps } from '../src/features/onboarding/DesignPreview';
import { theme } from '../src/theme';

const screens = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'study-style', label: 'Study style' },
  { id: 'location', label: 'Location' },
  { id: 'preferences', label: 'Preferences' },
] as const;

export default function DesignReviewRoute() {
  const [screen, setScreen] = useState<NonNullable<DesignPreviewProps['screen']>>('welcome');
  const router = useRouter();
  if (!__DEV__) return <Redirect href="/" />;
  return <SafeAreaProvider>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={s.page}>
      <SafeAreaView edges={['top']} style={s.toolbar}>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={s.control}>
          <Text style={s.text}>← Back to Explore</Text>
        </Pressable>
        <Text style={s.notice}>Design preview · choices are not saved · GPS is simulated</Text>
        <ScrollView horizontal contentContainerStyle={s.tabs}>
          {screens.map(({id, label}) => <Pressable key={id} accessibilityRole="tab"
            accessibilityState={{selected: screen === id}} onPress={() => setScreen(id)}
            style={[s.control, screen === id && s.selected]}>
            <Text style={s.text}>{label}</Text>
          </Pressable>)}
        </ScrollView>
      </SafeAreaView>
      <View style={s.preview}><DesignPreview key={screen} screen={screen} /></View>
    </View>
  </SafeAreaProvider>;
}

const s = StyleSheet.create({
  page: {flex: 1, backgroundColor: theme.colors.background},
  toolbar: {backgroundColor: theme.colors.background, paddingHorizontal: 12, gap: 6},
  tabs: {gap: 8, paddingBottom: 8},
  control: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 12,
    borderWidth: 1, borderColor: theme.colors.chipBorder, borderRadius: 12},
  selected: {backgroundColor: theme.colors.chipSelectedBackground},
  text: {color: theme.colors.text, fontSize: 15},
  notice: {color: theme.colors.textMuted, fontSize: 12},
  preview: {flex: 1},
});
