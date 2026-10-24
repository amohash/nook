import 'dotenv/config';
import { createApp } from './app';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
const server = createApp({ commit: process.env.COMMIT_SHA ?? 'development' }).listen(port, '0.0.0.0', () => {
  console.log(`Space fixture API listening on port ${port}`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => { server.close(() => process.exit(0)); });
}
