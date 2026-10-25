import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components';
import { theme } from '../theme';
import { AuthPreviewProvider, useAuth } from './AuthProvider';
import { socialConfig } from './config';
import { CreateProfileScreen } from './CreateProfileScreen';
import { SignInScreen } from './SignInScreen';

/**
 * Dev-only harness until D adds routes. Render inside SessionProvider + AuthProvider.
 * "Live" uses the real nook-social project from .env (accounts are real); "Profile design" makes no auth calls.
 */
export function SocialPreview() {
  const [view, setView] = useState<'live' | 'design'>('live');
  return <View style={styles.page}>
    <View style={styles.toolbar}>
      {(['live', 'design'] as const).map((id) => <Pressable key={id} accessibilityRole="tab"
        accessibilityState={{ selected: view === id }} onPress={() => setView(id)} style={[styles.tab, view === id && styles.selected]}>
        <Text style={styles.text}>{id === 'live' ? 'Live auth' : 'Create profile (design)'}</Text>
      </Pressable>)}
    </View>
    {view === 'live' ? <LiveAuth /> : <AuthPreviewProvider><CreateProfileScreen onBack={() => setView('live')} /></AuthPreviewProvider>}
  </View>;
}

function LiveAuth() {
  const auth = useAuth();
  const [mode, setMode] = useState<'signUp' | 'signIn'>('signIn');
  const banner = <Text style={styles.banner}>status: {auth.status}
    {!socialConfig.enabled ? ` (${socialConfig.reason})` : ''} · real nook-social project</Text>;
  if (auth.status === 'loading') return <View style={styles.page}>{banner}<Text style={styles.text}>Loading…</Text></View>;
  if (auth.status === 'off' || auth.status === 'signedOut') return <View style={styles.page}>{banner}
    <SignInScreen key={mode} initialMode={mode} onContinueAsGuest={() => {}} /></View>;
  if (auth.status === 'needsProfile') return <View style={styles.page}>{banner}<CreateProfileScreen /></View>;
  if (auth.status === 'profileError') return <View style={styles.page}>{banner}
    <Button label="Retry loading profile" onPress={() => void auth.refreshProfile()} /></View>;
  const { profile } = auth;
  return <ScrollView contentContainerStyle={styles.content}>{banner}
    <Text style={styles.text}>Signed in as {auth.user?.email}</Text>
    <Text style={styles.code}>{JSON.stringify({ ...profile, phone_hash: profile?.phone_hash ? '<64-char hash>' : null }, null, 2)}</Text>
    <Button label="Sign out" variant="outline" onPress={() => { setMode('signIn'); void auth.signOut(); }} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  content: { gap: theme.spacing.md, padding: theme.spacing.lg },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, padding: theme.spacing.xs },
  tab: { minHeight: theme.sizes.tapTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.md,
    borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder, borderRadius: theme.radii.field },
  selected: { backgroundColor: theme.colors.chipSelectedBackground },
  banner: { color: theme.colors.secondaryText, fontSize: theme.typography.size.caption, paddingHorizontal: theme.spacing.lg },
  text: { color: theme.colors.text, fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  code: { color: theme.colors.text, fontFamily: 'monospace', fontSize: theme.typography.size.caption },
});
