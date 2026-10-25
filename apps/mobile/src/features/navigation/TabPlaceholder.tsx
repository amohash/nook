import { ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components';
import { theme } from '../../theme';

// Temporary D-owned route content until A's placeholder exports are pushed.
export function TabPlaceholder({screen}: {screen: 'Friends' | 'Bookmarks' | 'Profile'}) {
  const router = useRouter();
  return <ScrollView contentContainerStyle={s.page}>
    <Text accessibilityRole="header" style={s.title}>{screen}</Text>
    <Text style={s.body}>{screen === 'Friends'
      ? 'Friends is a preview. Social features will stay unavailable until the core demo passes verification.'
      : `${screen} design preview coming soon. Your existing on-device features are available below.`}</Text>
    {screen === 'Bookmarks' && <Button label="Open saved places" onPress={() => router.push('/saved')} />}
    {screen === 'Profile' && <Button label="Preferences on this device" onPress={() => router.push('/preferences')} />}
  </ScrollView>;
}
const s = StyleSheet.create({
  page: {padding: 24, paddingBottom: 48, gap: 16, width: '100%', maxWidth: 680, alignSelf: 'center'},
  title: {color: theme.colors.text, fontSize: 28, fontWeight: '600'},
  body: {color: theme.colors.textMuted, fontSize: 16, lineHeight: 24},
});
