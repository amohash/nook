# Space shared starter

This foundation has an Expo Router + TypeScript app, a Node + TypeScript API,
shared Zod v4 schemas, a pure ranker, ten fictional venues, and list/detail
navigation. It uses one npm workspace and one root lockfile. Existing planning
documents describe the larger demo; they are not a claim that all P0 is done.

## Install

Use Node **24.11.1** (`nvm use` if you use nvm) and npm **11.6.2**. From the repo root:

```sh
cd /Users/amoghastagi/Projects/nook-app
npm ci
cp apps/mobile/.env.example apps/mobile/.env
cp server/.env.example server/.env
```

Environment files are ignored. Only public transport settings belong in the
mobile file; API/provider credentials must remain in `server/.env`. No keys,
database, migrations, provider accounts or deployment are needed for this starter.
The root `mobile.env.example` and `server.env.example` remain planning references;
use the colocated examples above for these commands.

## Expo Go

```sh
npm run dev:mobile
```

Open **Expo Go compatible with SDK 57** on the presenter phone and scan Metro's
QR code (iOS Camera or Android Expo Go scanner). Phone and laptop must be on a
reachable shared network; allow Metro through the laptop firewall. No Xcode,
Android native project, prebuild, or development client is required.

SDK 57 was selected because Expo's current starter guide recommends it for
physical-device Expo Go during the SDK 58 transition. Match the installed Expo Go
SDK, rather than assuming the store build matches the newest SDK. See Expo's
[starter guide](https://docs.expo.dev/more/create-expo/) and
[compatible Go downloads](https://expo.dev/go). Device launch remains a manual
handoff gate; browser and native bundle checks do not prove phone compatibility.

The default `EXPO_PUBLIC_DATA_PROVIDER=fixture` opens without a backend. The list
shows a demo badge, manual UT Austin origin, and the fixed clock **October 24,
2026, 6 p.m. America/Chicago**. Try Solo study, Meet friends, Free only, Reset,
then open a card and return. Every venue and fact is explicitly fictional or
synthetic. Unknown ratings, reviews, crowd and seats remain unknown. Scores
change through the actual shared scorer; no winner is selected in advance.

If LAN is unavailable, Expo supports a tunnel:

```sh
npm run dev:mobile -- --tunnel
```

Tunnel tooling/network access may need setup and has not been device-verified.
Keep Metro running and the laptop awake. Bundled fixtures work after the bundle
loads; a fresh Expo Go launch still needs Metro connectivity.

## Backend and API transport

In another terminal at the repo root:

```sh
npm run dev:server
```

The API listens on `0.0.0.0:3001` (`PORT` in `server/.env`). Verify:

```sh
curl http://localhost:3001/health
curl http://localhost:3001/v1/cities
curl http://localhost:3001/v1/cities/demo-austin/spots
curl http://localhost:3001/v1/spots/demo:spot-1
```

Health returns `{"status":"ok","contractVersion":1,"commit":"development"}`.
Set `COMMIT_SHA` on deployment to identify the actual build. The API also exposes
`POST /v1/recommendations` accepting `QuerySchema`; invalid input returns the
shared error envelope with 400, unknown resources return 404, and no matches
returns 200 with an empty result array. JSON bodies are limited to 32 KB.

To exercise HTTP from the phone, edit `apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_DATA_PROVIDER=api
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAPTOP_LAN_IP:3001
```

Replace the placeholder with your laptop's reachable address, or use your
deployed HTTPS API URL. `localhost` on a phone means the phone. Restart Metro
after changing environment settings. The starter backend still returns a
**demo** dataset: transport choice does not make synthetic data live. API errors
show Retry, and stale responses are ignored. Return to `fixture` explicitly for
bundled data; no silent switch to a different dataset occurs.

`npm run dev` starts both processes. Separate terminals are easier for Expo's
interactive keyboard controls. For browser inspection:

```sh
npm run dev:web
```

## Build and checks

```sh
npm run typecheck
npm test
npm run lint
npm run build
npm run build:server
npm run export:mobile
```

`build` aliases `build:server`. Mobile export produces JS/assets for iOS,
Android and web; it is not a native installable build. Production server smoke:

```sh
npm run build:server
npm run start:server
```

Run `curl http://localhost:3001/health` while that process runs. The output
`server/dist/index.js` bundles workspace TypeScript; deployed startup does not
depend on tsx or loading raw `.ts` workspace sources. It still needs production
dependencies installed (`npm ci --omit=dev` after building, or a build stage).

## Ownership and next work

- `apps/mobile/app/`, `apps/mobile/src/data/`: D, routes and transport adapters.
- `server/src/`, `packages/contracts/`, fixture normalization: B; C owns the later recommendation route.
- `packages/core/`: C, deterministic filters, uncertainty, scoring and hours.
- Root manifests and `package-lock.json`: D; install only from the root and
  serialize dependency changes. Shared packages export source for Metro/tsx;
  esbuild bundles them for Node production.

The root pins React and the two Expo-resolved animation peers as development
dependencies as well as declaring them in mobile. This keeps npm's broad Router
peer ranges from installing a second native version. Update these pins together
using Expo's resolver when changing SDKs.

There is no database, real provider integration, Muse call, map, onboarding,
location permission, persistence, saved tab, or share sheet in this foundation.
Those belong to the assigned follow-up tasks. The first next step is launching
this exact version on the physical presenter phone and recording phone/Expo Go
versions, then sharing the foundation commit with A/B/C. Do not call it release
complete until reviewed, merged and device-tested.

## Verification recorded on October 24, 2026

On Node 24.11.1 / npm 11.6.2: root `npm ci`, `typecheck`, `test` (46 passing),
`lint`, `build`, `build:server`, and `export:mobile` passed. Expo dependency
alignment passed and Expo Doctor passed **21/21** checks. iOS and Android Hermes
bundles and a web bundle exported. The built Node server started and `/health`
returned 200. API tests prove identical ranks through the pure core, mobile
fixture provider, and mobile HTTP provider.

Browser checks at a phone-sized viewport covered study/friends ranking changes,
the strict free-only cap returning two matches, list/detail/back, missing detail,
and API loading/error/Retry/empty recovery (using temporary injected request
delay/failure/query changes in the browser, not changes to production fixtures).

`npm audit` reports **8 upstream advisories (3 moderate, 5 high)** in the Expo
toolchain/Router dependency tree. The suggested SDK changes do not preserve the
chosen Expo Go version; no forced audit fix was applied. These findings remain
open for the dependency owner. Physical presenter-phone launch and tunnel mode
have not been verified. Work remains on `chore/foundation`, pending review and
merge.
