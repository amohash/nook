export type ExploreSheetPosition = 'peek' | 'expanded';

/** Screen-local dimensions; large-text headers may grow the otherwise 140pt peek. */
export function sheetHeights(height: number, headerHeight: number, bottomInset: number) {
  const available = Math.max(0, height);
  const peek = Math.min(available, Math.max(140, headerHeight + bottomInset + 12));
  return { peek, expanded: Math.min(available, Math.max(peek, available * 0.6)) };
}

export function sheetDestination(height: number, velocityY: number, sizes: ReturnType<typeof sheetHeights>): ExploreSheetPosition {
  if (Math.abs(velocityY) > 0.5) return velocityY < 0 ? 'expanded' : 'peek';
  return height > (sizes.peek + sizes.expanded) / 2 ? 'expanded' : 'peek';
}
