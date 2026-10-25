import { AssistantQueryPatchSchema, QuerySchema, type Query } from '@space/contracts';

// A proposal belongs to the exact query the user reviewed. A later origin,
// snapshot or filter edit invalidates it, even when the fields look similar.
export function applyAssistantProposal(current: Query, reviewed: Query, patch: unknown): Query {
  if (current !== reviewed) return current;
  return QuerySchema.parse({...current, ...AssistantQueryPatchSchema.parse(patch)});
}
