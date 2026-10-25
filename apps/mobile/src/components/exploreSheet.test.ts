import { describe, expect, it } from 'vitest';
import { rubberBand, sheetDestination, sheetHeights } from './exploreSheet';

describe('Explore sheet never covers the controls above it', () => {
  it('stops the expanded sheet below the measured top controls', () => {
    expect(sheetHeights(800, 92, 0, 250)).toEqual({ peek: 140, expanded: 550 });
  });
  it('falls back to 60% until the controls are measured and never shrinks below the peek', () => {
    expect(sheetHeights(800, 92, 0)).toEqual({ peek: 140, expanded: 480 });
    expect(sheetHeights(400, 92, 0, 380)).toEqual({ peek: 140, expanded: 140 });
  });
});

describe('Explore sheet rubber band', () => {
  it('follows the finger one to one inside the limits', () => {
    expect(rubberBand(120, 0, 400)).toBe(120);
  });
  it('resists past either end instead of stopping dead', () => {
    expect(rubberBand(-40, 0, 400)).toBe(-10);
    expect(rubberBand(440, 0, 400)).toBe(410);
  });
});

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
