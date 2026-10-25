import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { EmptyState } from './States';

function Placeholder({ title, message }: { title: string; message: string }) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.page}>
    <ScrollView contentContainerStyle={styles.content}>
      <EmptyState title={title} message={message} />
    </ScrollView>
  </SafeAreaView>;
}

export function FriendsPlaceholder() {
  return <Placeholder title="Friends · coming soon" message="Finding places with friends is coming soon." />;
}
export function BookmarksPlaceholder() {
  return <Placeholder title="Bookmarks · coming soon" message="This bookmarks screen is coming soon." />;
}
export function ProfilePlaceholder() {
  return <Placeholder title="Profile · coming soon" message="Your profile screen is coming soon." />;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, justifyContent: 'center', width: '100%',
    maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center', paddingVertical: theme.spacing.xl },
});
