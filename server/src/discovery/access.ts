import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { DiscoveryRequestSchema, SnapshotSchema, SpotDetailSchema,
  TesterSessionRequestSchema, TesterSessionResponseSchema } from '@space/contracts';
import type { DiscoveryService } from './service';

export function createTesterAccess({ accessCode, now = Date.now }: { accessCode: string; now?: () => number }) {
  if (accessCode.trim().length < 8 || accessCode.length > 128) throw new Error('NEARBY_TESTER_ACCESS_CODE must be 8..128 characters');
  const digest = (value: string) => createHash('sha256').update(value).digest();
  const expected = digest(accessCode);
  const sessions = new Map<string, { expires: number; calls: number; window: number; refreshes: number }>();
  const attempts = new Map<string, { count: number; expires: number }>();
  const guestAttempts = new Map<string, { count: number; expires: number }>();
  function prune() {
    for (const [id, entry] of sessions) if (entry.expires <= now()) sessions.delete(id);
    for (const [id, entry] of attempts) if (entry.expires <= now()) attempts.delete(id);
    for (const [id, entry] of guestAttempts) if (entry.expires <= now()) guestAttempts.delete(id);
  }
  function issueSession() {
    const sessionId = randomBytes(32).toString('hex');
    const expires = now() + 1_800_000;
    sessions.set(sessionId, { expires, calls: 0, window: now(), refreshes: 0 });
    return TesterSessionResponseSchema.parse({ schemaVersion: 1, sessionId, expiresAt: new Date(expires).toISOString() });
  }
  function guest(address: string) {
    prune();
    const key = digest(address).toString('hex');
    const entry = guestAttempts.get(key) ?? { count: 0, expires: now() + 600_000 };
    // NAT and API tunnels can put several demo phones behind one direct address.
    // Paid requests still share the durable 250 ceiling, per-session and concurrency caps.
    if (entry.count >= 60 || guestAttempts.size >= 1000 || sessions.size >= 200) return null;
    entry.count++; guestAttempts.set(key, entry);
    return issueSession();
  }
  function exchange(code: string, address: string) {
    prune();
    const key = digest(address).toString('hex'); // Only short-lived in-memory abuse bucket.
    const entry = attempts.get(key) ?? { count: 0, expires: now() + 600_000 };
    if (entry.count >= 5 || attempts.size >= 1000 || sessions.size >= 200) return null;
    entry.count++; attempts.set(key, entry);
    if (!timingSafeEqual(digest(code), expected)) return null;
    return issueSession();
  }
  async function authorizeSession(id: string) { prune(); return sessions.has(id); }
  async function allowDiscovery(id: string, refresh: boolean) {
    if (!await authorizeSession(id)) return false;
    const session = sessions.get(id)!;
    if (now() - session.window >= 60_000) { session.calls = 0; session.window = now(); }
    if (session.calls >= 10 || (refresh && session.refreshes >= 3)) return false;
    session.calls++;
    if (refresh) session.refreshes++;
    return true;
  }
  return { exchange, guest, authorizeSession, allowDiscovery };
}
export type TesterAccess = ReturnType<typeof createTesterAccess>;
export function createDiscoveryRouter(service: DiscoveryService, access: TesterAccess) {
  const router = Router();
  const error = (code: string, message: string, requestId: string, retryable = false) => ({ error: { code, message, retryable }, requestId });
  router.post('/guest-sessions', (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length) {
      res.status(400).json(error('invalid_body', 'Expected an empty object', res.locals.requestId)); return;
    }
    const session = access.guest(req.ip ?? 'unknown');
    if (!session) { res.status(429).json(error('session_limit', 'Nearby access is busy; retry shortly', res.locals.requestId, true)); return; }
    res.setHeader('Cache-Control', 'no-store'); res.json(session);
  });
  router.post('/tester-sessions', (req, res) => {
    const input = TesterSessionRequestSchema.safeParse(req.body);
    if (!input.success) { res.status(400).json(error('invalid_body', 'Expected an access code of 8..128 characters', res.locals.requestId)); return; }
    const session = access.exchange(input.data.accessCode, req.ip ?? 'unknown');
    if (!session) { res.status(403).json(error('session_denied', 'Access code invalid or session limit reached', res.locals.requestId)); return; }
    res.setHeader('Cache-Control', 'no-store'); res.json(session);
  });
  router.post('/discovery', async (req, res) => {
    const input = DiscoveryRequestSchema.safeParse(req.body);
    if (!input.success) { res.status(400).json(error('invalid_body', 'Expected a tester session and valid foreground or manual origin', res.locals.requestId)); return; }
    if (!await access.authorizeSession(input.data.sessionId)) { res.status(401).json(error('session_expired', 'Enter a valid tester access code', res.locals.requestId)); return; }
    if (!await access.allowDiscovery(input.data.sessionId, input.data.refresh)) { res.status(429).json(error('request_limit', 'Nearby request limit reached', res.locals.requestId, true)); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.json(await service.discover(input.data));
  });
  const requireSession: RequestHandler = async (req, res, next) => {
    const header = req.get('authorization');
    const id = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (!await access.authorizeSession(id)) { res.status(401).json(error('session_expired', 'Enter a valid tester access code', res.locals.requestId)); return; }
    if (Object.keys(req.query).length) { res.status(400).json(error('invalid_query', 'No query parameters accepted', res.locals.requestId)); return; }
    res.setHeader('Cache-Control', 'no-store'); next();
  };
  router.get('/discovery/:snapshotId', requireSession, async (req, res) => {
    const dataset = await service.getDataset(String(req.params.snapshotId));
    if (!dataset) { res.status(404).json(error('not_found', 'Snapshot expired or missing', res.locals.requestId)); return; }
    res.json(SnapshotSchema.parse(dataset.snapshot));
  });
  router.get('/discovery/:snapshotId/places/:placeId', requireSession, async (req, res) => {
    const dataset = await service.getDataset(String(req.params.snapshotId));
    const detail = dataset?.details.find((d) => d.spot.id === req.params.placeId);
    if (!detail) { res.status(404).json(error('not_found', 'Place not found in this snapshot', res.locals.requestId)); return; }
    res.json(SpotDetailSchema.parse(detail));
  });
  return router;
}
