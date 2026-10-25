import { describe, expect, it } from 'vitest';
import { sheetDestination, sheetHeights } from './exploreSheet';

describe('Explore sheet bounds and gesture settling', () => {
  it('uses a 140pt peek and 60% expanded viewport', () => {
    expect(sheetHeights(800, 92, 20)).toEqual({ peek: 140, expanded: 480 });
  });
  it('keeps a large-text header reachable and clamps to short viewports', () => {
    expect(sheetHeights(568, 180, 34)).toEqual({ peek: 226, expanded: 340.8 });
    expect(sheetHeights(180, 200, 34)).toEqual({ peek: 180, expanded: 180 });
    expect(sheetHeights(0, 92, 0)).toEqual({ peek: 0, expanded: 0 });
  });
  it('settles slow drags to the nearer position and honors deliberate flings', () => {
    const sizes = sheetHeights(800, 92, 20);
    expect(sheetDestination(300, 0.1, sizes)).toBe('peek');
    expect(sheetDestination(360, -0.1, sizes)).toBe('expanded');
    expect(sheetDestination(180, -0.8, sizes)).toBe('expanded');
    expect(sheetDestination(450, 0.8, sizes)).toBe('peek');
  });
});
