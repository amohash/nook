import { QuerySchema, RelaxationSchema, type Query } from '@space/contracts';

type RelaxationAction = { label: string; patch: Partial<Query> };
const allowed = new Set(['maxWalkMinutes', 'maxPriceLevel', 'categories', 'requireOpenForSession', 'amenities', 'access', 'limit']);

/** Fail closed: one genuine constraint relaxation, with no context or preference changes. */
export function validateRelaxation(query: Query, proposal: unknown): RelaxationAction | null {
  const parsed = RelaxationSchema.safeParse(proposal);
  if (!parsed.success) return null;
  const patch = parsed.data.patch;
  if (Object.keys(patch).some((key) => !allowed.has(key))) return null;
  const changes: RelaxationAction[] = [];
  if (patch.maxWalkMinutes !== undefined && patch.maxWalkMinutes !== query.maxWalkMinutes) {
    if (patch.maxWalkMinutes < query.maxWalkMinutes) return null;
    changes.push({label: `Increase estimated walk limit from ${query.maxWalkMinutes} to ${patch.maxWalkMinutes} minutes`, patch: {maxWalkMinutes: patch.maxWalkMinutes}});
  }
  if (patch.maxPriceLevel !== undefined && patch.maxPriceLevel !== query.maxPriceLevel) {
    if (query.maxPriceLevel === null || (patch.maxPriceLevel !== null && patch.maxPriceLevel < query.maxPriceLevel)) return null;
    changes.push({label: patch.maxPriceLevel === null ? 'Remove the price cap (includes unknown prices)' : `Raise price cap from level ${query.maxPriceLevel} to ${patch.maxPriceLevel}`, patch: {maxPriceLevel: patch.maxPriceLevel}});
  }
  if (patch.categories !== undefined && JSON.stringify(patch.categories) !== JSON.stringify(query.categories)) {
    if (!query.categories.length || (patch.categories.length && query.categories.some((category) => !patch.categories!.includes(category)))) return null;
    changes.push({label: patch.categories.length ? `Expand categories to ${patch.categories.join(', ')}` : 'Allow all categories', patch: {categories: patch.categories}});
  }
  if (patch.requireOpenForSession !== undefined && patch.requireOpenForSession !== query.requireOpenForSession) {
    if (patch.requireOpenForSession) return null;
    changes.push({label: 'Stop requiring verified opening hours for the full session', patch: {requireOpenForSession: false}});
  }
  if (patch.access !== undefined && patch.access !== query.access) {
    if (patch.access !== 'any') return null;
    changes.push({label: 'Stop requiring verified public access', patch: {access: 'any'}});
  }
  if (patch.amenities !== undefined) {
    for (const key of ['wifi', 'outlets'] as const) {
      const value = patch.amenities[key];
      if (value === query.amenities[key]) continue;
      if (query.amenities[key] !== 'require' || value === 'require') return null;
      changes.push({label: `${value === 'prefer' ? 'Prefer' : 'Ignore'} ${key === 'wifi' ? 'Wi-Fi' : 'outlets'} instead of requiring it`, patch: {amenities: {...query.amenities, [key]: value}}});
    }
  }
  // limit can be inserted by QuerySchema.partial() defaults; it is never a relaxation.
  return changes.length === 1 ? changes[0]! : null;
}

export function relaxationActions(query: Query, proposals: unknown): RelaxationAction[] {
  if (!Array.isArray(proposals)) return [];
  const seen = new Set<string>();
  return proposals.flatMap((proposal) => {
    const action = validateRelaxation(query, proposal);
    if (!action) return [];
    const key = JSON.stringify(action.patch);
    if (seen.has(key)) return [];
    seen.add(key);
    return [action];
  });
}

export function applyRelaxation(query: Query, proposal: unknown): Query {
  const action = validateRelaxation(query, proposal);
  if (!action) return query;
  const result = QuerySchema.safeParse({...query, ...action.patch});
  return result.success ? result.data : query;
}
