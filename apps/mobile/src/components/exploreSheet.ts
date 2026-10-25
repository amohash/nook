export type ExploreSheetPosition = 'peek' | 'expanded';

const DEFAULT_EXPANDED_SHARE = 0.6;
const MIN_PEEK = 140;
const RUBBER_BAND_RESISTANCE = 0.25;

/**
 * Screen-local dimensions; large-text headers may grow the otherwise 140pt peek.
 * `topReserve` is the measured height of the controls floating above the sheet, so the
 * expanded sheet stops beneath them instead of covering them. Until measured, the sheet takes 60%.
 */
export function sheetHeights(height: number, headerHeight: number, bottomInset: number, topReserve?: number) {
  const available = Math.max(0, height);
  const peek = Math.min(available, Math.max(MIN_PEEK, headerHeight + bottomInset + 12));
  const target = topReserve === undefined ? available * DEFAULT_EXPANDED_SHARE : available - topReserve;
  return { peek, expanded: Math.min(available, Math.max(peek, target)) };
}

export function sheetDestination(height: number, velocityY: number, sizes: ReturnType<typeof sheetHeights>): ExploreSheetPosition {
  if (Math.abs(velocityY) > 0.5) return velocityY < 0 ? 'expanded' : 'peek';
  return height > (sizes.peek + sizes.expanded) / 2 ? 'expanded' : 'peek';
}

/** Follows the finger inside [min, max]; past either end it keeps moving, but with resistance. */
export function rubberBand(value: number, min: number, max: number): number {
  if (value < min) return min + (value - min) * RUBBER_BAND_RESISTANCE;
  if (value > max) return max + (value - max) * RUBBER_BAND_RESISTANCE;
  return value;
}
