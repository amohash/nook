# Space shared starter

This foundation has an Expo Router + TypeScript app, a Node + TypeScript API,
shared Zod v4 schemas, a pure ranker, ten fictional venues, and list/detail
navigation. It uses one npm workspace and one root lockfile. Existing planning
documents describe the larger demo; they are not a claim that all P0 is done.

## Austin discovery on your physical phone

From the repository root, use `npm run check:phone` to validate the effective
mobile environment and public API. Then `npm run dev:phone` starts Expo Go in
tunnel mode. The equivalent direct command is:

```sh
cd apps/mobile
npx expo start --go --tunnel
```

Use Expo Go compatible with SDK 58 and scan Metro's QR code. Expo's tunnel serves
Metro/the app bundle only. The Node API must also remain reachable over HTTPS:
keep `npm run dev:server` and the existing API tunnel running, or use the deployed
backend after updating it. `localhost` and a laptop LAN IP do not work over cellular.
A temporary API tunnel's hostname changes when restarted; update
`EXPO_PUBLIC_API_BASE_URL` and restart Metro. `.env.development.local` overrides
`.env.local`, which overrides `.env`; `check:phone` uses that same precedence.

Mobile settings (all public):

```dotenv
EXPO_PUBLIC_DATA_PROVIDER=api
EXPO_PUBLIC_NEARBY_ENABLED=1
EXPO_PUBLIC_API_BASE_URL=https://YOUR_PUBLIC_API_HOST
```

Nearby access starts automatically in Explore using a temporary guest session; no
access code or account is needed. Tap the location chip → **Use my location**. GPS is requested only after tapping.
UT Austin remains the manual fallback. Each location acquires nearby candidates;
filters and Now/Later rerank that snapshot without buying more provider searches.
Real-data launches start with Café and Library selected; Filters can explicitly
include parks/restaurants. Unknown Wi-Fi, outlets and opening evidence stay unknown.
The default 15-minute estimated walk can honestly produce no matches; increase it
explicitly in Filters where needed. Cached/offline data covers only downloaded areas.

The service rectangle spans 30.05–30.56 latitude and -97.98–-97.55 longitude,
covering Austin and nearby neighborhoods. Searches use coarse centers, a 4.5 km
candidate radius, at most two pages per category and four detail lookups. This is
bounded provider discovery, not an exhaustive directory or proof of study amenities.
The approved local runtime account ceiling is 250 provider reservations, including
18 slots reserved for earlier accounting. It persists across restarts and does not
reset per user, filter, refresh or area. See [runtime operations](server/NEARBY-OPERATIONS.md).

Verified October 25: public Expo tunnel manifest and iOS bundle both returned HTTP
200; public API tests found north/south/east/west Austin candidates, with cached
repeat, scorer and detail parity. South Austin had a partial provider failure and
retained usable results. These checks do not establish physical-phone GPS, map,
or touch behavior; finish those checks on the presenter phone.

The remaining sections retain historical foundation setup and verification.

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

## Expo Go (SDK 58)

From the repository root:

```sh
npm start -- --clear
```

`npm start` and `npm run dev:mobile` both launch the Expo Router application in
`apps/mobile`. Do not run `npx expo start` at the workspace root: it is not an
Expo app and would otherwise use `expo/AppEntry` and look for a nonexistent
`App`. The root config now explains the correct command before bundling.
To invoke Expo directly, use `cd apps/mobile && npx expo start --go --clear`.
Install Expo/native dependencies from `apps/mobile` with `npx expo install`.

The app uses **Expo SDK 58**, React Native **0.88** and React **19.3**. Use an
SDK-58-compatible Expo Go; press `i` in Metro to open the iOS Simulator, or scan
its QR code on the presenter phone. Phone and laptop must be on a reachable
shared network; allow Metro through the laptop firewall. No prebuild or custom
native project is required for Expo Go. An older SDK-57 Expo Go simulator app
must be updated before opening this bundle.

The SDK 58 migration also updates the Router tab-bar API and React Native ref
types. Runtime startup was checked in Expo Go 58.0.7 on an iPhone 17 Pro
simulator; this is not physical-device or full-flow acceptance. Match the SDK
of the installed Expo Go. See [compatible Go downloads](https://expo.dev/go).

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
