// Public configuration only; this script never reads server/.env or sends provider keys.
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { parse } from 'dotenv';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mobile = resolve(root, 'apps/mobile');
const env = {...process.env};
for (const name of ['.env.development.local', '.env.local', '.env.development', '.env']) {
  const path = resolve(mobile, name);
  if (existsSync(path)) for (const [key, value] of Object.entries(parse(readFileSync(path)))) env[key] ??= value;
}
try {
  if (env.EXPO_PUBLIC_DATA_PROVIDER !== 'api' || env.EXPO_PUBLIC_NEARBY_ENABLED !== '1') {
    throw new Error('Set EXPO_PUBLIC_DATA_PROVIDER=api and EXPO_PUBLIC_NEARBY_ENABLED=1 in apps/mobile/.env.local.');
  }
  let base;
  try {base = new URL(env.EXPO_PUBLIC_API_BASE_URL);} catch {throw new Error('Set EXPO_PUBLIC_API_BASE_URL to the public HTTPS API origin.');}
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash ||
      /^(localhost|127\.|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(base.hostname)) {
    throw new Error('Tunnel mode requires a public HTTPS API URL. Expo tunnels Metro only; localhost/LAN API addresses will not work over cellular.');
  }
  const headers = {'ngrok-skip-browser-warning': 'true'};
  const get = async (path) => {
    const response = await fetch(base.toString().replace(/\/$/, '') + path, {headers, signal: AbortSignal.timeout(45_000)});
    if (!response.ok) throw new Error(`API ${path} returned HTTP ${response.status}. Start the backend and its HTTPS tunnel.`);
    try {return await response.json();} catch {throw new Error(`API ${path} did not return JSON. Check the API tunnel address.`);}
  };
  const health = await get('/health');
  if (health.status !== 'ok' || health.contractVersion !== 1) throw new Error('API health contract mismatch.');
  const cities = await get('/v1/cities');
  if (!cities.cities?.some((city) => city.id === 'us-tx-austin' && city.mode !== 'demo')) throw new Error('API must serve a real Austin dataset; check server DATASET_PATH.');
  const discovery = await fetch(base.toString().replace(/\/$/, '') + '/v1/discovery/nearby-preflight', {headers, signal: AbortSignal.timeout(10_000)});
  if (discovery.status !== 401) throw new Error('Nearby API is not enabled or access control is missing. Check server NEARBY_ENABLED and restart it.');
  console.log('Phone preflight passed: public HTTPS API reachable, real Austin dataset, nearby discovery enabled in mobile.');
  console.log('Keep the API and its tunnel running. Nearby access starts automatically in Explore; tap Use my location.');
  if (process.argv.includes('--start')) {
    const require = createRequire(import.meta.url);
    const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', '--go', '--tunnel'], {cwd: mobile, env, stdio: 'inherit'});
    child.on('exit', (code) => {process.exitCode = code ?? 1;});
  }
} catch (error) {
  // Never print network errors with embedded request URLs or environment values.
  console.error(error instanceof Error && error.name !== 'TypeError' ? error.message : 'Phone preflight failed. Check the backend and public HTTPS API tunnel.');
  process.exitCode = 1;
}
