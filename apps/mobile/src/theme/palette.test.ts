import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({ Platform: { select: (values: { default?: string }) => values.default } }));
import { theme } from './theme';
import { palette } from './palette';

// WCAG sRGB relative luminance. Ratios are compared without rounding upward.
function luminance(hex: string): number {
  const value = parseInt(hex.slice(1), 16);
  const channels = [value >> 16, (value >> 8) & 255, value & 255].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(a: string, b: string): number {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe('Figma palette and contrast exceptions', () => {
  it('reuses canonical palette colors and existing dark rust ink', () => {
    expect(theme.colors.sage).toBe(palette.sage500);
    expect(theme.colors.rust).toBe(palette.rust500);
    expect(theme.colors.amberBackground).toBe(palette.amber300);
    expect(theme.colors.rustBackground).toBe(palette.rust300);
    expect(theme.colors.rustText).toBe(theme.colors.error);
  });

  it('requires the darker sage small-text exception on the actual pill surface', () => {
    expect(contrast(palette.sage700, theme.colors.chipSelectedBackground)).toBeLessThan(4.5);
    expect(contrast(theme.colors.sageText, theme.colors.chipSelectedBackground)).toBeGreaterThanOrEqual(4.5);
  });

  it('requires the amber UI exception and gives every ring 3:1 against its opaque backing', () => {
    expect(contrast(palette.amber500, theme.colors.background)).toBeLessThan(3);
    for (const ring of [theme.colors.sage, theme.colors.amber, theme.colors.rust, theme.colors.grey]) {
      expect(contrast(ring, theme.colors.background)).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives all status labels small-text contrast on their corresponding backgrounds', () => {
    for (const [ink, fill] of [
      [theme.colors.sageText, theme.colors.chipSelectedBackground],
      [theme.colors.text, theme.colors.amberBackground],
      [theme.colors.rustText, theme.colors.rustBackground],
      [theme.colors.greyText, theme.colors.greyBackground],
    ] as const) expect(contrast(ink, fill)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps historical bars and gaps visible and uses accessible small captions', () => {
    for (const graphic of [theme.colors.sage, theme.colors.sageText, theme.colors.grey]) {
      expect(contrast(graphic, theme.colors.surface)).toBeGreaterThanOrEqual(3);
    }
    expect(contrast(theme.colors.textMuted, theme.colors.surface)).toBeLessThan(4.5);
    expect(contrast(theme.colors.secondaryText, theme.colors.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('preserves contrast in the separate observation badge and fit-scale text', () => {
    expect(contrast(theme.colors.observationBorder, theme.colors.observationBackground)).toBeGreaterThanOrEqual(3);
    expect(contrast(theme.colors.observationText, theme.colors.observationBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.colors.secondaryText, theme.colors.observationBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.colors.buttonText, theme.colors.fitHigh)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.colors.text, theme.colors.fitModerate)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.colors.text, theme.colors.fitLow)).toBeGreaterThanOrEqual(4.5);
  });
});
