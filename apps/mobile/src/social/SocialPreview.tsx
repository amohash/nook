import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components';
import { theme } from '../theme';
import { useAuth } from './AuthProvider';
import { socialConfig } from './config';
import { CreateProfileScreen } from './CreateProfileScreen';
import { SignInScreen } from './SignInScreen';

/**
 * Dev-only harness for testing auth before D adds routes. Render inside SessionProvider + AuthProvider.
 * Uses the real nook-social project from .env, so accounts it creates are real.
 */
export function SocialPreview() {
  const auth = useAuth();
  const [mode, setMode] = useState<'signUp' | 'signIn'>('signUp');
  const banner = <Text style={styles.banner}>Social preview · status: {auth.status}
    {!socialConfig.enabled ? ` (${socialConfig.reason})` : ''} · real nook-social project</Text>;
  if (auth.status === 'loading') return <View style={styles.page}>{banner}<Text style={styles.text}>Loading…</Text></View>;
  if (auth.status === 'off' || auth.status === 'signedOut') return <View style={styles.page}>{banner}
    <SignInScreen key={mode} initialMode={mode} /></View>;
  if (auth.status === 'needsProfile') return <View style={styles.page}>{banner}<CreateProfileScreen /></View>;
  if (auth.status === 'profileError') return <View style={styles.page}>{banner}
    <Button label="Retry loading profile" onPress={() => void auth.refreshProfile()} /></View>;
  const { profile } = auth;
  return <ScrollView contentContainerStyle={styles.page}>{banner}
    <Text style={styles.text}>Signed in as {auth.user?.email}</Text>
    <Text style={styles.code}>{JSON.stringify({ ...profile, phone_hash: profile?.phone_hash ? '<64-char hash>' : null }, null, 2)}</Text>
    <Button label="Sign out" variant="outline" onPress={() => { setMode('signIn'); void auth.signOut(); }} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, gap: theme.spacing.md, padding: theme.spacing.lg, backgroundColor: theme.colors.background },
  banner: { color: theme.colors.secondaryText, fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
  text: { color: theme.colors.text, fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  code: { color: theme.colors.text, fontFamily: 'monospace', fontSize: theme.typography.size.caption },
});
