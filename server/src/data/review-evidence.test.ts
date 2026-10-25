import { describe, expect, it, vi } from 'vitest';
import { normalizePlace } from './normalize';
import { collectReviewEvidence, ReviewEvidenceSchema, SupabaseReviewEvidenceStore } from './review-evidence';

const at = '2026-10-25T02:49:00Z';
const spot = normalizePlace({ place_id: 'test-provider-place', title: 'Test cafe', type: 'Coffee shop',
  address: 'Test address', gps_coordinates: { latitude: 30.2862, longitude: -97.7394 },
}, at, 'austin-evidence-test');
const review = { username: 'Alice Test', contributor_id: '12345678901234',
  link: 'https://www.google.com/maps/reviews/data=test-review', date_iso8601: '2026-10-20T12:00:00Z',
  date: '4 days ago', description: 'Alice Test: quiet tables, Wi-Fi and outlets. alice@example.com +1 (512) 555-1234 @alice https://example.com',
};
const raw = (reviews = [review]) => ({ place_id: spot.providerPlaceId, user_reviews: { most_relevant: reviews } });
const collect = () => collectReviewEvidence(spot, raw(), at)!;

describe('anonymous review evidence', () => {
  it('retains actual review text, stable place identity, links and timestamps without author/contact fields', () => {
    const result = ReviewEvidenceSchema.parse(collect());
    expect(result.source).toMatchObject({ placeId: spot.id, category: 'cafe', language: 'en' });
    expect(result.languageBasis).toBe('provider_request_locale');
    expect(result.source.snippets[0]!.text).toContain('quiet tables, Wi-Fi and outlets');
    expect(JSON.stringify(result)).not.toMatch(/Alice Test|alice@|512|username|contributor|user_thumbnail|example\.com/);
    expect(result.provenance[0]).toMatchObject({ sourceUrl: review.link, observedAt: review.date_iso8601, fetchedAt: at });
    expect(result.provenance[0]!.id).toBe(result.source.snippets[0]!.id);
  });
  it('redacts before truncation, bounds snippets and keeps IDs stable across capture times and ordering', () => {
    const reviews = Array.from({ length: 10 }, (_, index) => ({ ...review,
      description: `${index} ${'word '.repeat(96)}alice@example.com ${'more '.repeat(30)}`,
      link: `https://www.google.com/maps/reviews/data=test-${index}`,
    }));
    const first = collectReviewEvidence(spot, raw(reviews.slice(0, 8)), at)!;
    const next = collectReviewEvidence(spot, raw([...reviews.slice(0, 8)].reverse()), '2026-10-26T00:00:00Z')!;
    expect(first.source).toEqual(next.source);
    expect(first.source.snippets.every((s) => s.text.length <= 500 && !s.text.includes('alice@'))).toBe(true);
    expect(collectReviewEvidence(spot, raw(reviews), at)!.source.snippets).toHaveLength(8);
  });
  it('does not invent snippets from name, address, rating, summaries or missing/foreign reviews', () => {
    expect(collectReviewEvidence(spot, { place_id: spot.providerPlaceId, title: 'Quiet cafe', rating: 5 }, at)).toBeUndefined();
    expect(collectReviewEvidence(spot, { ...raw(), place_id: 'other' }, at)).toBeUndefined();
    expect(collectReviewEvidence(spot, raw([{ ...review, description: '' }]), at)).toBeUndefined();
    const unknownDate = collectReviewEvidence(spot, raw([{ ...review, date_iso8601: 'yesterday' }]), at)!;
    expect(unknownDate.provenance[0]!.observedAt).toBeNull();
    expect(unknownDate.provenance[0]!.sourceDateText).toBe('4 days ago');
  });
  it('does not retain credential-bearing or reviewer-profile URLs', () => {
    for (const link of ['https://serpapi.com/search?api_key=secret', 'https://www.google.com/maps/contrib/12345678901234']) {
      const result = collectReviewEvidence(spot, raw([{ ...review, link }]), at)!;
      expect(result.provenance[0]!.sourceUrl).toBe(spot.publicPlaceUrl);
    }
  });
  it('redacts batch-wide names and local phone numbers without removing partial-word matches', () => {
    const result = collectReviewEvidence(spot, raw([{ ...review,
      description: 'Planning with Ann at quiet tables. Call 555-1234.',
    }]), at, 'en', ['Ann'])!;
    expect(result.source.snippets[0]!.text).toBe('Planning with [redacted] at quiet tables. Call [redacted].');
    const special = collectReviewEvidence(spot, raw([{ ...review,
      username: 'Al.+(Test)', description: 'Al.+(Test) says this is quiet.',
    }]), at)!;
    expect(special.source.snippets[0]!.text).toBe('[redacted] says this is quiet.');
  });
});

describe('private review loader', () => {
  it('round-trips the anonymous bundle with complete provenance, and rejects mismatched identities', async () => {
    let stored: unknown;
    const call = vi.fn(async (_path: string, body?: unknown): Promise<unknown> => {
      if (body) { stored = (body as { document: unknown }).document; return []; }
      return stored ? [{ document: stored }] : [];
    });
    expect(await new SupabaseReviewEvidenceStore({ call }).get(spot.id, spot.datasetVersion)).toBeUndefined();
    await new SupabaseReviewEvidenceStore({ call }).put(collect());
    expect(await new SupabaseReviewEvidenceStore({ call }).get(spot.id, spot.datasetVersion)).toEqual(collect());
    expect(call.mock.calls[1]![0]).toBe('place_evidence?on_conflict=id');
    await expect(new SupabaseReviewEvidenceStore({ call }).get('wrong-place', spot.datasetVersion)).rejects.toThrow('Review identity mismatch');
    await expect(new SupabaseReviewEvidenceStore({ call }).get(spot.id, 'wrong-version')).rejects.toThrow('Review identity mismatch');
    const wrong = collect(); wrong.provenance[0]!.id = 'foreign-review';
    expect(ReviewEvidenceSchema.safeParse(wrong).success).toBe(false);
  });
});
