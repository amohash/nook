export class ServiceError extends Error {
  constructor(public code: string, public status = 503) { super(code); }
}

// Covers both headers and body consumption; never surface upstream URLs or bodies.
export async function fetchJson(url: string | URL, init: RequestInit = {}, timeoutMs = 4000,
  transport: typeof fetch = fetch): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await transport(url, { ...init, signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new ServiceError(response.status === 429 ? 'provider_rate_limited' : 'provider_unavailable');
    const reader = response.body?.getReader();
    if (!reader) throw new ServiceError('provider_invalid_response');
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 4_000_000) { await reader.cancel(); throw new ServiceError('provider_response_too_large'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(controller.signal.aborted ? 'provider_timeout' : 'provider_unavailable');
  } finally { clearTimeout(timer); }
}
