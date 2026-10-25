import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { bundledDatasetLabel, bundledRealPlaces, recovery } from '.';
import type { ProviderChoice } from './recovery';
import { Button } from '../components';
import { theme } from '../theme';

export function RecoveryControls({expanded = false}: {expanded?: boolean}) {
  const [open, setOpen] = useState(expanded);
  const state = useSyncExternalStore(recovery.subscribe, recovery.getState, recovery.getState);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const choose = async (choice: ProviderChoice) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await recovery.switchTo(choice);
      router.replace('/');
    } catch (cause) {setError(cause instanceof Error ? cause.message : 'Dataset switch failed. Please retry.');}
    finally {setBusy(false);}
  };
  return <View style={s.panel}>
    <Text style={s.title}>Dataset: {state.choice === 'api' ? 'API connection' : state.choice === 'cached' ? 'Offline cached real places' : bundledDatasetLabel}</Text>
    <Button label={open ? 'Hide dataset controls' : 'Data & recovery'} variant="outline" onPress={() => setOpen((value) => !value)} />
    {open && <>
    <Text style={s.text}>Switching clears place selection, search, drafts and GPS origin. Applied filters stay strict. Saved places stay scoped to each dataset.</Text>
    {state.cached && <Text style={s.text}>Offline copy: {state.cached.city.name} · {state.cached.city.datasetVersion}{'\n'}Source snapshot fetched: {state.cached.fetchedAt}</Text>}
    {!state.cached && <Text style={s.text}>No validated real offline copy available. Connect to the API once to save one.</Text>}
    {state.choice === 'cached' && <Text style={s.text}>No network refresh. Facts retain original source timestamps. Additional detail source snippets are unavailable offline; images and maps may need a connection.</Text>}
    {state.choice === 'demo' && <Text style={s.text}>{bundledRealPlaces
      ? 'Five real UT Austin study places. Cached SerpApi photos and facts; additional study notes are team-provided. Confirm access and hours before visiting.'
      : 'Bundled fictional venues and synthetic facts · fixed demo clock. No real venue facts are included.'}</Text>}
    {state.cacheWarning && <Text role="alert" style={s.text}>{state.cacheWarning}</Text>}
    {error && <Text role="alert" style={s.text}>{error}</Text>}
    <Button label={state.choice === 'api' ? 'Reconnect API dataset' : 'Use API dataset'} variant="outline" disabled={busy} onPress={() => {void choose('api');}} />
    {state.choice !== 'cached' && <Button label="Use cached real dataset" variant="outline" disabled={busy || !state.cached} onPress={() => {void choose('cached');}} />}
    {state.choice !== 'demo' && <Button label={bundledRealPlaces ? 'Use UT Austin study collection' : 'Use fictional demo data'} variant="outline" disabled={busy} onPress={() => {void choose('demo');}} />}
    </>}
  </View>;
}
const s = StyleSheet.create({panel: {gap: 10, padding: 16, borderRadius: 16, backgroundColor: theme.colors.surface},
  title: {fontSize: 15, fontWeight: '600', color: theme.colors.text},
  text: {fontSize: 13, lineHeight: 20, color: theme.colors.textMuted}});
