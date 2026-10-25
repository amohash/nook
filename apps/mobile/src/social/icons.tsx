import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

// Drawn with Views like NookTabBar's icons; no icon/SVG dependency.
const hidden = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

export function EyeIcon({ crossed = false, color = theme.colors.textMuted }: { crossed?: boolean; color?: string }) {
  return <View {...hidden} style={styles.box}>
    <View style={[styles.eye, { borderColor: color }]} />
    <View style={[styles.pupil, { borderColor: color }]} />
    {crossed && <View style={[styles.slash, { backgroundColor: color }]} />}
  </View>;
}

export function CameraIcon({ color = theme.colors.textMuted }: { color?: string }) {
  return <View {...hidden} style={styles.camera}>
    <View style={[styles.cameraTop, { borderColor: color }]} />
    <View style={[styles.cameraBody, { borderColor: color }]} />
    <View style={[styles.lens, { borderColor: color }]} />
  </View>;
}

export function LockIcon({ color = theme.colors.textMuted }: { color?: string }) {
  return <View {...hidden} style={styles.lock}>
    <View style={[styles.shackle, { borderColor: color }]} />
    <View style={[styles.lockBody, { borderColor: color }]} />
  </View>;
}

/** Filled bookmark (saved). */
export function BookmarkIcon({ color = theme.colors.text }: { color?: string }) {
  return <View {...hidden} style={styles.bookmark}>
    <View style={[styles.bookmarkBody, { backgroundColor: color }]} />
    <View style={[styles.bookmarkNotch, { borderBottomColor: theme.colors.background }]} />
  </View>;
}

export function SearchIcon({ color = theme.colors.textMuted }: { color?: string }) {
  return <View {...hidden} style={styles.box}>
    <View style={[styles.lensRing, { borderColor: color }]} />
    <View style={[styles.lensHandle, { backgroundColor: color }]} />
  </View>;
}

export function BackChevron() {
  return <View {...hidden} style={styles.chevron} />;
}

const styles = StyleSheet.create({
  box: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  eye: { position: 'absolute', width: 22, height: 14, borderRadius: theme.radii.pill, borderWidth: theme.borders.icon },
  pupil: { width: 8, height: 8, borderRadius: theme.radii.pill, borderWidth: theme.borders.icon },
  slash: { position: 'absolute', width: 24, height: theme.borders.icon, borderRadius: theme.radii.pill,
    transform: [{ rotate: '-35deg' }] },
  camera: { width: 40, height: 34, alignItems: 'center', justifyContent: 'flex-end' },
  cameraTop: { position: 'absolute', top: 0, width: 14, height: 8, borderTopLeftRadius: 3, borderTopRightRadius: 3,
    borderWidth: theme.borders.icon, borderBottomWidth: 0 },
  cameraBody: { width: 40, height: 28, borderRadius: 8, borderWidth: theme.borders.icon },
  lens: { position: 'absolute', bottom: 7, width: 14, height: 14, borderRadius: theme.radii.pill, borderWidth: theme.borders.icon },
  lock: { width: 28, height: 32, alignItems: 'center' },
  shackle: { width: 16, height: 14, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: theme.borders.icon,
    borderBottomWidth: 0 },
  lockBody: { width: 26, height: 18, borderRadius: 5, borderWidth: theme.borders.icon },
  bookmark: { width: 18, height: 22, alignItems: 'center' },
  bookmarkBody: { width: 18, height: 22 },
  bookmarkNotch: { position: 'absolute', bottom: 0, width: 0, height: 0, borderLeftWidth: 9, borderRightWidth: 9,
    borderBottomWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  lensRing: { position: 'absolute', top: 3, left: 3, width: 14, height: 14, borderRadius: theme.radii.pill,
    borderWidth: theme.borders.icon },
  lensHandle: { position: 'absolute', top: 17, left: 15, width: 7, height: theme.borders.icon, borderRadius: theme.radii.pill,
    transform: [{ rotate: '45deg' }] },
  chevron: { width: theme.sizes.backChevron + 2, height: theme.sizes.backChevron + 2, marginLeft: theme.spacing.xxs,
    borderLeftWidth: theme.borders.icon, borderBottomWidth: theme.borders.icon, borderColor: theme.colors.text,
    transform: [{ rotate: '45deg' }] },
});
