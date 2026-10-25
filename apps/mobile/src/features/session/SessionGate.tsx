import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, usePathname } from 'expo-router';
import { useSession } from '../../data/SessionProvider';
import { Button, ErrorState, LoadingState } from '../../components';
import { theme } from '../../theme';

export function SessionGate({children}: {children: ReactNode}) {
  const {session, loading, error, retry, recoverStorage} = useSession();
  const [recovering, setRecovering] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const path = usePathname();
  if (loading || !session) return <View style={s.center}>
    {loading ? <LoadingState message="Loading dataset and local preferences…" /> : <>
      <ErrorState title="Dataset or preferences unavailable" message={resetError ?? error ?? 'Please retry.'}
        action={{label: 'Retry', onPress: retry}} />
      <Button label="Reset local settings and retry" variant="outline" busy={recovering} onPress={() => {
        setRecovering(true); setResetError(null);
        void recoverStorage().catch(() => setResetError('Reset unavailable. Restore the API connection and retry.'))
          .finally(() => setRecovering(false));
      }} />
    </>}
  </View>;
  if (!session.settings.completed && path !== '/onboarding') return <Redirect href="/onboarding" />;
  if (session.settings.completed && path === '/onboarding') return <Redirect href="/(tabs)/map" />;
  return children;
}
const s = StyleSheet.create({center: {flex: 1, backgroundColor: theme.colors.background, padding: 24, justifyContent: 'center', gap: 16}});
