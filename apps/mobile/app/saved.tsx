import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SpotDetail } from '@space/contracts';
import { Button, EmptyState, ErrorState, LoadingState } from '../src/components';
import { provider } from '../src/data';
import { PlaceNotFoundError } from '../src/data/providers';
import { useSession } from '../src/data/SessionProvider';
import { SessionGate } from '../src/features/session/SessionGate';
import { theme } from '../src/theme';

function Saved() {
  const {session, toggleSaved} = useSession();
  const [entries, setEntries] = useState<{id: string; detail: SpotDetail | null; missing: boolean}[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [removing, setRemoving] = useState(false);
  const router = useRouter();
  const ids = session!.settings.savedIds;
  useEffect(() => {
    let active = true;
    setLoading(true); setEntries([]);
    void Promise.all(ids.map(async (id) => {
      try {return {id, detail: await provider.getSpot(id), missing: false};}
      catch (error) {return {id, detail: null, missing: error instanceof PlaceNotFoundError};}
    })).then((data) => {if (active) {setEntries(data); setLoading(false);}});
    return () => {active = false;};
  }, [ids, attempt]);
  return <ScrollView contentContainerStyle={s.page}>
    <Text style={s.caption}>Saved on this device · {session!.city.name} · {session!.city.datasetVersion}</Text>
    {loading ? <LoadingState message="Loading saved places…" /> : !ids.length
      ? <EmptyState title="No saved places" message="Open a place and tap Save to find it here." action={{label: 'Explore places', onPress: () => router.replace('/')}} />
      : entries.map(({id, detail, missing}) => <View key={id} style={s.card}>
        {detail ? <><Text style={s.title}>{detail.spot.name}</Text><Text style={s.caption}>{detail.spot.address}</Text>
          <Button label="View place" onPress={() => router.push({pathname: '/spot/[id]', params: {id}})} />
        </> : <ErrorState title={missing ? 'Saved place no longer available' : 'Saved place unavailable'}
          message={missing ? 'This place is not in the current dataset. You can remove this saved ID.' : 'Check your connection and retry. Your saved ID is kept.'}
          action={!missing ? {label: 'Retry', onPress: () => setAttempt((a) => a + 1)} : undefined} />}
        <Button label="Remove from saved" variant="outline" disabled={removing} onPress={() => {
          if (removing) return;
          setRemoving(true); setSaveError(false);
          void toggleSaved(id).catch(() => setSaveError(true)).finally(() => setRemoving(false));
        }} />
      </View>)}
    {saveError && <Text role="alert" style={s.caption}>The saved place could not be removed. Try again.</Text>}
  </ScrollView>;
}
export default function SavedRoute() {return <SessionGate><Saved /></SessionGate>;}
const s = StyleSheet.create({page: {padding: 24, paddingBottom: 48, gap: 16, maxWidth: 680, width: '100%', alignSelf: 'center'},
  card: {padding: 16, gap: 12, backgroundColor: theme.colors.surface, borderRadius: 20},
  title: {fontSize: 20, color: theme.colors.text, fontWeight: '600'},
  caption: {fontSize: 13, lineHeight: 20, color: theme.colors.textMuted}});
