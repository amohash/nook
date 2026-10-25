import type { Spot } from '@space/contracts';

/** Only public Google-hosted thumbnails; never expose a provider proxy or credential. */
export function providerImage(value: unknown): Spot['image'] {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !/^lh[3-6]\.googleusercontent\.com$/.test(url.hostname)
      || url.username || url.password || url.port || url.search || url.hash) return null;
    return { url: url.href, attribution: 'Google Maps via SerpApi' };
  } catch { return null; }
}
