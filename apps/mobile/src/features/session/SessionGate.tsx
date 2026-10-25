import { Fragment, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, usePathname } from 'expo-router';
import { recovery } from '../../data';
import { RecoveryControls } from '../../data/RecoveryControls';
import { useSession } from '../../data/SessionProvider';
import { Button, ErrorState, LoadingState } from '../../components';
import { theme } from '../../theme';

const SLOW_LOAD_NOTICE_MS = 5000;

export function SessionGate({children}: {children: ReactNode}) {
  const {revision} = useSyncExternalStore(recovery.subscribe, recovery.getState, recovery.getState);
  const {session, loading, error, retry, recoverStorage} = useSession();
  const [recovering, setRecovering] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const path = usePathname();
  const [slowLoad, setSlowLoad] = useState(false);
  useEffect(() => {
    if (!loading) { setSlowLoad(false); return; }
    const timer = setTimeout(() => setSlowLoad(true), SLOW_LOAD_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [loading]);
  if (loading || !session) return <View style={s.center}>
    {loading ? <LoadingState message={slowLoad ? 'Waking the server… the first load can take up to a minute.' : 'Loading dataset and local preferences…'} /> : <>
      <ErrorState title="Dataset or preferences unavailable" message={resetError ?? error ?? 'Please retry.'}
        action={{label: 'Retry', onPress: retry}} />
      <RecoveryControls expanded />
      <Button label="Reset local settings and retry" variant="outline" busy={recovering} onPress={() => {
        setRecovering(true); setResetError(null);
        void recoverStorage().catch(() => setResetError('Reset unavailable. Restore the API connection and retry.'))
          .finally(() => setRecovering(false));
      }} />
    </>}
  </View>;
  if (!session.settings.completed && path !== '/onboarding') return <Redirect href="/onboarding" />;
  if (session.settings.completed && path === '/onboarding') return <Redirect href="/(tabs)/map" />;
  return <Fragment key={revision}>{children}</Fragment>;
}
const s = StyleSheet.create({center: {flex: 1, backgroundColor: theme.colors.background, padding: 24, justifyContent: 'center', gap: 16}});
