import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { MuseAssistantEntry } from './MuseAssistantEntry';
import { MuseAssistantPanel, type MuseAssistantMessage, type MuseAssistantStatus } from './MuseAssistantPanel';

const sample: MuseAssistantMessage[] = [
  { id: 'question', role: 'user', text: 'Why this spot?' },
  { id: 'answer', role: 'assistant', text: 'The short estimated walk may suit your study plan. There is not enough evidence to promise a quiet seat.',
    facts: ['Sample venue · estimated walk: 8 minutes · illustrative only'],
    unknowns: ['Wi-Fi, outlets and noise are unknown.', 'Current seating is unknown.'],
    references: [{ placeId: 'sample-place', name: 'Sample venue', explanation: 'Fictional preview reference · no real venue facts.' }],
    sources: [{ id: 'sample-source', label: 'Sample source · preview only' }] },
];

/** Development-only specimen. Do not mount as the production assistant. No requests. */
export function MuseAssistantDesignPreview() {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<MuseAssistantStatus>('idle');
  const [answer, setAnswer] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [proposal, setProposal] = useState(true);
  const [note, setNote] = useState('Sample content only · no provider calls or saved conversation.');
  return <View style={styles.preview}>
    <ScrollView testID="muse-preview-toolbar" style={styles.toolbar} contentContainerStyle={styles.controls}>
      <Text accessibilityRole="header">Muse component preview · all content illustrative</Text>
      <Text testID="preview-note">{note}</Text>
      <MuseAssistantEntry onPress={() => setNote('Entry callback received.')} />
      <View style={styles.row}>{(['idle', 'waiting', 'empty', 'error', 'quota', 'unavailable'] as const).map((value) => <View key={value} style={styles.option}>
        <Button label={value} variant="outline" onPress={() => setStatus(value)} /></View>)}</View>
      <Button label="Toggle sample answer" onPress={() => setAnswer(!answer)} />
      <Button label="Toggle snapshot availability" onPress={() => setEnabled(!enabled)} />
    </ScrollView>
    <MuseAssistantPanel input={input} onInputChange={setInput} status={status} messages={answer ? sample : []}
      canSubmit={enabled} disabledReason={enabled ? undefined : 'A supported place snapshot is needed before asking Muse.'}
      retryable={status === 'error' || status === 'empty'}
      onSubmit={() => setNote(`Submit callback received (${input.length} characters). No request sent.`)}
      onRetry={() => setNote('Retry callback received. No request sent.')} onClose={() => setNote('Close callback received.')}
      onPlacePress={(id) => setNote(`Place callback: ${id}`)} onSourcePress={(id) => setNote(`Source callback: ${id}`)}
      proposal={answer && proposal ? { id: 'sample-proposal', explanation: 'Illustrative proposal to prefer a quieter atmosphere.',
        rows: [{ label: 'Noise preference', before: 'Balanced (0.5)', after: 'Quiet (0.2)' }] } : null}
      onApply={() => { setNote('Apply callback received. Preview filters unchanged.'); setProposal(false); }}
      onCancel={() => { setNote('Cancel callback received.'); setProposal(false); }} />
  </View>;
}
const styles = StyleSheet.create({
  preview: { flex: 1, minHeight: 0 },
  toolbar: { maxHeight: '25%', flexGrow: 0 },
  controls: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minWidth: 96, flexGrow: 1 },
});
