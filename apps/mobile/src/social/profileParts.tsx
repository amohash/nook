import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Chip } from '../components';
import { theme } from '../theme';
import { pickAvatar, uploadAvatar } from './avatar';
import { getSupabase } from './client';
import { formStyles } from './FormField';
import { BookmarkIcon, CameraIcon } from './icons';
import { avatarToneIndex, initialFor, personSubtitle } from './profileRules';

// Shared pieces for the social screens. Designs: docs/design/social-*.png; wording: docs/design/README.md.
export const DISCOVERY_LABEL = 'Let people who have my number find me';
export const DISCOVERY_NOTE = 'People who have your number can find you. Only a hashed version is stored. You can turn this off anytime.';
export const SAVED_VISIBILITY = 'Visible to your followers';

const TONES = [theme.colors.sage, theme.colors.amber, theme.colors.rust, theme.colors.fitHigh];

export function Avatar({ id, url, name, username, size = 88 }: {
  id: string; url?: string | null; name?: string | null; username?: string | null; size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const frame = { width: size, height: size, borderRadius: size / 2 };
  return <View accessible={false} style={[styles.avatar, frame, { backgroundColor: TONES[avatarToneIndex(id, TONES.length)] }]}>
    {url && !failed ? <Image source={{ uri: url }} style={frame} onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      : <Text style={[styles.initial, { fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.46) }]}>
        {initialFor(name, username)}</Text>}
  </View>;
}

/** Compact pill button (the shared Button is full-width). 44pt minimum target. */
export function PillButton({ label, onPress, variant = 'outline', busy = false, disabled = false, accessibilityLabel }: {
  label: string; onPress: () => void; variant?: 'primary' | 'outline'; busy?: boolean; disabled?: boolean; accessibilityLabel?: string;
}) {
  const primary = variant === 'primary';
  const off = disabled || busy;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled: off, busy }} disabled={off} onPress={onPress}
    style={({ pressed }) => [styles.pill, primary ? styles.pillPrimary : styles.pillOutline, pressed && styles.pillPressed,
      off && styles.disabled]}>
    {busy ? <ActivityIndicator color={primary ? theme.colors.buttonText : theme.colors.text} />
      : <Text style={[styles.pillLabel, primary && styles.pillLabelPrimary]}>{label}</Text>}
  </Pressable>;
}

export type CountItem = { label: string; value: number | null; onPress?: () => void };

/** "[3] saved · [4] followers · [4] following". null renders an en dash while loading. */
export function CountsRow({ items }: { items: CountItem[] }) {
  return <View style={styles.counts}>
    {items.map(({ label, value, onPress }) => {
      const text = <>
        <Text style={styles.countValue}>{value ?? '–'}</Text>
        <Text style={styles.countLabel}>{label}</Text>
      </>;
      return onPress ? <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${value ?? 0} ${label}`}
        onPress={onPress} style={({ pressed }) => [styles.count, pressed && styles.countPressed]}>{text}</Pressable>
        : <View key={label} accessible accessibilityLabel={`${value ?? 0} ${label}`} style={styles.count}>{text}</View>;
    })}
  </View>;
}

/** Study vibe card. `highlight` marks chips shown as selected (all of them when omitted). */
export function VibeCard({ line, tags, highlight, aside, footer }: {
  line: string | null; tags: readonly string[]; highlight?: readonly string[]; aside?: string; footer?: ReactNode;
}) {
  const selected = new Set((highlight ?? tags).map((tag) => tag.toLowerCase()));
  return <View style={formStyles.card}>
    <View style={styles.cardHead}>
      <Text style={formStyles.eyebrow}>Study vibe</Text>
      {aside && <Text style={styles.aside}>{aside}</Text>}
    </View>
    {tags.length ? <>
      {line && <Text style={styles.vibeLine}>{line}</Text>}
      <View style={styles.tags}>{tags.map((tag) => <Chip key={tag} label={tag} selected={selected.has(tag.toLowerCase())}
        displayOnly onPress={() => {}} />)}</View>
    </> : <Text style={formStyles.small}>No study vibe yet.</Text>}
    {footer}
  </View>;
}

/** Compact saved-spot row: photo or fallback, name, "Category · N min walk", saved marker. */
export function SavedSpotListRow({ name, meta, imageUrl, onPress }: {
  name: string; meta: string; imageUrl?: string | null; onPress?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const body = <>
    <View style={styles.thumb}>
      {imageUrl && !failed && <Image source={{ uri: imageUrl }} style={styles.thumbImage} onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors />}
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowName} numberOfLines={2}>{name}</Text>
      {!!meta && <Text style={formStyles.small}>{meta}</Text>}
    </View>
    <BookmarkIcon />
  </>;
  return onPress ? <Pressable accessibilityRole="link" accessibilityLabel={[name, meta].filter(Boolean).join(', ')}
    accessibilityHint="Opens the place" onPress={onPress}
    style={({ pressed }) => [styles.row, pressed && styles.countPressed]}>{body}</Pressable>
    : <View accessible accessibilityLabel={[name, meta].filter(Boolean).join(', ')} style={styles.row}>{body}</View>;
}

/** Person row (Friends design): avatar, name, "@username · top tags", Follow/Following. */
export function PersonRow({ person, following, busy, showFollow = true, onToggleFollow, onOpen }: {
  person: { id: string; username: string; display_name: string | null; avatar_url: string | null; vibe_tags?: readonly string[] };
  following: boolean; busy?: boolean; showFollow?: boolean; onToggleFollow: () => void; onOpen?: () => void;
}) {
  const name = person.display_name || person.username;
  const identity = <>
    <Avatar id={person.id} url={person.avatar_url} name={person.display_name} username={person.username} size={48} />
    <View style={styles.rowText}>
      <Text style={styles.personName} numberOfLines={2}>{name}</Text>
      <Text style={formStyles.small} numberOfLines={2}>{personSubtitle(person.username, person.vibe_tags ?? [])}</Text>
    </View>
  </>;
  return <View style={styles.personRow}>
    {onOpen ? <Pressable accessibilityRole="link" accessibilityLabel={`${name}, @${person.username}`} accessibilityHint="Opens profile"
      onPress={onOpen} style={({ pressed }) => [styles.personIdentity, pressed && styles.countPressed]}>{identity}</Pressable>
      : <View style={styles.personIdentity}>{identity}</View>}
    {/* Optimistic: the new label shows at once; the button is only disabled while the request runs. */}
    {showFollow && <PillButton label={following ? 'Following' : 'Follow'} variant={following ? 'outline' : 'primary'} disabled={busy}
      onPress={onToggleFollow}
      accessibilityLabel={following ? `Following @${person.username}. Tap to unfollow.` : `Follow @${person.username}`} />}
  </View>;
}

/** Photo row used by Create and Edit profile. Library only; uploads to avatars/{uid}/avatar.jpg. */
export function AvatarPicker({ userId, url, onChange, name, username }: {
  userId: string; url: string | null; onChange: (url: string | null) => void; name?: string; username?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choose = async () => {
    const client = getSupabase();
    if (!client || busy) return;
    setError(null);
    try {
      const pick = await pickAvatar();
      if (!pick) return;
      if (!pick.ok) { setError(pick.message); return; }
      setBusy(true);
      const result = await uploadAvatar(client, userId, pick.picked);
      if (result.ok) onChange(result.url);
      else setError(result.message);
    } finally {
      setBusy(false);
    }
  };
  return <View style={styles.pickerGroup}>
    <Pressable accessibilityRole="button" accessibilityLabel={url ? 'Change photo' : 'Add a photo'}
      accessibilityHint="Optional. Opens your photo library." accessibilityState={{ busy }}
      onPress={() => void choose()} style={styles.pickerRow}>
      {url ? <Avatar id={userId} url={url} name={name} username={username} size={88} />
        : <View style={styles.pickerEmpty}><CameraIcon /></View>}
      <View style={styles.pickerText}>
        <Text style={styles.pickerTitle}>{busy ? 'Uploading…' : url ? 'Change photo' : 'Add a photo'}</Text>
        <Text style={formStyles.small}>Optional · from your photo library</Text>
      </View>
    </Pressable>
    {url && !busy && <Pressable accessibilityRole="button" onPress={() => onChange(null)} style={[formStyles.iconButton, styles.start]}>
      <Text style={[formStyles.small, formStyles.link]}>Remove photo</Text>
    </Pressable>}
    {error && <Text accessibilityLiveRegion="polite" style={formStyles.alert}>{error}</Text>}
  </View>;
}

/** "Let people who have my number find me" card with the exact privacy note. */
export function DiscoveryToggle({ value, onChange, enabled, disabledHint = 'Add a phone number to turn this on.' }: {
  value: boolean; onChange: (value: boolean) => void; enabled: boolean; disabledHint?: string;
}) {
  return <Pressable accessibilityRole="switch" accessibilityLabel={DISCOVERY_LABEL}
    accessibilityState={{ checked: value && enabled, disabled: !enabled }}
    accessibilityHint={enabled ? DISCOVERY_NOTE : disabledHint}
    disabled={!enabled} onPress={() => onChange(!value)} style={formStyles.card}>
    <View style={styles.switchRow}>
      <Text style={[formStyles.cardTitle, styles.flex]}>{DISCOVERY_LABEL}</Text>
      <Switch value={value && enabled} disabled={!enabled} onValueChange={onChange} accessible={false}
        importantForAccessibility="no" trackColor={{ false: theme.colors.placeholder, true: theme.colors.chipSelectedBorder }} />
    </View>
    <Text style={formStyles.small}>{DISCOVERY_NOTE}</Text>
    {!enabled && <Text style={formStyles.small}>{disabledHint}</Text>}
  </Pressable>;
}

export const profileStyles = StyleSheet.create({
  name: { color: theme.colors.text, fontFamily: theme.typography.headingFamily, fontSize: theme.typography.size.title,
    lineHeight: theme.typography.lineHeight.title, fontWeight: theme.typography.weight.bold, textAlign: 'center' },
  handle: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, textAlign: 'center' },
  identity: { alignItems: 'center', gap: theme.spacing.xs },
  sectionHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between',
    gap: theme.spacing.xs },
  sectionTitle: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.section,
    lineHeight: theme.typography.lineHeight.section, fontWeight: theme.typography.weight.semibold },
  list: { gap: theme.spacing.md },
  center: { alignItems: 'center', textAlign: 'center' },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  start: { alignSelf: 'flex-start' },
  disabled: { opacity: theme.opacity.disabled },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { color: theme.colors.background, fontFamily: theme.typography.headingFamily, fontWeight: theme.typography.weight.bold },
  pill: { minHeight: theme.sizes.tapTarget, minWidth: theme.sizes.controlMinWidth, paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs, borderRadius: theme.radii.pill, borderWidth: theme.borders.outline,
    alignItems: 'center', justifyContent: 'center' },
  pillPrimary: { backgroundColor: theme.colors.buttonBackground, borderColor: theme.colors.buttonBackground },
  pillOutline: { backgroundColor: theme.colors.transparent, borderColor: theme.colors.text },
  pillPressed: { borderColor: theme.colors.chipSelectedBorder },
  pillLabel: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, fontWeight: theme.typography.weight.medium, textAlign: 'center' },
  pillLabelPrimary: { color: theme.colors.buttonText },
  counts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.lg },
  count: { minWidth: 72, minHeight: theme.sizes.tapTarget, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs, borderRadius: theme.radii.field },
  countPressed: { backgroundColor: theme.colors.surface },
  countValue: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.section,
    lineHeight: theme.typography.lineHeight.section, fontWeight: theme.typography.weight.medium },
  countLabel: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body },
  cardHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: theme.spacing.xs },
  aside: { color: theme.colors.sageText, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body },
  vibeLine: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, fontWeight: theme.typography.weight.semibold },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, minHeight: theme.sizes.tapTarget,
    borderRadius: theme.radii.field },
  thumb: { width: 52, height: 52, borderRadius: theme.radii.field, overflow: 'hidden', backgroundColor: theme.colors.placeholder },
  thumbImage: { width: '100%', height: '100%' },
  rowText: { flex: 1, gap: theme.spacing.xxs },
  rowName: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, fontWeight: theme.typography.weight.semibold },
  personRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.md },
  personIdentity: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    minHeight: theme.sizes.tapTarget, borderRadius: theme.radii.field },
  personName: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, fontWeight: theme.typography.weight.semibold },
  pickerGroup: { gap: theme.spacing.xs },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.lg, minHeight: theme.sizes.tapTarget },
  pickerEmpty: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.placeholder, borderWidth: theme.borders.outline, borderStyle: 'dashed',
    borderColor: theme.colors.chipBorder },
  pickerText: { flex: 1, minWidth: 160, gap: theme.spacing.xxs },
  pickerTitle: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, fontWeight: theme.typography.weight.semibold },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
});
