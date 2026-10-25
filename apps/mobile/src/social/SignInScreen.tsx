import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import wordmark from '../../assets/nook-wordmark.png';
import { Button, EmptyState } from '../components';
import { theme } from '../theme';
import { MIN_PASSWORD_LENGTH } from './authErrors';
import { useAuth } from './AuthProvider';
import { FormField, formStyles } from './FormField';
import { EyeIcon } from './icons';

// Design: docs/design/social-sign-in.png
type Mode = 'signUp' | 'signIn';
const GUEST_NOTE = 'An account is optional. Explore and saved spots keep working without one.';

const COPY: Record<Mode, { title: string; action: string; switchPrompt: string; switchLabel: string }> = {
  signIn: { title: 'Sign in to Nook', action: 'Sign in', switchPrompt: 'New to Nook?', switchLabel: 'Create account' },
  signUp: { title: 'Create your Nook account', action: 'Create account', switchPrompt: 'Already on Nook?',
    switchLabel: 'I have an account' },
};

export type SignInScreenProps = {
  initialMode?: Mode;
  /** Called after a successful sign-up/sign-in. Route on useAuth().status (needsProfile → CreateProfile). */
  onDone?: () => void;
  /** Shows "Continue as guest"; returns to the app without an account. */
  onContinueAsGuest?: () => void;
};

export function SignInScreen({ initialMode = 'signIn', onDone, onContinueAsGuest }: SignInScreenProps) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[mode];

  const guestFooter = onContinueAsGuest && <View style={styles.footer}>
    <Text style={[formStyles.small, styles.center]}>{GUEST_NOTE}</Text>
    <Button label="Continue as guest" variant="outline" onPress={onContinueAsGuest} disabled={busy} />
  </View>;

  if (!auth.enabled) return <SafeAreaView style={styles.safe}><View style={formStyles.page}>
    <EmptyState title="Accounts aren’t available" message="You can keep using Nook as a guest. Saves stay on this device." />
    {guestFooter}
  </View></SafeAreaView>;

  const submit = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    const result = mode === 'signUp' ? await auth.signUp(email, password) : await auth.signIn(email, password);
    setBusy(false);
    if (result.ok) onDone?.();
    else setError(result.message);
  };
  const switchMode = () => { setMode((value) => value === 'signIn' ? 'signUp' : 'signIn'); setError(null); };

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={formStyles.page} keyboardShouldPersistTaps="handled">
        <Image source={wordmark} accessibilityRole="image" accessibilityLabel="Nook" resizeMode="contain" style={styles.logo} />
        <View style={styles.intro}>
          <Text accessibilityRole="header" style={formStyles.title}>{copy.title}</Text>
          <Text style={formStyles.body}>Follow friends, share your study vibe and see where classmates like to study.</Text>
        </View>
        <View style={styles.fields}>
          <FormField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
            keyboardType="email-address" inputMode="email" autoComplete="email" textContentType="emailAddress"
            returnKeyType="next" placeholder="you@utexas.edu" />
          <FormField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
            autoCapitalize="none" autoCorrect={false}
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
            helper={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            returnKeyType="go" onSubmitEditing={() => void submit()}
            trailing={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              onPress={() => setShowPassword((value) => !value)} style={formStyles.iconButton}>
              <EyeIcon crossed={showPassword} />
            </Pressable>} />
        </View>
        {error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={formStyles.alert}>{error}</Text>}
        <Button label={copy.action} onPress={() => void submit()} busy={busy} />
        <Pressable accessibilityRole="button" accessibilityLabel={copy.switchLabel} onPress={switchMode} disabled={busy}
          style={styles.switch}>
          <Text style={[formStyles.small, styles.center]}>{copy.switchPrompt} <Text style={formStyles.link}>{copy.switchLabel}</Text></Text>
        </Pressable>
        {guestFooter}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  logo: { alignSelf: 'center', width: 200, maxWidth: '60%', height: 104, marginTop: theme.spacing.lg },
  intro: { gap: theme.spacing.xs },
  fields: { gap: theme.spacing.lg },
  switch: { minHeight: theme.sizes.tapTarget, justifyContent: 'center', alignSelf: 'center', paddingHorizontal: theme.spacing.md },
  center: { textAlign: 'center' },
  footer: { flexGrow: 1, justifyContent: 'flex-end', gap: theme.spacing.md, paddingTop: theme.spacing.xxxl },
});
