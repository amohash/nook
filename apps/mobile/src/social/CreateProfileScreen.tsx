import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, EmptyState } from '../components';
import { usePreferenceTags } from '../features/preferences';
import { theme } from '../theme';
import { useAuth } from './AuthProvider';
import { pickAvatar, uploadAvatar } from './avatar';
import { getSupabase } from './client';
import { FormField, formStyles } from './FormField';
import { hashPhone } from './phoneHash';
import { createProfile, isUsernameAvailable } from './profileApi';
import { displayNameProblem, majorProblem, normalizeUsernameInput, toE164, usernameProblem, vibeLineFrom,
  vibeTagsFrom } from './profileRules';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'error';
const DISCOVERY_NOTE = 'People who have your number can find you. You can turn this off anytime.';

/** Debounced (400 ms) is_username_available check; stale responses are ignored. */
function useUsernameAvailability(username: string): Availability {
  const [state, setState] = useState<{ name: string; value: Availability }>({ name: '', value: 'idle' });
  useEffect(() => {
    const client = getSupabase();
    if (!client || usernameProblem(username)) return;
    let active = true;
    const timer = setTimeout(() => {
      setState({ name: username, value: 'checking' });
      isUsernameAvailable(client, username)
        .then((free) => { if (active) setState({ name: username, value: free ? 'available' : 'taken' }); })
        .catch(() => { if (active) setState({ name: username, value: 'error' }); });
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [username]);
  if (usernameProblem(username)) return 'idle';
  return state.name === username ? state.value : 'checking';
}

const AVAILABILITY_TEXT: Record<Exclude<Availability, 'idle'>, { text: string; tone: 'neutral' | 'good' | 'bad' }> = {
  checking: { text: 'Checking…', tone: 'neutral' },
  available: { text: 'Available', tone: 'good' },
  taken: { text: 'That username is taken.', tone: 'bad' },
  error: { text: 'Couldn’t check right now. You can still try to create your profile.', tone: 'neutral' },
};

export type CreateProfileScreenProps = { onDone?: () => void };

export function CreateProfileScreen({ onDone }: CreateProfileScreenProps) {
  const { enabled, user, refreshProfile, signOut } = useAuth();
  const preferenceTags = usePreferenceTags();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [major, setMajor] = useState('');
  const [phone, setPhone] = useState('');
  const [discoverable, setDiscoverable] = useState(false);
  const [avatar, setAvatar] = useState<{ url: string; preview: string } | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const availability = useUsernameAvailability(username);

  if (!enabled || !user) return <SafeAreaView style={styles.safe}><View style={formStyles.page}>
    <EmptyState title="Sign in first" message="Create an account or sign in to set up your profile." />
  </View></SafeAreaView>;

  const tags = vibeTagsFrom(preferenceTags);
  const vibeLine = vibeLineFrom(tags);
  const e164 = phone.trim() ? toE164(phone) : null;
  const problems = {
    username: usernameProblem(username),
    displayName: displayNameProblem(displayName),
    major: majorProblem(major),
    phone: phone.trim() && !e164 ? 'Enter a 10-digit US number, or start with + and the country code.' : null,
  };
  const valid = !problems.username && !problems.displayName && !problems.major && !problems.phone && availability !== 'taken';

  const chooseAvatar = async () => {
    const client = getSupabase();
    if (!client) return;
    setAvatarError(null);
    try {
      const picked = await pickAvatar();
      if (!picked) return;
      setAvatarBusy(true);
      const result = await uploadAvatar(client, user.id, picked);
      if (result.ok) setAvatar({ url: result.url, preview: picked.uri });
      else setAvatarError(result.message);
    } catch {
      setAvatarError('Couldn’t open your photos. You can add a picture later.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const submit = async () => {
    setTouched(true); setError(null);
    const client = getSupabase();
    if (!client || !valid) return;
    setBusy(true);
    try {
      // Only the hash leaves the device; the raw number is never stored.
      const phone_hash = e164 ? await hashPhone(e164) : null;
      const result = await createProfile(client, user.id, {
        username, display_name: displayName.trim(), major: major.trim() || null, avatar_url: avatar?.url ?? null,
        vibe_tags: tags, vibe_line: vibeLine, phone_hash, discoverable_by_phone: !!phone_hash && discoverable,
      });
      if (!result.ok) {
        setError(result.reason === 'username_taken' ? 'That username was just taken. Try another.'
          : 'Couldn’t create your profile. Check your connection and try again.');
        return;
      }
      await refreshProfile();
      onDone?.();
    } catch {
      setError('Couldn’t create your profile. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={formStyles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text accessibilityRole="header" style={formStyles.title}>Set up your profile</Text>
          <Text style={formStyles.body}>Friends see your name, photo and study vibe.</Text>
        </View>

        <View style={styles.avatarRow}>
          <View accessible={false} style={styles.avatar}>
            {avatar ? <Image source={{ uri: avatar.preview }} style={styles.avatarImage} accessibilityIgnoresInvertColors />
              : <Text style={styles.avatarInitial}>{(displayName.trim()[0] ?? username[0] ?? '?').toUpperCase()}</Text>}
          </View>
          <View style={styles.avatarActions}>
            <Button label={avatar ? 'Change photo' : 'Add photo'} variant="outline" onPress={() => void chooseAvatar()}
              busy={avatarBusy} accessibilityHint="Opens your photo library. Optional; you can add one later." />
            {avatar && <Pressable accessibilityRole="button" onPress={() => setAvatar(null)} style={formStyles.textButton}>
              <Text style={formStyles.textButtonLabel}>Remove photo</Text>
            </Pressable>}
            {avatarError && <Text accessibilityLiveRegion="polite" style={formStyles.alert}>{avatarError}</Text>}
          </View>
        </View>

        <FormField label="Username" value={username} onChangeText={(value) => setUsername(normalizeUsernameInput(value))}
          autoCapitalize="none" autoCorrect={false} autoComplete="username-new" maxLength={20} placeholder="e.g. longhorn_reads"
          helper="3–20 lowercase letters, numbers or _. You can’t change it later."
          error={(touched || username.length >= 3) ? problems.username : null}
          status={availability === 'idle' ? null : AVAILABILITY_TEXT[availability]} />
        <FormField label="Display name" value={displayName} onChangeText={setDisplayName} autoComplete="name"
          textContentType="name" maxLength={50} error={touched ? problems.displayName : null} />
        <FormField label="Major (optional)" value={major} onChangeText={setMajor} maxLength={60} error={problems.major} />

        <View style={styles.group}>
          <FormField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad"
            inputMode="tel" autoComplete="tel" textContentType="telephoneNumber" maxLength={20}
            placeholder="(512) 555-0123" error={touched || e164 ? problems.phone : null}
            helper="Hashed on this device. Nook stores only the hash, never your number." />
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: discoverable, disabled: !e164 }}
            accessibilityLabel="Let people who have my number find me" accessibilityHint={DISCOVERY_NOTE}
            disabled={!e164} onPress={() => setDiscoverable((value) => !value)} style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={formStyles.section}>Let people who have my number find me</Text>
              <Text style={formStyles.body}>{e164 ? DISCOVERY_NOTE : 'Add a phone number to turn this on.'}</Text>
            </View>
            <Switch value={discoverable && !!e164} disabled={!e164} onValueChange={setDiscoverable}
              accessible={false} importantForAccessibility="no"
              trackColor={{ false: theme.colors.progressInactive, true: theme.colors.chipSelectedBorder }} />
          </Pressable>
        </View>

        <View style={styles.group}>
          <Text style={formStyles.section}>Your study vibe</Text>
          {tags.length ? <>
            <View style={styles.tags}>{tags.map((tag) => <Chip key={tag} label={tag} selected displayOnly onPress={() => {}} />)}</View>
            {vibeLine && <Text style={formStyles.body}>{vibeLine}</Text>}
            <Text style={styles.caption}>From your study preferences. It updates when you change them.</Text>
          </> : <Text style={formStyles.body}>Pick study preferences and they’ll show here.</Text>}
        </View>

        {error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={formStyles.alert}>{error}</Text>}
        <View style={styles.actions}>
          <Button label="Create profile" onPress={() => void submit()} busy={busy} disabled={avatarBusy} />
          <Button label="Sign out" variant="outline" onPress={() => void signOut()} disabled={busy} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  intro: { gap: theme.spacing.sm },
  group: { gap: theme.spacing.md },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.lg },
  avatar: { width: theme.sizes.thumbnail, height: theme.sizes.thumbnail, borderRadius: theme.radii.pill, overflow: 'hidden',
    backgroundColor: theme.colors.chipSelectedBackground, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { color: theme.colors.sageText, fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.size.title, fontWeight: theme.typography.weight.bold },
  avatarActions: { flex: 1, minWidth: 160, gap: theme.spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.sizes.tapTarget },
  switchText: { flex: 1, gap: theme.spacing.xxs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  caption: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
  actions: { gap: theme.spacing.md },
});
