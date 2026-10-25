import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState } from '../components';
import { theme } from '../theme';
import { useAuth } from './AuthProvider';
import { getSupabase } from './client';
import { FormField, formStyles } from './FormField';
import { BackChevron } from './icons';
import { hashPhone } from './phoneHash';
import { AvatarPicker, DiscoveryToggle } from './profileParts';
import { discoverableAfter, displayNameProblem, majorProblem, phoneAction, toE164 } from './profileRules';
import { updateProfile, type ProfilePatch } from './socialApi';

export type EditProfileScreenProps = { onDone?: () => void; onBack?: () => void };

/** Username is shown but fixed. Phone numbers are hashed on-device; only the hash is stored. */
export function EditProfileScreen({ onDone, onBack }: EditProfileScreenProps) {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [major, setMajor] = useState(profile?.major ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [phone, setPhone] = useState('');
  const [removePhone, setRemovePhone] = useState(false);
  const [discoverable, setDiscoverable] = useState(profile?.discoverable_by_phone ?? false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return <SafeAreaView style={styles.safe}><View style={formStyles.page}>
    <EmptyState title="No profile yet" message="Create your profile first." /></View></SafeAreaView>;

  const hasSaved = !!profile.phone_hash;
  const e164 = phone.trim() ? toE164(phone) : null;
  const action = phoneAction({ hasSaved, enteredE164: e164, removed: removePhone });
  const phoneProblem = phone.trim() && !e164 ? 'Enter a 10-digit US number, or start with + and the country code.' : null;
  const problems = { displayName: displayNameProblem(displayName), major: majorProblem(major) };
  const valid = !problems.displayName && !problems.major && !phoneProblem;
  const willHavePhone = action === 'replace' || (action === 'keep' && hasSaved);

  const save = async () => {
    setTouched(true); setError(null);
    const client = getSupabase();
    if (!client || !valid || busy) return;
    setBusy(true);
    try {
      const patch: ProfilePatch = { display_name: displayName.trim(), major: major.trim() || null, avatar_url: avatarUrl,
        discoverable_by_phone: discoverableAfter(action, hasSaved, discoverable) };
      // Only the hash leaves the device; the raw number is never stored or sent.
      if (action === 'replace' && e164) patch.phone_hash = await hashPhone(e164);
      if (action === 'clear') patch.phone_hash = null;
      await updateProfile(client, profile.id, patch);
      await refreshProfile();
      onDone?.();
    } catch {
      setError('Couldn’t save your profile. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={formStyles.page} keyboardShouldPersistTaps="handled">
        {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} disabled={busy}
          style={[formStyles.iconButton, styles.back]}><BackChevron /></Pressable>}
        <Text accessibilityRole="header" style={formStyles.title}>Edit profile</Text>

        <AvatarPicker userId={profile.id} url={avatarUrl} onChange={setAvatarUrl} name={displayName} username={profile.username} />

        <FormField label="Username" prefix="@" value={profile.username} editable={false} selectTextOnFocus={false}
          helper="Usernames can’t be changed." />
        <FormField label="Display name" value={displayName} onChangeText={setDisplayName} autoComplete="name"
          textContentType="name" maxLength={50} placeholder="Your name" error={touched || !displayName ? problems.displayName : null} />
        <FormField label="Major (optional)" value={major} onChangeText={setMajor} maxLength={60}
          placeholder="e.g. Computer Science" error={problems.major} />

        <View style={styles.group}>
          <FormField label="Phone (optional)" value={phone} onChangeText={(value) => { setPhone(value); setRemovePhone(false); }}
            keyboardType="phone-pad" inputMode="tel" autoComplete="tel" textContentType="telephoneNumber" maxLength={20}
            placeholder="(512) 555-0123" error={touched || e164 ? phoneProblem : null}
            helper={hasSaved && !removePhone ? 'A number is saved; only its hash is stored. Enter a new number to replace it.'
              : removePhone ? 'Your saved number will be removed when you save.' : undefined} />
          {hasSaved && !phone && !removePhone && <Pressable accessibilityRole="button" onPress={() => setRemovePhone(true)}
            style={[formStyles.iconButton, styles.start]}><Text style={[formStyles.small, formStyles.link]}>Remove saved number</Text></Pressable>}
        </View>
        <DiscoveryToggle value={discoverable} onChange={setDiscoverable} enabled={willHavePhone} />

        {error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={formStyles.alert}>{error}</Text>}
        <Button label="Save changes" onPress={() => void save()} busy={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  back: { alignSelf: 'flex-start', marginLeft: -theme.spacing.md },
  group: { gap: theme.spacing.xxs },
  start: { alignSelf: 'flex-start' },
});
