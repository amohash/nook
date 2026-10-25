/** Generate a blinded relevance packet and a separate coordinator key from a real evaluation.
 * No judgments are filled in. Public manual origins only; no device data or transport.
 * npx tsx packages/core/measurements/human-rubric.ts <report.json> <dataset.json> <output-prefix>
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { DatasetSchema } from '../../../server/src/data/dataset';
import { QuerySchema } from '@space/contracts';

const [reportPath, datasetPath, prefix, ...extra] = process.argv.slice(2);
if (!reportPath || !datasetPath || !prefix || extra.length) throw new Error('Expected report, dataset and output prefix');
const datasetBytes = await readFile(datasetPath);
const dataset = DatasetSchema.parse(JSON.parse(datasetBytes.toString('utf8')));
if (dataset.snapshot.mode === 'demo') throw new Error('Human real relevance packet requires real data');
const report = JSON.parse(await readFile(reportPath, 'utf8'));
if (report.dataset.sha256 !== createHash('sha256').update(datasetBytes).digest('hex')) throw new Error('Report and dataset differ');
const key: unknown[] = [];
const cases = report.records.filter((record: { ranking: { results: unknown[] } }) => record.ranking.results.length).map(
  (record: { label: string; query: unknown; ranking: { results: { spotId: string }[] } }, index: number) => {
    const query = QuerySchema.parse(record.query);
    if (query.origin.source !== 'manual') throw new Error('No device coordinates in human packets');
    const blinded = record.ranking.results.map((r, originalRank) => ({ ...r, originalRank,
      shuffleKey: createHash('sha256').update(`packet-v1:${record.label}:${r.spotId}`).digest('hex') }))
      .sort((a, b) => a.shuffleKey.localeCompare(b.shuffleKey));
    const caseId = `case-${index + 1}`;
    const options = blinded.map((r, optionIndex) => {
      const spot = dataset.snapshot.spots.find((s) => s.id === r.spotId)!;
      const option = String.fromCharCode(65 + optionIndex);
      key.push({ caseId, option, spotId: spot.id, originalRank: r.originalRank + 1, label: record.label });
      return { option, name: spot.name, categories: spot.categories, publicPlaceUrl: spot.publicPlaceUrl,
        fetchedAt: spot.fetchedAt, priceLevel: spot.priceLevel.value, noise: spot.noise.value,
        wifi: spot.wifi.value, outlets: spot.outlets.value, hoursStatus: spot.hoursStatus,
        relevance: null, confidence: null, missingEvidence: null, explanation: null };
    });
    return { caseId, scenario: { ...query, snapshotId: undefined }, options,
      shortlistSufficient: null, wouldChooseAny: null, preferredOption: null, notes: null };
  });
await writeFile(`${prefix}-packet.json`, JSON.stringify({ packetVersion: 1, judgmentsCollected: 0,
  instructions: 'Independent human review only. Options are shuffled; scores/ranks/weights are hidden. Do not open the coordinator key until responses are locked. Null means unmeasured. Do not infer unknown facts.',
  rubric: { relevance: '0 unsuitable, 1 weak, 2 plausible, 3 strong', confidence: 'low/medium/high',
    shortlistSufficient: 'yes/no/unknown', wouldChooseAny: 'yes/no/unknown',
    missingEvidence: 'List facts you need before choosing; never assume available seats or dollar prices.' }, cases }, null, 2));
await writeFile(`${prefix}-coordinator-key.json`, JSON.stringify({ doNotShareBeforeJudgmentsLocked: true, key }, null, 2));
