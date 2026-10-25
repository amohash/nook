import { createHash } from 'node:crypto';
import { InstantSchema, z } from '@space/contracts';
import type { EvidenceCache, ExtractionRecord } from '../ai/extract';
import { ExtractionSchema } from '../ai/schema';
import type { SupabaseStore } from '../data/supabase';

const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const ValidatedOutputSchema = z.unknown().transform((value, ctx) => {
  const result = ExtractionSchema.safeParse(value);
  if (result.success) return result.data;
  ctx.addIssue({ code: 'custom', message: 'Invalid extraction output' });
  return z.NEVER;
});
export const ExtractionRecordSchema = z.strictObject({
  key: HashSchema, sourceHash: HashSchema, model: z.string().min(1).max(200),
  promptVersion: z.string().min(1).max(200), language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
  generatedAt: InstantSchema, output: ValidatedOutputSchema,
});
export function extractionRecordKey(record: Pick<ExtractionRecord, 'sourceHash' | 'model' | 'promptVersion' | 'language'> & { output: { placeId: string } }): string {
  return createHash('sha256').update(JSON.stringify([record.output.placeId, record.sourceHash,
    record.model, record.promptVersion, record.language])).digest('hex');
}

/** Implements C's get/set interface, not ProviderCache. Complete records remain private. */
export class SupabaseEvidenceCache implements EvidenceCache {
  constructor(private db: Pick<SupabaseStore, 'call'>) {}
  async get(key: string): Promise<ExtractionRecord | undefined> {
    HashSchema.parse(key);
    const rows = z.array(z.object({ spot_id: z.string(), source_hash: z.string(), model: z.string(),
      prompt_version: z.string(), document: z.unknown() })).parse(await this.db.call(
      `ai_features?document->>key=eq.${key}&select=spot_id,source_hash,model,prompt_version,document&limit=1`));
    const row = rows[0];
    if (!row) return;
    const record = ExtractionRecordSchema.parse(row.document);
    if (record.key !== key || extractionRecordKey(record) !== key || row.spot_id !== record.output.placeId ||
      row.source_hash !== record.sourceHash || row.model !== record.model || row.prompt_version !== record.promptVersion) {
      throw new Error('Extraction cache identity mismatch');
    }
    return record;
  }
  async set(key: string, input: ExtractionRecord): Promise<void> {
    const record = ExtractionRecordSchema.parse(input);
    if (record.key !== key || extractionRecordKey(record) !== key) throw new Error('Extraction cache identity mismatch');
    // C's source hash includes source.language; language also remains explicit in document and key.
    await this.db.call('ai_features?on_conflict=spot_id,source_hash,model,prompt_version', {
      spot_id: record.output.placeId, source_hash: record.sourceHash, model: record.model,
      prompt_version: record.promptVersion, document: record,
    });
  }
}
