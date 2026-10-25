import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditEvidenceQuality, digest } from '../evidence-quality';
import { semanticReviews } from './evidence-review';

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !args[0]) throw new Error('Explicit private historical bundle path required');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const read = (path: string) => readFile(path, 'utf8');
  const [bundle, base, published, projectionReview] = await Promise.all([
    read(resolve(args[0])), read(resolve(root, '../fixtures/data/austin-20261025-v1.json')),
    read(resolve(root, '../fixtures/data/austin-20261025-muse-photos-v1.json')),
    read(resolve(root, 'muse-review-austin-v1.json')),
  ]);
  const report = auditEvidenceQuality({ bundle: JSON.parse(bundle), base: JSON.parse(base),
    published: JSON.parse(published), projectionReview: JSON.parse(projectionReview), semanticReviews });
  console.log(JSON.stringify({ ...report, artifactHashes: { base: digest(base), published: digest(published),
    projectionReview: digest(projectionReview), historicalBundle: digest(bundle) } }, null, 2));
  if (report.unresolvedHolds.length || report.privacy.length) process.exitCode = 1;
}
main().catch(() => { console.error('Evidence audit failed: verify explicit private bundle, reviewed identities and immutable artifacts. No acquisition attempted.'); process.exitCode = 2; });
