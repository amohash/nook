export const MUSE_MODEL = 'muse-spark-1.3';
export type MuseRequest = { model: string; system: string; user: string; signal: AbortSignal };
export type MuseCompletion = (request: MuseRequest) => Promise<string>;

/** Server-only transport. Never includes upstream bodies, headers or credentials in errors. */
export function createMuseProvider({ apiKey, fetchImpl = fetch }: {
  apiKey: string; fetchImpl?: typeof fetch;
}): MuseCompletion {
  if (!apiKey.trim()) throw new Error('META_API_KEY is required on the server');
  return async ({ model, system, user, signal }) => {
    const response = await fetchImpl('https://api.meta.ai/v1/chat/completions', {
      method: 'POST', signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0, max_tokens: 1500, response_format: { type: 'json_object' } }),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Muse request failed (${response.status})`); }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Muse response missing');
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 65_536) throw new Error('Muse response exceeds limit');
        chunks.push(value);
      }
    } finally { await reader.cancel(); reader.releaseLock(); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { choices?: { message?: { content?: unknown } }[] };
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Muse response content missing');
    return content;
  };
}
