import { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { AssistantQueryPatchSchema, AssistantRequestSchema, AssistantResponseSchema,
  type AssistantQueryPatch, type Query } from '@space/contracts';
import { MuseAssistantEntry } from '../../components/MuseAssistantEntry';
import { MuseAssistantPanel, type MuseAssistantMessage, type MuseAssistantStatus } from '../../components/MuseAssistantPanel';
import { provider } from '../../data';
import { useSession } from '../../data/SessionProvider';
import { applyAssistantProposal } from './assistantProposal';
import { ApiUnavailableError } from '../../data/providers';

export function PlaceAssistant({placeIds = []}: {placeIds?: string[]}) {
  const {session, setQuery, nearby, testerSession} = useSession();
  const query = session!.query;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<MuseAssistantMessage[]>([]);
  const [status, setStatus] = useState<MuseAssistantStatus>('idle');
  const [proposal, setProposal] = useState<{id: string; query: Query; patch: AssistantQueryPatch} | null>(null);
  const current = useRef(query);
  current.current = query;
  const generation = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    ++generation.current; busy.current = false;
    setMessages([]); setProposal(null); setStatus('idle'); setInput('');
    return () => {++generation.current; busy.current = false;};
  }, [query]);
  const enabled = process.env.EXPO_PUBLIC_ASSISTANT_ENABLED === '1';
  const canSubmit = !!testerSession && !!query.snapshotId && !nearby.busy && nearby.result?.snapshotId === query.snapshotId;
  const disabledReason = !canSubmit ? 'Enable nearby access and load supported-area candidates before asking Muse.' : undefined;
  const close = () => {++generation.current; busy.current = false; setOpen(false); setStatus('idle'); setProposal(null);};
  const submit = async () => {
    if (!canSubmit || busy.current || !input.trim()) return;
    const startedQuery = query;
    const requestGeneration = ++generation.current;
    const active = () => current.current === startedQuery && generation.current === requestGeneration;
    const message = input.trim();
    busy.current = true; setStatus('waiting'); setProposal(null);
    setMessages((value) => [...value.slice(-10), {id: `user-${requestGeneration}`, role: 'user', text: message}]);
    try {
      const request = AssistantRequestSchema.parse({sessionId: testerSession!.sessionId, snapshotId: query.snapshotId,
        message, query, placeIds: placeIds.slice(0, 3)});
      const response = AssistantResponseSchema.parse(await provider.assist!(request));
      if (!active()) return;
      const spots = nearby.result?.snapshot?.spots ?? [];
      const references = response.references.map((ref) => {
        const spot = spots.find((item) => item.id === ref.placeId);
        if (!spot) throw new Error('Unknown assistant reference');
        return {placeId: spot.id, name: spot.name, explanation: 'Referenced place evidence. Open the place for facts and sources.'};
      });
      setMessages((value) => [...value.slice(-10), {id: response.requestId, role: 'assistant', text: response.text, references}]);
      setStatus(response.status === 'ready' || response.status === 'out_of_scope' ? 'idle' : response.status);
      if (response.proposedQueryPatch && Object.keys(response.proposedQueryPatch).length) {
        setProposal({id: response.requestId, query: startedQuery, patch: AssistantQueryPatchSchema.parse(response.proposedQueryPatch)});
      }
    } catch (cause) {
      if (active()) setStatus(cause instanceof ApiUnavailableError && /quota|limit/.test(cause.code) ? 'quota' : 'error');
    } finally {if (active()) busy.current = false;}
  };
  if (!enabled) return null;
  return <>
    <MuseAssistantEntry onPress={() => setOpen(true)} unavailableReason={disabledReason} />
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <MuseAssistantPanel input={input} onInputChange={(value) => setInput(value.slice(0, 800))}
        onSubmit={() => {void submit();}} onRetry={() => {void submit();}} onClose={close}
        messages={messages} status={status} retryable={status === 'error' || status === 'unavailable' || status === 'empty'}
        canSubmit={canSubmit} disabledReason={disabledReason} inputMaxLength={800}
        proposal={proposal && proposal.query === query ? {id: proposal.id, explanation: 'Muse suggests these changes. Review each change before applying.',
          rows: Object.entries(proposal.patch).map(([key, value]) => ({label: key.replace(/([A-Z])/g, ' $1'),
            before: JSON.stringify(query[key as keyof Query]), after: JSON.stringify(value)}))} : null}
        onApply={(id) => {
          if (!proposal || proposal.id !== id || proposal.query !== current.current || !canSubmit) return;
          const patch = AssistantQueryPatchSchema.parse(proposal.patch);
          setQuery((latest) => applyAssistantProposal(latest, proposal.query, patch));
          setProposal(null);
        }} onCancel={() => setProposal(null)}
        onPlacePress={(id) => {
          if (!nearby.result?.snapshot?.spots.some((spot) => spot.id === id)) return;
          close(); router.push({pathname: '/spot/[id]', params: {id}});
        }} onSourcePress={() => {}} />
    </Modal>
  </>;
}
