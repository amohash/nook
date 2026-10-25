import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, EmptyState } from '../components';
import { usePreferenceTags } from '../features/preferences';
import { theme } from '../theme';
import { useAuth } from './AuthProvider';
import { pickAvatar, uploadAvatar } from './avatar';
import { getSupabase } from './client';
import { FormField, formStyles, type FieldStatus } from './FormField';
import { BackChevron, CameraIcon } from './icons';
import { hashPhone } from './phoneHash';
import { createProfile, isUsernameAvailable } from './profileApi';
import { displayNameProblem, majorProblem, normalizeUsernameInput, toE164, usernameProblem, vibeLineFrom,
  vibeTagsFrom } from './profileRules';

// Design: docs/design/social-create-profile.png. Privacy wording is fixed by docs/design/README.md.
const DISCOVERY_LABEL = 'Let people who have my number find me';
const DISCOVERY_NOTE = 'People who have your number can find you. Only a hashed version is stored. You can turn this off anytime.';
const FIXED = 'can’t be changed later';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'error';

/** Debounced (400 ms) is_username_available check; stale responses are ignored. */
function useUsernameAvailability(username: string): Availability {
  const [state, setState] = useState<{ name: string; value: Availability }>({ name: '', value: 'idle' });
  useEffect(() => {
    const client = getSupabase();
    if (!client || usernameProblem(username)) return;
    let active = true;
    const timer = setTimeout(() => {
      isUsernameAvailable(client, username)
        .then((free) => { if (active) setState({ name: username, value: free ? 'available' : 'taken' }); })
        .catch(() => { if (active) setState({ name: username, value: 'error' }); });
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [username]);
  if (usernameProblem(username)) return 'idle';
  return state.name === username ? state.value : 'checking';
}

function usernameStatus(name: string, availability: Availability): FieldStatus {
  switch (availability) {
    case 'available': return { text: `✓ @${name} is available · ${FIXED}`, tone: 'good' };
    case 'taken': return { text: `@${name} is taken. Try another.`, tone: 'bad' };
    case 'checking': return { text: `Checking @${name}… · ${FIXED}`, tone: 'neutral' };
    case 'error': return { text: `Couldn’t check right now · ${FIXED}`, tone: 'neutral' };
    default: return { text: `3–20 lowercase letters, numbers or _ · ${FIXED}`, tone: 'neutral' };
  }
}

export type CreateProfileScreenProps = {
  onDone?: () => void;
  /** Back chevron. Defaults to signing out, since an account without a profile can't be used. */
  onBack?: () => void;
};

export function CreateProfileScreen({ onDone, onBack }: CreateProfileScreenProps) {
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
    if (!client || avatarBusy) return;
    setAvatarError(null);
    try {
      const pick = await pickAvatar();
      if (!pick) return;
      if (!pick.ok) { setAvatarError(pick.message); return; }
      setAvatarBusy(true);
      const result = await uploadAvatar(client, user.id, pick.picked);
      if (result.ok) setAvatar({ url: result.url, preview: result.url });
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
    if (!client || !valid || busy) return;
    setBusy(true);
    try {
      // Only the hash leaves the device; the raw number is never stored or sent.
      const phone_hash = e164 ? await hashPhone(e164) : null;
      const result = await createProfile(client, user.id, {
        username, display_name: displayName.trim(), major: major.trim() || null, avatar_url: avatar?.url ?? null,
        vibe_tags: tags, vibe_line: vibeLine, phone_hash, discoverable_by_phone: !!phone_hash && discoverable,
      });
      if (!result.ok) {
        setError(result.reason === 'username_taken' ? `@${username} was just taken. Try another.`
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
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={onBack ? 'Back' : 'Back and sign out'}
            onPress={onBack ?? (() => void signOut())} disabled={busy} style={[formStyles.iconButton, styles.back]}>
            <BackChevron />
          </Pressable>
          <Text style={formStyles.small}>Almost done</Text>
        </View>
        <View style={styles.intro}>
          <Text accessibilityRole="header" style={formStyles.title}>Create your profile</Text>
          <Text style={formStyles.body}>This is what friends see when they find you.</Text>
        </View>

        <View style={styles.group}>
          <Pressable accessibilityRole="button" accessibilityLabel={avatar ? 'Change photo' : 'Add a photo'}
            accessibilityHint="Optional. Opens your photo library." accessibilityState={{ busy: avatarBusy }}
            onPress={() => void chooseAvatar()} style={styles.avatarRow}>
            <View style={[styles.avatar, !avatar && styles.avatarEmpty]}>
              {avatar ? <Image source={{ uri: avatar.preview }} style={styles.avatarImage} accessibilityIgnoresInvertColors />
                : <CameraIcon />}
            </View>
            <View style={styles.avatarText}>
              <Text style={styles.avatarTitle}>{avatarBusy ? 'Uploading…' : avatar ? 'Change photo' : 'Add a photo'}</Text>
              <Text style={formStyles.small}>Optional · from your photo library</Text>
            </View>
          </Pressable>
          {avatar && !avatarBusy && <Pressable accessibilityRole="button" onPress={() => setAvatar(null)}
            style={[formStyles.iconButton, styles.removePhoto]}>
            <Text style={[formStyles.small, formStyles.link]}>Remove photo</Text>
          </Pressable>}
          {avatarError && <Text accessibilityLiveRegion="polite" style={formStyles.alert}>{avatarError}</Text>}
        </View>

        <FormField label="Username" prefix="@" value={username}
          onChangeText={(value) => setUsername(normalizeUsernameInput(value.replace(/^@/, '')))}
          autoCapitalize="none" autoCorrect={false} autoComplete="username-new" maxLength={20}
          error={(touched || username.length >= 3) ? problems.username : null}
          status={usernameStatus(username, availability)} />
        <FormField label="Display name" value={displayName} onChangeText={setDisplayName} autoComplete="name"
          textContentType="name" maxLength={50} placeholder="Your name" error={touched ? problems.displayName : null} />
        <FormField label="Major (optional)" value={major} onChangeText={setMajor} maxLength={60}
          placeholder="e.g. Computer Science" error={problems.major} />
        <FormField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad"
          inputMode="tel" autoComplete="tel" textContentType="telephoneNumber" maxLength={20}
          placeholder="(512) 555-0123" error={touched || e164 ? problems.phone : null} />

        <Pressable accessibilityRole="switch" accessibilityLabel={DISCOVERY_LABEL}
          accessibilityState={{ checked: discoverable && !!e164, disabled: !e164 }}
          accessibilityHint={e164 ? DISCOVERY_NOTE : 'Add a phone number to turn this on.'}
          disabled={!e164} onPress={() => setDiscoverable((value) => !value)} style={formStyles.card}>
          <View style={styles.switchRow}>
            <Text style={[formStyles.cardTitle, styles.flex]}>{DISCOVERY_LABEL}</Text>
            <Switch value={discoverable && !!e164} disabled={!e164} onValueChange={setDiscoverable}
              accessible={false} importantForAccessibility="no"
              trackColor={{ false: theme.colors.placeholder, true: theme.colors.chipSelectedBorder }} />
          </View>
          <Text style={formStyles.small}>{DISCOVERY_NOTE}</Text>
          {!e164 && <Text style={formStyles.small}>Add a phone number to turn this on.</Text>}
        </Pressable>

        <View style={formStyles.card}>
          <Text style={formStyles.eyebrow}>Your study vibe · from your preferences</Text>
          {tags.length ? <>
            {vibeLine && <Text style={styles.vibeLine}>{vibeLine}</Text>}
            <View style={styles.tags}>{tags.map((tag) => <Chip key={tag} label={tag} selected displayOnly onPress={() => {}} />)}</View>
          </> : <Text style={formStyles.small}>Pick study preferences and they’ll show here.</Text>}
        </View>

        {error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={formStyles.alert}>{error}</Text>}
        <Button label="Create profile" onPress={() => void submit()} busy={busy} disabled={avatarBusy} />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const AVATAR = 88;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  back: { marginLeft: -theme.spacing.md },
  intro: { gap: theme.spacing.xs },
  group: { gap: theme.spacing.xs },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.lg, minHeight: theme.sizes.tapTarget },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: theme.radii.pill, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.placeholder },
  avatarEmpty: { borderWidth: theme.borders.outline, borderStyle: 'dashed', borderColor: theme.colors.chipBorder },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { flex: 1, minWidth: 160, gap: theme.spacing.xxs },
  avatarTitle: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, fontWeight: theme.typography.weight.semibold },
  removePhoto: { alignSelf: 'flex-start' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  vibeLine: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, fontWeight: theme.typography.weight.semibold },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
});
