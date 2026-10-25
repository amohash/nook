import type { Query, Recommendation } from '@space/contracts';
export type PlaceMapProps = {
  results: Recommendation['results']; origin: Query['origin']; departAt: string;
  selectedId: string | null; onSelect(id: string): void; onFallback(): void;
  /** Space covered by floating controls and the peeking sheet; pins are fitted outside it. */
  edgeInsets?: {top: number; bottom: number};
};
