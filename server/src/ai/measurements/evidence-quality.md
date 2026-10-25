# Evidence quality audit — October 25, 2026

## Scope and reproducibility

Read-only replay from fetched main `7e67622` in isolated `feat/muse-evidence-quality`.
Synced subsequent main `6e8ec5f`; the audited artifacts are unchanged.
The operator confirmed reuse of the existing private historical validation bundle.
No access smoke, model/provider acquisition, database write, publication, immutable
dataset edit, user GPS persistence or credential output was performed.

From the repository root, using an existing dependency installation:

```sh
npx tsx server/src/ai/measurements/audit-evidence.ts /absolute/private/path/muse-validation-review.local > /tmp/evidence-quality.local
```

Exit **1** means the audit completed and found semantic/privacy holds (the expected
result for these artifacts). Exit **2** means invalid/mismatched inputs; stdout is
not a completed report. Exit 0 requires no reported holds. No environment secrets,
network access or fresh cache/model requests are needed. The historical bundle is
not committed. Keep operator material private; do not paste whole source snippets.

`evidence-review.ts` is the source/output-hash-locked human admission/omission
manifest: all 38 non-unknown extracted claims have a disposition, rationale, cited
ID and short non-identifying supporting/contradicting excerpt. The command emits
JSON with each actual value, IDs, admission state, model/prompt/cache key, source
hash, generation time, summary word count and artifact hashes. It checks projection
against the existing B rules, without altering B code or rewriting cached records.
Changed source/output requires fresh **review**, not automatic acceptance.

## Reproduced findings

| Check | Actual result |
| --- | --- |
| Immutable candidate places / historical records | 30 / 10 |
| Source hash, derived cache key, identity, model/prompt/language | 10/10 match |
| Source IDs recomputed from place/text/URL/observed time | 50/50 match |
| B schema, allowed tags, bounded summaries, citation linkage | 10/10 pass |
| Summaries / admitted tag claims | 10 / 25 |
| Numeric noise values | **0** |
| Group-friendly numeric values | **1**: Civil Goat, heuristic 0.8 |
| Known Wi-Fi / outlet values | **0 / 0**; unknown stays unknown |
| Extracted non-unknown claims reviewed / admitted | 38 / 36 |
| Admitted claims with manual semantic support | 35; **one unresolved prior hold** |
| Existing omitted claims preserved | 2: Black Fox `outlets=no`, Fleet `date_night` |
| Selected public review citations | 34; admitted text and source URLs match historical source |
| Public snippets with previously reviewed embedded names | **6**, across 4 places |
| New acquisition / model calls | **0 / 0** |

Summary counts are whitespace-delimited words under the existing 25-word bound.
Tag weights and group-friendly 0.8 are model heuristics, not calibrated measurements.
Subjective cozy/trendy/lively tags have reviewed textual support; lively is not a
numeric noise reading or live crowd observation, and budget is not a price level.

| Place | Summary words | Currently admitted tags |
| --- | ---: | --- |
| Desnudo Coffee: East Austin | 19 | outdoor, cozy, trendy |
| UFO Coffee & Tea | 14 | trendy, cozy, lively, budget |
| Kick Butt Coffee | 12 | lively, cozy |
| Civil Goat | 15 | cozy, trendy, work_friendly, group_friendly, outdoor, lively |
| Violette Bakehouse | 13 | cozy, budget |
| Fleet Coffee | 13 | cozy, outdoor, lively |
| Better Half Coffee & Cocktails | 16 | outdoor |
| Muse Coffee Co | 17 | **outdoor — withheld by C review, still present in artifact** |
| Black Fox Coffee | 14 | trendy, outdoor |
| Idlewild Coffee | 12 | trendy |

## B review / release holds

1. **Preserve the third rejection.** Muse Coffee Co
   `google:46265cf661e6b0d32c7428170424e5a1`, `tags.outdoor=0.8` cites truck/parking
   descriptions, not outdoor customer seating/space. Its source and output are
   unchanged from the prior rejection. B's current omission policy suppresses
   only the other two held claims. C has not silently reapproved or removed it.
   B should review a narrowly omitted new projection, or provide newly reviewed
   supporting evidence. Do not advertise this tag as supported meanwhile.
2. **Privacy hold remains.** Six publicly cited snippets retain previously noted
   staff/third-party names at Desnudo (2), Kick Butt (1), Muse Coffee Co (1), and
   Idlewild (2). Exact IDs appear in the JSON manifest, without repeating names.
   This is a known-issue review, not an exhaustive PII detector or privacy approval.
   B owns redaction, private source/cache provenance and any separately versioned
   replacement. Sanitizing a source changes its hash; changed public text must not
   be passed off as the unchanged hash-derived source. Review explicit mapping,
   citation IDs and extraction reuse/invalidation together. No new paid calls are
   authorized by this audit.
3. **Scope of linkage.** The 10 historical records match their original source
   hashes and the 34 selected public texts exactly; this verifies replay identity,
   not the current contents of the private database, upstream truth, semantic
   entailment from arbitrary text, or presenter-phone behavior. Sources have
   residual embedded names, so “fully anonymous” is not an approved demo claim.

The parser validates schema and references, **not general semantic entailment**.
A syntactically valid claim can cite an unrelated snippet. Tests explicitly retain
this distinction; the offline human review flags the truck/outdoor counterexample
instead of treating passing Zod validation as factual verification. Injection tests
cover rejection of extra fields and unavailable fallback, not immunity to every
schema-valid malicious model response. Reviewed cached projection remains required.

## Artifact provenance

- Source `austin-20261025-v1`: SHA-256 `f7de2c55e300b5b9731b303c0ef5852fa15789b0f3720084968371a29e71aff8`.
- Published `austin-20261025-muse-photos-v1`: SHA-256 `bae26a4d32597262f8f8cbfa4740535505b732f5a30684a921781f3c7ab1b731`.
- Existing B review: SHA-256 `a6beb5c068dafb298b570589795b1a55b1818ef4120e04442154ecf2e0d5479a`.
- Historical private bundle bytes: SHA-256 `5f6ba6aedb5a381cdd8ef38a026f7f0e99cd9142d668f6a780eb7691b0f68e09`.
- All 10 records: `muse-spark-1.3`, `space-evidence-v1`; generation window
  `2026-10-25T04:12:47.928Z`–`2026-10-25T04:13:28.505Z`. Not a new extraction run.

## A/D demo wording and phone checks

“Ten real cached Muse summaries describe review-supported atmosphere. We validate
bounded output and citations, review the claims, and rank cached candidates with
ordinary code. This snapshot has no numeric noise estimates, no known Wi-Fi/outlet
facts, and only one inferred group-friendly value. These are not live seat or crowd
guarantees; filter changes make no Muse calls.”

Do not claim all tags are supported or all citations anonymous until B resolves the
two release concerns above. Do not infer quietness, free prices, working amenities,
available seats or night opening. The ten summaries do not imply that the default
campus top three have summaries; rehearse real detail IDs separately. Do not claim
that real Study/Friends rankings differ without the separate reproducible ranking
evaluation. A newly approved B time-enriched artifact needs its own audit/version.

Still needed on the presenter phone: open reviewed real summary details and their
citation text/source labels; verify unknown noise/Wi-Fi/outlet/group labels and
strict required-amenity empty states; verify summaries missing from default top
three remain honestly labeled; change filters/Now/Later with no extraction request;
test unavailable/cache fallback and explicit real/demo labels. This PR changes no
mobile UI and does not claim phone acceptance. D owns integration/merge.
