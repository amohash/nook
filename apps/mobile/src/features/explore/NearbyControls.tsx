import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components';
import { useSession } from '../../data/SessionProvider';
import { theme } from '../../theme';

export function NearbyControls() {
  const {nearby, testerSession, authorizeNearby, refreshNearby} = useSession();
  const [code, setCode] = useState('');
  const [authorizing, setAuthorizing] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  if (!nearby.enabled) return null;
  const result = nearby.result;
  const authorize = async () => {
    if (authorizing) return;
    const accessCode = code;
    setCode(''); setAuthorizing(true); setAccessError(null);
    try {await authorizeNearby(accessCode);}
    catch {setAccessError('Tester access unavailable or code rejected. Ask the operator for a current code and retry.');}
    finally {setAuthorizing(false);}
  };
  const messages = {
    ready: 'Nearby candidates ready.', partial: 'Partial nearby results. Some provider requests failed.',
    empty: 'Discovery found no candidates in this area.', quota: 'Nearby request budget reached.',
    timeout: 'Nearby discovery timed out.', unsupported_area: 'Nearby discovery supports central Austin only. Your selected location is outside coverage. Choose Use UT Austin to explore manually.',
    unavailable: 'Nearby discovery is unavailable.',
  };
  return <View style={s.panel}>
    <Text style={s.title}>Nearby discovery · central Austin</Text>
    <Text style={s.body}>Uses one foreground origin. Filters rerank these candidates; Refresh nearby deliberately checks the provider again.</Text>
    {nearby.busy && <Text accessibilityLiveRegion="polite" style={s.body}>Discovering places near the selected origin…</Text>}
    {result && <>
      <Text accessibilityLiveRegion="polite" style={s.body}>{messages[result.status]}</Text>
      <Text style={s.body}>{result.metrics.externalAttempts} provider attempts · {result.metrics.cacheHits} cache hits · {result.metrics.partialFailures} failed requests</Text>
      {result.metrics.sourceOldestAt && <Text style={s.body}>Oldest source fetched: {result.metrics.sourceOldestAt}{result.metrics.stale ? ' · stale cached evidence' : ''}</Text>}
      {result.warnings.map((warning, index) => <Text key={index} style={s.body}>{warning}</Text>)}
    </>}
    {nearby.error && <Text accessibilityRole="alert" style={s.body}>{nearby.error}</Text>}
    {testerSession && <Button label={nearby.busy ? 'Discovering nearby…' : nearby.error ? 'Retry nearby discovery' : 'Refresh nearby'}
      busy={nearby.busy} variant="outline" onPress={refreshNearby} />}
    <Text style={s.body}>{testerSession ? 'Renew tester access if it expires.' : 'Enter the operator’s private tester access code to enable paid discovery. It is used once and never saved.'}</Text>
    <TextInput value={code} onChangeText={setCode} secureTextEntry autoCapitalize="none" autoCorrect={false}
      maxLength={128} accessibilityLabel="Tester access code" placeholder="Tester access code" placeholderTextColor={theme.colors.textMuted} style={s.input} />
    <Button label="Enable nearby access" variant="outline" disabled={code.length < 8 || authorizing}
      busy={authorizing} onPress={() => {void authorize();}} />
    {accessError && <Text accessibilityRole="alert" style={s.body}>{accessError}</Text>}
  </View>;
}
const s = StyleSheet.create({panel: {padding: 16, gap: 12, borderRadius: 18, backgroundColor: theme.colors.surface},
  title: {color: theme.colors.text, fontSize: 16, fontWeight: '600'},
  body: {color: theme.colors.textMuted, fontSize: 13, lineHeight: 20},
  input: {color: theme.colors.text, minHeight: 48, padding: 12, borderWidth: 1, borderColor: theme.colors.chipBorder, borderRadius: 12}});
