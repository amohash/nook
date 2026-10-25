import { useRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Button } from './Button';

// Presentation models only. D maps validated shared responses and snapshot facts.
export type MusePlaceReference = { placeId: string; name: string; explanation: string };
export type MuseSourceLink = { id: string; label: string };
export type MuseAssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  facts?: readonly string[];
  unknowns?: readonly string[];
  references?: readonly MusePlaceReference[];
  sources?: readonly MuseSourceLink[];
};
export type MuseFilterProposal = {
  id: string;
  explanation: string;
  rows: readonly { label: string; before: string; after: string }[];
};
export type MuseAssistantStatus = 'idle' | 'waiting' | 'empty' | 'error' | 'quota' | 'unavailable';
export type MuseAssistantPanelProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onClose: () => void;
  status: MuseAssistantStatus;
  messages: readonly MuseAssistantMessage[];
  /** False for missing snapshot or unsupported area. D supplies the reason. */
  canSubmit: boolean;
  disabledReason?: string;
  statusMessage?: string;
  retryable?: boolean;
  inputMaxLength?: number;
  proposal?: MuseFilterProposal | null;
  onApply: (proposalId: string) => void;
  onCancel: (proposalId: string) => void;
  onPlacePress: (placeId: string) => void;
  /** IDs resolve to validated source URLs in D's adapter, never raw model URLs. */
  onSourcePress: (sourceId: string) => void;
  keyboardVerticalOffset?: number;
};
const starters = ['Why this spot?', 'Compare my options', 'Find somewhere quieter.'];
const statusCopy = {
  idle: '', waiting: 'Muse is checking the available place evidence…',
  empty: 'Muse returned no answer. Try a specific question about these places.',
  error: 'Muse could not finish. Your filters have not changed.',
  quota: 'Muse has reached its request limit. You can still explore the ranked places.',
  unavailable: 'Muse is unavailable. You can still explore the ranked places.',
};

/** Mount in a bounded sheet under SafeAreaProvider. D owns Modal/focus/Back and all state. */
export function MuseAssistantPanel({ input, onInputChange, onSubmit, onRetry, onClose, status, messages,
  canSubmit, disabledReason, statusMessage, retryable = false, inputMaxLength = 1000,
  proposal, onApply, onCancel, onPlacePress, onSourcePress, keyboardVerticalOffset = 0 }: MuseAssistantPanelProps) {
  const scroll = useRef<ScrollView>(null);
  const waiting = status === 'waiting';
  const blocked = !canSubmit || waiting || status === 'quota' || status === 'unavailable';
  const submit = () => { if (!blocked && input.trim()) onSubmit(); };
  return <KeyboardAvoidingView testID="muse-panel" style={styles.panel} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={keyboardVerticalOffset}>
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.header}>
      <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>Muse</Text></View>
      <View style={styles.close}><Button label="Close" variant="outline" onPress={onClose} /></View>
    </SafeAreaView>
    <ScrollView testID="muse-conversation" ref={scroll} style={styles.scroll} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
      <Text style={styles.label}>Your place assistant</Text>
      <Text style={styles.body}>Muse explains the fit; facts can be incomplete or change. Unknown Wi-Fi, noise or seating stays unknown. Typical activity is not current occupancy.</Text>
      {messages.length === 0 && <Text style={styles.body}>Ask about the selected spot or compare your current options.</Text>}
      <View style={styles.starters}>{starters.map((starter) => <Button key={starter} label={starter} variant="outline"
        disabled={blocked} onPress={() => onInputChange(starter)} accessibilityHint="Fills the question field. Tap Send to ask Muse." />)}</View>
      {messages.slice(-12).map((message) => <View key={message.id} style={[styles.message, message.role === 'user' && styles.user]}>
        <Text style={styles.label}>{message.role === 'user' ? 'You' : 'Muse’s interpretation'}</Text>
        <Text selectable style={styles.answer}>{message.text}</Text>
        {!!message.facts?.length && <View style={styles.group}><Text style={styles.label}>Venue facts · from available sources</Text>
          {message.facts.slice(0, 8).map((fact, index) => <Text key={index} style={styles.body}>{fact}</Text>)}</View>}
        {!!message.unknowns?.length && <View style={styles.group}><Text style={styles.label}>Still unknown</Text>
          {message.unknowns.slice(0, 8).map((unknown, index) => <Text key={index} style={styles.body}>{unknown}</Text>)}</View>}
        {message.references?.slice(0, 3).map((place) => <View key={place.placeId} style={styles.reference}>
          <Text style={styles.body}>{place.explanation}</Text>
          <Button label={`View ${place.name}`} variant="outline" onPress={() => onPlacePress(place.placeId)} />
        </View>)}
        {!!message.sources?.length && <View style={styles.group}><Text style={styles.label}>Evidence & sources</Text>
          {message.sources.slice(0, 8).map((source) => <Button key={source.id} label={source.label} variant="outline"
            accessibilityHint="Opens the evidence source" onPress={() => onSourcePress(source.id)} />)}</View>}
      </View>)}
      {proposal && <View style={styles.proposal}>
        <Text accessibilityRole="header" style={styles.label}>Review filter changes</Text>
        <Text style={styles.body}>{proposal.explanation}</Text>
        {proposal.rows.map((row, index) => <View key={index} style={styles.group}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.body}>Before: {row.before}</Text><Text style={styles.body}>After: {row.after}</Text>
        </View>)}
        <Text style={styles.body}>Nothing changes until you tap Apply.</Text>
        <Button label="Apply filter changes" disabled={waiting || !canSubmit} onPress={() => onApply(proposal.id)} />
        <Button label="Cancel filter changes" variant="outline" onPress={() => onCancel(proposal.id)} />
      </View>}
      {status !== 'idle' && <View accessibilityLiveRegion="polite" accessibilityRole={status === 'error' ? 'alert' : undefined} style={styles.group}>
        {waiting && <ActivityIndicator color={theme.colors.text} accessible={false} />}
        <Text style={styles.body}>{statusMessage ?? statusCopy[status]}</Text>
        {!waiting && retryable && canSubmit && <Button label="Retry Muse" variant="outline" onPress={onRetry} />}
      </View>}
    </ScrollView>
    <ScrollView testID="muse-composer" style={styles.composerScroll} keyboardShouldPersistTaps="handled">
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.composer}>
      {disabledReason && <Text style={styles.body}>{disabledReason}</Text>}
      <Text style={styles.label} nativeID="muse-question-label">Your place question</Text>
      <TextInput accessibilityLabel="Your place question" accessibilityHint="Ask about places and their evidence. Do not include sensitive personal information."
        style={styles.input} multiline value={input} onChangeText={onInputChange} editable={!blocked}
        maxLength={inputMaxLength} placeholder="What matters for your next spot?" placeholderTextColor={theme.colors.secondaryText} />
      <Button label="Send to Muse" onPress={submit} disabled={blocked || !input.trim()} busy={waiting} />
    </SafeAreaView>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  panel: { flex: 1, minHeight: 0, backgroundColor: theme.colors.background },
  header: { flexShrink: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderColor: theme.colors.chipBorder },
  heading: { flexGrow: 1, flexShrink: 1, flexBasis: 120, gap: 4 },
  close: { minWidth: 96 },
  title: { fontFamily: theme.typography.headingFamily, fontSize: 24, lineHeight: 30, color: theme.colors.text },
  body: { fontSize: 14, lineHeight: 20, color: theme.colors.secondaryText, flexShrink: 1 },
  answer: { fontSize: 16, lineHeight: 24, color: theme.colors.text },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: theme.colors.text },
  scroll: { flex: 1, minHeight: 0 },
  composerScroll: { flexGrow: 0, flexShrink: 0, maxHeight: '50%' },
  content: { padding: 16, gap: 16 },
  starters: { gap: 8 },
  group: { gap: 8 },
  message: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 20, gap: 12 },
  user: { backgroundColor: theme.colors.chipSelectedBackground },
  reference: { borderTopWidth: 1, borderColor: theme.colors.chipBorder, paddingTop: 12, gap: 8 },
  proposal: { borderWidth: 1.5, borderColor: theme.colors.focus, padding: 16, borderRadius: 20, gap: 12 },
  composer: { borderTopWidth: 1, borderColor: theme.colors.chipBorder, padding: 16, gap: 8 },
  input: { minHeight: 52, maxHeight: 120, padding: 12, fontSize: 16, lineHeight: 24, color: theme.colors.text,
    borderWidth: 1.5, borderColor: theme.colors.secondaryText, borderRadius: 12, textAlignVertical: 'top' },
});
