import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState, SegmentedControl } from '../components';
import { theme } from '../theme';
import { MIN_PASSWORD_LENGTH } from './authErrors';
import { useAuth } from './AuthProvider';
import { FormField, formStyles } from './FormField';

type Mode = 'signUp' | 'signIn';
const MODES = [{ value: 'signUp', label: 'Create account' }, { value: 'signIn', label: 'I have an account' }] as const;

export type SignInScreenProps = {
  initialMode?: Mode;
  /** Called after a successful sign-up/sign-in. Route on useAuth().status (needsProfile → CreateProfile). */
  onDone?: () => void;
  /** Optional "Not now" exit back to guest mode. */
  onCancel?: () => void;
};

export function SignInScreen({ initialMode = 'signUp', onDone, onCancel }: SignInScreenProps) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!auth.enabled) return <SafeAreaView style={styles.safe}><View style={formStyles.page}>
    <EmptyState title="Accounts are off" message="You can keep using Nook as a guest. Saves stay on this device."
      action={onCancel && { label: 'Back', onPress: onCancel }} />
  </View></SafeAreaView>;

  const submit = async () => {
    setBusy(true); setError(null);
    const result = mode === 'signUp' ? await auth.signUp(email, password) : await auth.signIn(email, password);
    setBusy(false);
    if (result.ok) onDone?.();
    else setError(result.message);
  };
  const changeMode = (next: Mode) => { setMode(next); setError(null); };

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={formStyles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text accessibilityRole="header" style={formStyles.title}>
            {mode === 'signUp' ? 'Create your Nook account' : 'Welcome back'}</Text>
          <Text style={formStyles.body}>Follow friends and see the spots they save. Nook works without an account too.</Text>
        </View>
        <SegmentedControl accessibilityLabel="Account" options={MODES} value={mode} onChange={changeMode} />
        <FormField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
          keyboardType="email-address" autoComplete="email" textContentType="emailAddress" inputMode="email"
          returnKeyType="next" placeholder="you@example.com" />
        <FormField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
          autoCapitalize="none" autoCorrect={false}
          autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
          helper={mode === 'signUp' ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
          returnKeyType="go" onSubmitEditing={() => { if (!busy) void submit(); }}
          trailing={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            onPress={() => setShowPassword((value) => !value)} style={formStyles.textButton}>
            <Text style={formStyles.textButtonLabel}>{showPassword ? 'Hide' : 'Show'}</Text>
          </Pressable>} />
        {error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={formStyles.alert}>{error}</Text>}
        <View style={styles.actions}>
          <Button label={mode === 'signUp' ? 'Create account' : 'Sign in'} onPress={() => void submit()} busy={busy} />
          {onCancel && <Button label="Not now" variant="outline" onPress={onCancel} disabled={busy} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  intro: { gap: theme.spacing.sm },
  actions: { gap: theme.spacing.md },
});
