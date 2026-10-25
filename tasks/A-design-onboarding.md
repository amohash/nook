# A design and onboarding assignment

Status: original design integrated. P0 onboarding intent, budget, walking limit and preference restoration implemented on `feat/onboarding-preferences`. Study preferences page (study styles, session starting point, sticky Save, confirmed reset, Redo onboarding, Profile row, `getPreferenceTags`) implemented on `feat/preferences-page`; D review and presenter-phone verification pending. No merge by this thread.

Paste this prompt into your T3 Code thread after opening your assigned branch:

> Read AGENTS.md, docs/PRD.md and docs/CONTRACTS.md. I am person A, the Figma/design owner, on feat/design-onboarding. Verify the working directory and branch. Own mobile theme, reusable visual components, onboarding and preference screens; D owns navigation, Explore and integration. Use the existing Expo Go stack. First list the frame/spec inputs you need and inspect the agreed shared fields. Build the three onboarding screens and reusable Chip, Button, SpotCard, EvidenceLabel, EmptyState and LoadingState components, with a small typed props API. Persist preferences through the shared adapter rather than adding a second store. Support Skip, Back, denied location/manual origin, large text and reset. Do not edit route layout or dependencies without D. Provide exports for D to wire. Verify on a phone, record changed files and actual checks, and prepare a small PR. Do not build optional feed/profile/auth until the team passes the P0 gate.

## First milestones

1. By 6 p.m.: palette, type scale, spacing tokens and Explore/onboarding/detail frames with states.
2. By 7 p.m.: theme/components and onboarding handoff; D can integrate without waiting for all Figma frames.
3. Before 11:15 p.m.: Devpost soft submission material and initial script.
4. By 6 a.m.: final screenshots, honest feature list and backup video with D.

If you are design-only, export specs/assets and test D's implementation; D takes the onboarding code and optional UI is cut. Don't let incomplete Figma screens block D's functional shell.

## Handoff record

- Branch: `feat/design-onboarding`, safely updated to `origin/main` at `04b2b7c`, including D's foreground-origin adapter. Implementation commit: `b01bead`. Pushed to origin; [PR #6](https://github.com/amohash/nook/pull/6) targets main. D is the merger. The existing pending write invitation for this repository was accepted to resolve the initial push 403; no repository or remote was created.
- References: all eight PNGs in `C:\Users\zgaud\Downloads\Nook — Design Foundations(2)` were inspected: component sheet, three onboarding frames, Explore default/loading/empty and detail. Frames use 390 × 844 logical pixels. System sans-serif and Georgia/system serif approximate the reference fonts; no font dependency was added.
- Existing work preserved: the local root `package.json` `allowScripts` edit remains uncommitted and excluded from this PR. D's routes, Explore/filter/detail/data files, manifests, lockfile and shared contracts were not edited by A.
- D confirmed the existing app runs in Expo Go. The new A screens still require D's route/storage/GPS wiring and a separate presenter-phone check; source/bundle/browser checks do not establish that device pass.

### Implemented

- `src/theme/theme.ts`: cream/sage/brown palette, spacing, radii, borders, typography and touch-target tokens. Colors were sampled from the supplied Study style PNG.
- `src/components`: `Button` with primary/outline/busy/disabled states; `Chip` with independent checkbox or grouped radio behavior; ref-forwarding `SpotCard` accepting the actual recommendation result; `EvidenceLabel`, `DatasetLabel`, `LoadingState`, `EmptyState` and `ErrorState`.
- `src/features/onboarding`: `WelcomeScreen`, `StudyStyleScreen`, `LocationScreen`, shared progress/header pieces, choice IDs and tests. These screens contain callbacks and draft state, with no Router, storage or location-service calls.
- `src/features/preferences`: controlled `PreferencesScreen`, `PreferenceValues`, contract tag choices and tested three-vibe selection. Edit intent, price, walk limit and Wi-Fi/outlet strictness without touching unrelated Query fields.
- `assets/nook-wordmark.png`: cropped from the supplied Welcome export; `assets/images.d.ts` types the PNG import.
- `assets/design-review`: browser captures of Welcome, Study style, Location, denied-location fallback, preferences top/bottom, large-text footer and loading/error/empty states. These review PNGs are not imported by the app.

The supplied references include claims about live busyness, likely seats, friend activity and Muse reviews. The implementation preserves their visual treatment while replacing unsupported copy with evidence/unknown wording. It does not fabricate busyness bars, claim seat availability, add social tabs, invent photos/review counts or label handwritten synthetic summaries as Muse output. SpotCard is taller than the illustrative Figma card because it retains returned reasons, warnings and source timestamps. EmptyState accepts truthful caller copy rather than asserting that all places are closed/busy. Preferences uses the same tokens; the supplied export set has no separate preferences frame.

### Public APIs and imports

Paths below are relative to `apps/mobile`:

```tsx
import { theme } from '../src/theme';
import {
  Button, Chip, SpotCard, EvidenceLabel, DatasetLabel,
  LoadingState, EmptyState, ErrorState,
} from '../src/components';
import {
  WelcomeScreen, StudyStyleScreen, LocationScreen,
  type StudyStyleId, type ManualOriginOption, type LocationStatus,
} from '../src/features/onboarding';
import { PreferencesScreen, type PreferenceValues } from '../src/features/preferences';
```

| Export | Required props / integration |
| --- | --- |
| WelcomeScreen | `onGetStarted`, `onSkip`. Get started advances to step 2; Skip uses visible guest defaults. No account is required. |
| StudyStyleScreen | `onBack`, `onContinue(selected: StudyStyleId[])`, `onSkip`; optional `initialSelected`, `saving`, `error`. All ten choices can coexist, and `[]` is valid. Continue has no selection-count gate. |
| LocationScreen | `options: readonly ManualOriginOption[]`, `selectedId`, `onSelect(id)`, `onUseLocation`, `onBack`, `onContinue`; optional `status`, `deviceOriginLabel`, `error`. |
| PreferencesScreen | Controlled `value: PreferenceValues`, `onChange(value)`, `onSave`, `onCancel`, `onReset`; optional `loading`, `saving`, `error`, `onRetryLoad`, `availableIntents`. |
| Button | `label`, `onPress`; optional `variant: 'primary' \| 'outline'`, `busy`, `disabled`, accessibility label/hint and testID. Busy prevents duplicate presses. |
| Chip | `label`, `selected`, `onPress`; optional `selectionRole: 'checkbox' \| 'radio'`, `disabled`, accessibility hint and testID. Caller supplies radiogroup semantics. |
| SpotCard | `result: Recommendation['results'][number]`, optional `rank`, forwarded Pressable handlers/ref and `accessibilityRole`. No fetch, sorting or scoring. |
| EvidenceLabel | `evidence: Evidence<unknown>`, optional `label`; preserves observed/fetched timestamps and unknowns. |
| DatasetLabel | `mode`, optional `description`, `fetchedAt`; a live request is explicitly distinct from live observations. |
| LoadingState | Optional `message`; static skeletons and indeterminate busy semantics, no fake completion percentage. |
| EmptyState / ErrorState | `title`, `message`, optional `action: {label, onPress}`; error heading is announced as an alert. |

### Exact integration steps for D

1. Fetch this PR branch into D's own checkout/worktree and review the A-only diff. Do not overwrite D's in-flight routes. Merge only through D's normal review/check/device gate.
2. Provide one SafeAreaProvider above the real screens, hide the default Router header for onboarding, use a dark status bar and `theme.colors.background` for the screen content. A does not import Expo Router or modify `app/`.
3. In D's shell, mount Welcome → Study style → Location. Route/state changes happen only inside the supplied callbacks. The Welcome reference has no intent control; retain the visible Study default and expose intent through the existing Explore presets or the separate Preferences screen rather than adding an unrequested fourth onboarding step.
4. Add the one shared local preference/saves adapter in D-owned `src/data/`. The user confirmed it has not been implemented. AsyncStorage is not installed in current main; D owns installation/lockfile changes using `npx expo install @react-native-async-storage/async-storage` from `apps/mobile` (`npx.cmd` on Windows). No backend/account is required for local P0 settings.
5. Hydrate before mounting StudyStyleScreen, then pass saved IDs via `initialSelected`. That prop initializes the draft once; remount with a new React `key` for reset/profile/mode changes. Save in `onContinue(selected)` through the shared adapter, advance only on success, and feed `saving`/`error` back to the screen. On Skip, discard the draft and leave stored choices unchanged. Back/Skip/reset must invalidate pending save transitions so stale work cannot advance the flow.
6. Reuse D's now-merged `src/features/explore/useOrigin.ts` and `origin.ts`: `useOrigin(onSelect)` returns `busy`, `error`, `accuracyMeters`, `useDevice`, `useManual`, `cancel`; `CAMPUS_ORIGIN` is the supported manual campus origin. Do not add another location hook or dependency. Supply verified `ManualOriginOption` records: `{ id, label, origin: {lat, lng, source:'manual'} }`; for campus use `{ ...CAMPUS_ORIGIN, source:'manual' }`. A has not invented West Campus/Downtown coordinates merely because those names appear in Figma. Wire `onUseLocation` to `useDevice`, derive `status='requesting'` from `busy`, pass `error` verbatim, and use `useManual` when campus is tapped. On a device origin, clear `selectedId`, set `status='ready'` and supply an area label. On manual selection, D's existing hook cancels stale GPS work. A's richer status enum also supports denied/unavailable/out-of-coverage if D exposes those categories later; do not infer an error code from text. Validate any additional origin options with the existing contracts.
7. Mount PreferencesScreen in D's local Preferences/Me entry. `PreferenceValues` is a Pick of Query: `intent`, `maxWalkMinutes`, `maxPriceLevel`, `tagWeights`, `amenities`. Keep a D-owned draft; `onChange` does not persist or rerank. `onReset` resets only that draft. On Save, merge with the current Query, validate with QuerySchema, persist through the shared adapter, then apply; preserve origin, time, category and other strict constraints. Cancel discards edits. Do not save fallback defaults merely because hydration is incomplete. Study/Meet friends are exposed by default; Date/Cheap eats can be enabled via `availableIntents` after their preset mappings are verified. A saved selected intent is still displayed.
8. Reuse D's existing preset mapping/C's agreed mapping when converting preferences into Query. Do not implement ranking in these components. A vibe edit is soft; amenities become strict only after an explicit Require selection. Keep all existing strict fields when applying a preset.
9. Replace only visual controls in D's Explore/detail/filter screens, retaining their effects, request IDs, draft/Apply behavior, result selection and navigation:

   ```tsx
   <Link href={{ pathname: '/spot/[id]', params: { id: result.spotId } }} asChild>
     <SpotCard result={result} rank={index + 1} accessibilityRole="link" />
   </Link>
   <Chip label="Quiet" selected={selected} selectionRole="radio" onPress={chooseQuiet} />
   <EvidenceLabel label="Summary evidence" evidence={spot.summary} />
   <ErrorState title="Places unavailable" message={message}
     action={{ label: 'Retry', onPress: retry }} />
   ```

   D supplies Link and all callbacks. Keep screen-reader radio groups and the modal Cancel/Reset/Apply controls. Use ErrorState for failed loads, EmptyState only after a successful empty response, and retain the demo badge/source age. A did not rewrite those D-owned screens.
10. Test the integrated route flow on the presenter phone: first launch, saved hydration/relaunch, zero-choice Continue, Skip after edits, storage failure/Retry, reset to step one, foreground permission denied, manual origin, stale GPS/save results, large text, keyboard/screen reader and Android Back. The user's existing Expo Go pass predates these new screens.

Study style IDs reuse exact contract vocabulary where applicable:

| Label | ID | Meaning |
| --- | --- | --- |
| Silent | `quiet` | Existing allowed tag |
| Some chatter | `some_chatter` | UI-only choice; mapping needs D/C agreement |
| Outlets | `outlets` | Related to `amenities.outlets`; no implicit require |
| Open late | `late_night` | Existing allowed tag; no opening-hours guarantee |
| Solo | `solo` | UI-only choice; Query represents group size numerically |
| Group tables | `group_friendly` | Existing tag; no table availability guarantee |
| Good Wi-Fi | `wifi` | Related to `amenities.wifi`; no implicit require |
| Coffee nearby | `coffee_nearby` | UI-only choice; no invented API field |
| Outdoors | `outdoor` | Existing allowed tag |
| Whiteboards | `whiteboards` | UI-only choice; no invented API field |

Save the full UI selection array through the shared adapter; do not copy it wholesale into tagWeights or add contract keys. D/C must resolve simultaneous Silent/Some chatter and Solo/Group tables choices explicitly.

### Immediate visual preview and Expo Go

D can mount the isolated, development-only preview first:

```tsx
import { DesignPreview } from '../src/features/onboarding/DesignPreview';
// In D's chosen preview/shell entry, with its Router header hidden:
return <DesignPreview screen="welcome" />;
// Also accepts 'study-style', 'location' and 'preferences'.
```

DesignPreview includes SafeAreaProvider and a dark status bar. It uses the existing demo campus origin, callback alerts and in-memory drafts only. It explicitly does not save or request GPS. Production screens use D's real callbacks instead. Until D mounts a screen, the existing app still opens Explore.

From the repository root in PowerShell, after D mounts the screen:

```powershell
npm.cmd run dev:mobile -- --clear
```

Keep Metro running, connect laptop/phone to a reachable shared network, and scan its QR in an Expo Go build compatible with SDK 57 (iOS Camera or Android Expo Go scanner). Fixture mode needs no backend/secrets. Allow Node through Windows Firewall if prompted. If LAN fails, stop Metro and try `npm.cmd run dev:mobile -- --tunnel`; tunnel mode has not been verified. No native projects or additional A dependencies were generated.

### Actual verification

- Windows Node 24.22.1 / npm 12.2.1; `npm.cmd ci`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build:server`, and `git diff --check` passed on combined main `04b2b7c`. npm ci installed D's already-locked location dependency; it reported the existing eight upstream audit advisories. No dependency/lockfile edits were introduced by A.
- `npm.cmd test`: 129 tests passed across 12 files after syncing D's location work (110 across 11 before that sync). New A tests cover selection toggling, full contract tag vocabulary, three-vibe cap, strict-field preservation, free/zero versus unknown, evidence times and truthful live/demo labels.
- Metro started with `npm.cmd run dev:mobile -- --port 8083 --offline --max-workers 2`. Direct iOS and Android bundle requests for an ignored entry importing all new screens returned HTTP 200. This checks new code that D has not routed yet; it is not an Expo Go runtime pass.
- Actual React Native Web UI checks: empty/all-ten/deselected/saved style choices and Continue payloads; Back/Skip isolation and no storage writes; denied-location manual selection and GPS only after a tap; preference three-tag limit and explicit strict controls without save-on-edit; busy press prevention; Retry/empty actions; demo/unknown/source-time labels.
- Chrome captures at 390 × 844 were inspected. At 320 × 568 with doubled text, content scrolls and both actions remain reachable. System text scaling/safe areas/GPS/navigation/storage still need the integrated physical phone pass.
- T3 snapshots initially timed out, then recovered. Resize continued returning a 1280 × 800 viewport for phone-size requests, so standalone local headless Chrome captured exact dimensions. QA harnesses/temporary Metro entry live only under ignored `.expo` directories and are excluded from the PR.
- The preferences export folder did not include a dedicated Preferences frame; that screen uses the approved theme and the PRD's existing contract fields. Additional manual origin options and actual permissions/persistence are supplied by D.

### Review screenshots

All captures below are browser previews with simulated 44pt top/16pt bottom safe insets, not device screenshots:

- [Welcome](../apps/mobile/assets/design-review/welcome.png)
- [Study style, three selected choices](../apps/mobile/assets/design-review/study-style.png)
- [Location, supported campus origin](../apps/mobile/assets/design-review/location.png)
- [Location denied, manual fallback](../apps/mobile/assets/design-review/location-denied.png)
- [Preferences top](../apps/mobile/assets/design-review/preferences.png) / [footer](../apps/mobile/assets/design-review/preferences-bottom.png)
- [320px doubled-text actions](../apps/mobile/assets/design-review/study-style-large-bottom.png)
- [Loading / empty / error](../apps/mobile/assets/design-review/states.png)

No merge is authorized for A. D integrates and records the new screens' presenter-phone results before release completion.


## P0 onboarding choices — October 25, 2026

- Isolated worktree: `/private/tmp/space-onboarding-preferences`, branch `feat/onboarding-preferences`, starting at integrated tabs commit `d8b0610`. Original checkout/worktrees preserved. Read AGENTS, PRD, CONTRACTS and both A/D assignments. Coordinated with the Offline Recovery and Demo Switching thread before shared edits: this branch owns onboarding completion/settings and preference saving; recovery owns bootstrap/provider revisions and generation guards.
- Changed: `src/features/session/OnboardingFlow.tsx`, onboarding `StudyStyleScreen`, `WelcomeScreen`, `LocationScreen`, `src/data/SessionProvider.tsx`, `settings.ts`, `settings.test.ts` (all under `apps/mobile`), plus this task record. Explore, filters, provider adapters, manifests, contracts and ranking implementation unchanged.
- Implemented: existing three-screen design now exposes Study/Meet Friends, supported style preferences, all existing budget levels/no cap, and 5–60 minute estimated walking limits in step two. Uses existing theme, wrapping chips, scroll view and accessible radio groups. Manual campus remains default; foreground GPS remains opt-in with existing denied/manual recovery. Defaults and strict unknown-price exclusions are explicit. Coffee nearby/Whiteboards are individually marked saved-only and explicitly excluded from ranking.
- Back retains drafts across steps. Step-two Skip discards that step's edits; Welcome Skip saves visible defaults and selects manual campus. Incomplete onboarding intentionally restarts at Welcome after relaunch; no partial completion or GPS is stored. Final save failures retain Retry/Back, and completion navigation happens only after successful storage. Reset clears completion/preferences/saves through the existing adapter and returns to Welcome.
- Persistence: existing city/mode/version namespace and serialized store reused. Intent presets apply before styles. A backward-compatible optional `rankingPreferences` pick from Query stores only group size/noise/crowd targets so Solo/Balanced and subsequent Preferences intent edits restore coherently. Saved tags/amenities/budget/walk remain authoritative; origin coordinates and departure time are excluded. Existing records without the new field still load. Onboarding uses queued update to preserve concurrent saved IDs.
- Actual checks on the implementation: 200 tests across 23 files, typecheck, lint, server build, diff whitespace check and production iOS/Android/web export passed. Added regressions cover Friends/Solo/Balanced restoration, strict-field preservation, later preference-edit precedence, reset and memory-only GPS restoration; existing corruption/write-queue tests remain passing.
- Actual collaborative-browser checks in fixture mode on port 8097: changed intent/budget/walk/styles → Continue → Back retains choices; step-two Skip discards edits; manual completion persists to Map; full reload restores Friends/free/10-min preferences; full reset returns Welcome/defaults; injected denied browser GPS keeps manual selection and allows completion; injected storage failure shows Retry/Back and Retry succeeds after storage recovery. Incomplete restart returns Welcome. At 320×568 with 1.5× text/line-height, no horizontal overflow or overflowing chips; Continue and Skip scroll into view (Continue bottom 457px). Browser simulation does not establish native acceptance.
- After syncing `origin/main` (cached-photo PR #15), the combined suite passes 211 tests across 24 files; typecheck, lint, server build and diff check pass. The mobile export above passed before the server/data-only sync.
- Presenter phone still required: Expo Go SDK compatibility, native foreground permission allow/deny and Settings recovery, GPS cancellation/manual/restart, AsyncStorage after force-close, system large text/VoiceOver/touch scrolling/safe areas, Android Back, both Skip paths, Reset and Retry. Record phone model/OS/Expo Go version and tested commit before calling P0 verified. Unfinished draft restart is intentional; precise GPS always resets to manual campus after relaunch.
- Next smallest step: review this PR alongside the recovery SessionProvider generation-guard integration, then perform the presenter-phone checklist. No merge authorized or performed.

## Filters sheet visual handoff — 2026-10-25

Implemented on `feat/design-filters` from latest fetched `origin/main` at `7e67622`.
SheetContainer, Chip and NowLaterControl were already on main; no A-branch stacking was needed.

- Added `src/components/FilterSection.tsx`, `SegmentedControl.tsx`, `ChipGroup.tsx`, `LevelPicker.tsx`, `OriginCard.tsx` and `FiltersDesignPreview.tsx` (paths relative to `apps/mobile`). Visual styles use existing theme tokens; radio/checkbox pills reuse Chip's 44pt targets and text wrapping. No theme changes were needed.
- All five components are controlled. SegmentedControl options and ChipGroup options are `{ value, label }`; callbacks return the exact option value. Null and zero remain distinct. LevelPicker accepts three to five numeric labeled steps without interpolation, normalization or rounding. D supplies the actual targetNoise/targetCrowd values; no crowd scale has been invented. Existing noise choices remain Quiet 0.15, Balanced 0.4, Lively 0.65, rather than relabeling Quiet as Silent.
- OriginCard props are type-linked to OriginControls: `origin`, `busy`, `error`, `accuracyMeters`, `onDevice`, `onManual`. Denial uses D's error verbatim; no error-text parsing or new status enum. While locating, only device lookup is disabled; manual stays available. Manual/device/unknown accuracy wording is retained. It never requests GPS or changes origin itself.
- FiltersDesignPreview assembles the entire current filter set inside SheetContainer, initially showing Filters (3). It reuses D's existing preset/reset/count helpers; in-memory preview handlers never save, request GPS or change results. All group sizes, durations, amenity choices, access, free/0..4/null prices, seven walk caps and vibe values remain available. Departure time is outside D's current FiltersSheet and was not added. Caller provides SafeAreaProvider and bounded height. `originState` accepts manual, denied, locating or device; these are explicitly illustrative states.
- No D files, components/index.ts, route, Modal, dependencies, lockfile or package manifest were edited. The user's root package.json allowScripts change remains uncommitted.

### Drop-in usage for D

Keep the existing Modal, overlay, accessibility/dismissal handlers, query/onChange/onApply/onClose props and SheetContainer. Import components directly until D adds the exports below. Replace only section markup and Choice presentation. The following goes inside the existing SheetContainer; callbacks are the current sheet callbacks:

```tsx
import { FilterSection } from '../../components/FilterSection';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ChipGroup } from '../../components/ChipGroup';
import { LevelPicker } from '../../components/LevelPicker';

// Existing wrapper stays:
<SheetContainer title="Filters" onCancel={onClose}
  onReset={() => onChange(resetExploreFilters(query))} onApply={onApply}>
  <Text style={s.body}>{activeFilterCount(query)} active filters · changed groups from Study defaults. Changes take effect on Apply.</Text>
  {/* Keep current intent, group, duration, amenities and access callbacks.
      For each existing single-choice map use SegmentedControl as below. */}
  <FilterSection title="Place category" helper="Select any combination. No selection means any category.">
    <ChipGroup options={CATEGORY_OPTIONS} selected={query.categories}
      onToggle={(value) => onChange({ ...query, categories: query.categories.includes(value)
        ? query.categories.filter((category) => category !== value) : [...query.categories, value] })} />
  </FilterSection>
  <FilterSection title="Maximum price" helper="A strict cap excludes unknown prices. Dollar signs are price levels, not exact amounts.">
    <SegmentedControl accessibilityLabel="Maximum price"
      options={([null, 0, 1, 2, 3, 4] as const).map((value) => ({ value, label: priceLabel(value) }))}
      value={query.maxPriceLevel} onChange={(maxPriceLevel) => onChange({ ...query, maxPriceLevel })} />
  </FilterSection>
  <FilterSection title="Maximum estimated walk">
    <SegmentedControl accessibilityLabel="Maximum estimated walk"
      options={[5, 10, 15, 20, 30, 45, 60].map((value) => ({ value, label: `${value} min` }))}
      value={query.maxWalkMinutes} onChange={(maxWalkMinutes) => onChange({ ...query, maxWalkMinutes })} />
  </FilterSection>
  <FilterSection title="Atmosphere preference" helper="Atmosphere and vibe influence ranking; they do not exclude places or promise available seats.">
    <LevelPicker accessibilityLabel="Target noise" steps={ATMOSPHERE_OPTIONS}
      value={query.targetNoise} onChange={(targetNoise) => onChange({ ...query, targetNoise })} />
  </FilterSection>
  <FilterSection title="Vibe preferences">
    <ChipGroup options={VIBE_OPTIONS.map((value) => ({ value, label: value.replaceAll('_', ' ') }))}
      selected={VIBE_OPTIONS.filter((tag) => (query.tagWeights[tag] ?? 0) > 0)}
      onToggle={(tag) => {
        const tagWeights = { ...query.tagWeights };
        if ((tagWeights[tag] ?? 0) > 0) delete tagWeights[tag]; else tagWeights[tag] = 1;
        onChange({ ...query, tagWeights });
      }} />
  </FilterSection>
</SheetContainer>
```

This excerpt illustrates visual substitutions, not a replacement that removes the other sections. `FiltersDesignPreview.tsx` contains the full assembly, including the existing intent/group/session/open/amenity/access handlers. Transfer those sections too and retain every existing helper/explanation. Do not mount the preview as production UI: its handlers are intentionally local. OriginCard replaces OriginControls wherever D already supplies those props; it does not acquire draft origin or change filter Apply semantics:

```tsx
import { OriginCard } from '../../components/OriginCard';
<OriginCard origin={origin} busy={busy} error={error} accuracyMeters={accuracyMeters}
  onDevice={onDevice} onManual={onManual} />
// With useOrigin: onDevice={originController.useDevice}, onManual={originController.useManual}.
// Keep the existing onSelect ownership/cancellation logic.
```

For targetCrowd D may pass its approved 3–5 numeric steps to LevelPicker with `value={query.targetCrowd}` and `onChange={(targetCrowd) => onChange({ ...query, targetCrowd })}`. Current FiltersSheet defines no standalone crowd steps; this PR supplies no new scale or mapping. NowLaterControl stays at its existing call site, with D's timestamps and presets.

Preview import (inside D's development-only host, under SafeAreaProvider, in a flex:1/bounded container):

```tsx
import { FiltersDesignPreview } from '../src/components/FiltersDesignPreview';
return <FiltersDesignPreview originState="denied" />;
```

### Verification and release status

- `npm.cmd run typecheck`: passed after correcting the preview intent callback type.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: 333 tests passed in 29 files; no new logic tests added for controlled visual wrappers.
- `git diff --check`: passed.
- Isolated React Native Web/esbuild harness rendered the actual components. Headless Chrome interaction assertions passed manual/denied/locating/doubled-text states: count 3, every selection target >=44px, zero/null prices, 60-minute walk choice, independent category selection, noise step, Reset count 0, preview Apply/Cancel, disabled device lookup/manual fallback, error alert, sticky Apply and no horizontal overflow. Doubled-text check was 320×568; standard screenshots 390×844. This simulates text scaling and does not verify native system font scaling.
- T3 preview snapshots failed twice with `Preview automation snapshot timed out after 15000ms.` Local headless Chrome was the fallback; no dependency was installed. Harness files stay ignored under `.expo/filters-qa`.
- Browser captures in `apps/mobile/assets/design-review/filters`: top, levels, strict, denied, locating, large, large-bottom. These are actual browser renders, not presenter-phone screenshots; safe insets are zero in this harness.
- Not merged or presenter-phone verified. D is the merger and owns integration, native Modal focus/Android Back, real GPS, system text scaling, safe areas and device validation. Next smallest step: D imports the five pieces and mounts the preview before replacing existing visual markup.

Export lines for D (A deliberately did not edit components/index.ts):

```ts
export { FilterSection, type FilterSectionProps } from './FilterSection';
export { SegmentedControl, type SegmentedControlProps, type SelectionOption, type SelectionValue } from './SegmentedControl';
export { ChipGroup, type ChipGroupProps } from './ChipGroup';
export { LevelPicker, type LevelPickerProps, type LevelSteps } from './LevelPicker';
export { OriginCard, type OriginCardProps } from './OriginCard';
export { FiltersDesignPreview } from './FiltersDesignPreview';
```

- Final isolation: another thread switched root to `feat/design-detail` during verification. Filters were moved into `C:/Users/zgaud/Documents/Nook/nook-design-filters` on the requested branch; original edits and package.json remain in root. A temporary shared node_modules junction misresolved Zod; removed it and ran `npm.cmd ci --ignore-scripts` from the existing lockfile (no manifest/lock changes). Then typecheck, lint and all 333 tests passed in the isolated worktree. Browser harness was rebuilt against these isolated files with one React instance; all four interaction scenarios passed again and captures were refreshed.
## Demo pack — October 25, 2026

- Implemented documentation on `docs/demo-pack`, isolated from the preserved Windows `feat/design-tab-bar` checkout and its uncommitted package.json change; based on freshly fetched `origin/main` 7e67622.
- Replaced `docs/DEMO.md` with code-audited feature/mode/source tables, exact two-minute fictional-scenario taps and spoken lines, optional real cached Muse walkthrough, recovery/SDK-57/Simulator/video plan, Devpost copy, six judge answers and 06:00 capture checklist. No app, config, dependency or shared-decision changes.
- Verified by direct JSON counts: photo artifact has 30 real places, ten summaries, 30 images, zero typical-crowd/known-hours/live-observation records and no known Wi-Fi/outlets. Public health returned cc8f7aa and cached photo version; GitHub open-PR list was empty at audit time. Read-only actual-scorer smoke confirms real default order stays the same while scores change; fictional Study/Friends orders differ. Documentation uses the fictional scenario explicitly, not forced real winners.
- Docs scope/whitespace checked for handoff; no new app test/build or device pass claimed. Native presenter-phone acceptance, timed rehearsal, final screenshots and backup video capture remain pending. `docs/demo-assets/nook-demo-final.mp4` is a planned destination, not an existing recording.
- Next smallest step: D reviews/merges the docs PR and performs the phone rehearsal with A; A captures the labeled final screenshots/video by 06:00. No merge/deploy by this task.

## Focused Muse assistant presentation — October 25, 2026

Status: implemented on `feat/muse-assistant-ui` in `/private/tmp/nook-a-muse-ui`, based on main `b9cbc11`; automatically/browser verified, not merged or phone verified. User explicitly expanded the original no-chat scope. D confirmed the controlled props API; B/C published authoritative transport contracts on `feat/runtime-nearby-api` (f075304/01d9011). These components define presentation models only, not competing transport contracts.

Changed files:
- `apps/mobile/src/components/MuseAssistantEntry.tsx`: accessible Explore/detail entry; controlled disabled/busy/reason props.
- `apps/mobile/src/components/MuseAssistantPanel.tsx`: controlled input, six statuses, starters, up to 12 displayed messages, three referenced places per message, fact/interpretation/unknown/source labels and explicit proposal before/after Apply/Cancel. No networking, storage, location, scorer or session state. Source IDs and place IDs go back to D; URLs are not opened directly from model text. Default input cap 1000; D passes the shared request maximum.
- `apps/mobile/src/components/MuseAssistantDesignPreview.tsx`: clearly labeled sample-only specimen; no requests or simulated generation. All controls only report callbacks. Never mount this as production assistant.
- `apps/mobile/src/components/OriginCard.tsx`: device accuracy >=100m says “Approximate location”; errors offer “Retry my location” and manual fallback.
- This task status only. No barrel, routes, dependency/lock, contracts, migrations or shared decisions edits.

D integration (direct imports, no barrel change):
```tsx
import { MuseAssistantEntry } from '../src/components/MuseAssistantEntry';
import { MuseAssistantPanel, type MuseAssistantPanelProps } from '../src/components/MuseAssistantPanel';
// Entry: onPress, disabled?, busy?, unavailableReason?.
// Panel: input/onInputChange/onSubmit/onRetry/onClose, status, messages, canSubmit,
// onPlacePress(placeId), onSourcePress(sourceId), onApply(proposalId), onCancel(proposalId).
// Optional disabledReason/statusMessage/retryable/inputMaxLength/proposal/keyboardVerticalOffset.
```
D maps validated shared schemas to the exported presentation types, resolves references against the same snapshot and maps source IDs to validated evidence URLs. Status out_of_scope maps to an answer/empty explanation; timeout maps to error + statusMessage + retryable. Set canSubmit=false with a reason for absent snapshot/unsupported area. Quota/unavailable/waiting disable submission. A proposal contains id/explanation and rows `{label,before,after}`; applying/canceling invokes only the callback. D owns stale proposal validation against the current query and removes applied/canceled proposals. No automatic filter changes.

Exact visual reproduction:
1. In D's development-only host under `SafeAreaProvider`, mount `MuseAssistantDesignPreview` from its direct file in a bounded `flex:1` container. Use `npm run dev:mobile` and open with the supported Expo Go version.
2. Tap each status: idle, waiting, empty, error, quota, unavailable. Empty/error expose Retry. Waiting disables input/starters/send; absent snapshot disables submission and displays a reason. Empty/whitespace input cannot submit.
3. Tap a starter: it fills input only. Send invokes callback only. Toggle sample answer; scroll through interpretation, sourced facts, unknowns, referenced place/source buttons and before/after proposal. Apply and Cancel each invoke their own callback; neither changes filters in this preview. Close reports its callback.
4. For production, D places Entry on Explore/detail and mounts Panel in the existing modal/sheet; D owns visibility, modal focus/restore, Android Back and session/data handling. Use a bounded container; the panel handles keyboard avoidance, scrollable conversation/composer and safe area edges. No navigation tab is added.
5. Verify OriginCard with device accuracy 99m vs 100m, an error, busy lookup and manual fallback. Presenter-phone/native GPS verification remains D's task.

Actual verification:
- `npm ci --ignore-scripts` from existing lockfile: passed. Initial reused node_modules symlink produced a Zod v3/v4 type mismatch; removed it and used the isolated install. No manifest/lock changes.
- `npm run typecheck`: passed across all workspaces after isolated install and after final code edits.
- `npm run lint`: passed after final code edits.
- `git diff --check`: passed.
- Actual React Native Web components bundled in ignored `.expo/muse-qa` using existing esbuild with web extensions. T3 collaborative browser rendered them. Browser assertions passed starter fill/submit, busy gate, empty/error retry, quota/unavailable copy, missing snapshot gate, place/source/close callbacks, before/after preview and separate Apply/Cancel. Every tested button >=44px. No broad unit suite claimed for this visual change.
- Narrow layout review: 320x568 container with doubled rendered text (browser simulation, not native font scaling), no horizontal overflow, conversation retained 221px scroll height, composer stayed inside panel, all visible buttons >=44px. Review caught/fixed header shrink overlap and an oversized large-text header. Safe insets are zero in this browser harness.
- Visual states reviewed in actual browser: idle, waiting, empty, error, quota, unavailable, missing snapshot, answer/evidence/unknown/reference/source, filter proposal, narrow/doubled-text. The preview labels all sample content; no fixture conversation ships in production components.
- Live-provider verified by this A task: none. Provider attempts/retries: 0/0; no credential access or request budget spent. B/C own live provider work.
- Physical-device verified: none. Native keyboard visibility/avoidance, hardware Back, modal focus/VoiceOver/TalkBack, native text scaling and nonzero safe insets remain pending. No phone acceptance claimed.

Self-evaluation (ECC agent-self-evaluation): accuracy 4 (browser passed; native behavior unverified), completeness 4 (requested presentation states provided; device acceptance pending), clarity 4 (direct typed API; D still maps response facts), actionability 4 (preview/reproduction supplied; D integrates), conciseness 4 (one focused panel; handoff necessarily detailed), overall 4.0/5. Highest-impact next step: D integrate the real response and run the presenter phone checks, then merge the small PR as owner.


## Social PR preparation before route wiring - October 25, 2026 (historical)

Historical status at 1b1fda8, before the user authorized route integration below. The snippet in this historical section is superseded by the committed route files and the latest handoff at the end of this task record. Hosted-project setup verification, D merge and presenter-phone acceptance remain pending.

Profiles, follows and friend search (A)

Adds optional social accounts while preserving the guest onboarding, Explore, detail and local-save journey. Rebased feat/social onto origin/main 21ba7a0; PR #43 is merged and its merge commit a08da34 is an ancestor of main. Only rebase conflict: apps/mobile/.env.example; retained both main's discovery configuration and social configuration.

Included
- Email/password sign-up, sign-in and sign-out behind EXPO_PUBLIC_SOCIAL_ENABLED, with a lazy Supabase client and Continue as guest callback.
- Create/edit profile, fixed unique username, optional avatar/major/phone, preference-derived vibe, own/other profiles, followers/following, follow/unfollow and debounced username/display-name friend search.
- Local-save mirroring after successful local writes; one-time saved-place backfill per account/dataset. Local saves remain authoritative; cloud failures do not block them. No remote-to-local restore or continuous retry queue is promised.
- Separately gated, explicit contacts matching, with loading/empty/error/permission handling. Contacts stay disabled pending phone checks.
- Isolated supabase-social migrations/RLS checks, public env template, design references, social rule tests and a disabled-social regression.
- Changes are in apps/mobile/src/social, the optional StudyPreferencesRow link variant, apps/mobile/.env.example, docs/design, supabase-social and A's task status. No root manifest/lockfile changes; dependencies/config plugins are already in main. D-owned route/data integration is supplied below, not committed in this PR.
- /social-preview and SocialPreview.tsx are absent from the PR tree. The ignored local route was moved outside app/ for QA; no local harness, .env, credentials or preview artifacts are included.

Supabase project setup (manual; not applied by this PR preparation)
1. Use the separate nook-social project, never B's data/API project.
2. Run supabase-social/migrations/001_social.sql, then 002_username_fixed.sql.
3. Run supabase-social/tests/social_rls.sql; require the final "social RLS checks passed" result. It rolls back its throwaway accounts/data. The repository documents prior PGlite checks with Supabase stand-ins; a real hosted-project RLS pass is not established by this handoff.
4. Enable the Email auth provider and turn Confirm email OFF: sign-up expects an immediate session.
5. Copy only the project's public URL and anon/publishable key into apps/mobile/.env as below. Never use a service-role/secret key. Restart Metro after env changes.

Privacy
- Phone numbers are normalized to E.164 and SHA-256 hashed on the device. Only hashes are sent; raw phone numbers and contact names are not uploaded. Contacts matching runs only after an explicit tap/permission, with at most 200 hashes per RPC call.
- Phone discoverability is opt-in, default off, and can be disabled/removed in Edit profile. Base profile phone fields are owner-only; public_profiles excludes phone_hash/discoverability.
- Saved spots are readable by their owner and people who follow that owner; saves are not private from followers. Follows are one-way, visible to signed-in users and require no approval; there is no blocking/private-account mode. Avatars have public URLs.
- Unsalted phone hashes are vulnerable to enumeration because the phone-number space is small. The per-call cap is not a rate limit; the RPC has no rate limiting. Hashing is not anonymity.

Checks actually run
- npm run typecheck: PASS, all workspaces, after removing the ignored local preview route from app/.
- npm run lint: PASS.
- npm test: 506 passed, 1 failed, 1 additional suite failed to load (41 passing / 2 failing files). Both failures reproduced independently against a clean git archive of origin/main 21ba7a0: reconstruct-cached-time.test.ts constructs C:\C:\... on Windows; evaluate-real.test.ts fails the approved fixture SHA-256 assertion (received 93646182..., expected bae26a4d...). Left B/C-owned tests/fixtures unchanged. Full suite is NOT green.
- npm test -- apps/mobile/src/social: PASS, 23 tests / 4 files, including the new regression proving no client creation, fetch or sync-storage access when all social env variables are unset.
- git diff --check: PASS. No tracked preview route/local-only files or D route/data changes in the branch diff.
- Actual Expo web comparison, fixture mode: EXPO_NO_DOTENV=1; EXPO_PUBLIC_SOCIAL_ENABLED, every EXPO_PUBLIC_SUPABASE_* and EXPO_PUBLIC_CONTACTS_MATCHING removed from each Metro process environment. Branch ran with the two local D snippets (AuthProvider and syncSavedSpot) applied. Clean main archive ran separately with the same dependencies and fixture mode. Welcome -> Study/default preferences -> manual UT Austin -> Explore -> Paper Lantern detail -> Save: identical onboarding/location/Explore/detail/saved text, result order/scores and serialized local settings. Save survived reload. Browser network log: zero Supabase requests. The web map reports its existing list fallback; opening the result used its DOM link because the collapsed result sheet was not pointer-accessible to automation. This is browser functional parity, not native touch/map acceptance.

Not verified
- Native device photo picker/upload behavior, contacts permission/matching on a phone, native system large text/accessibility and presenter-phone Expo Go acceptance.
- Real hosted nook-social migrations/RLS result, confirm-email setting and the two-account end-to-end checklist below were not executed in this preparation.
- Social is not merged or release-verified. D owns integration and merge; keep P1 gated until phone acceptance. The server/API/ranking are unchanged.

D integration: one consolidated snippet
Apply the following sections to the named files. Keep the existing SafeAreaProvider, SessionProvider, Shell, tab layout, SessionGate, RecoveryControls and guest placeholder behavior. The tab wrappers deliberately use main's existing placeholders with social off. These are instructions for D, not route files shipped by this PR.

```tsx
// apps/mobile/app/_layout.tsx: add the import, and replace only Layout's return.
import { AuthProvider } from '../src/social';
return <SafeAreaProvider><SessionProvider><AuthProvider><Shell /></AuthProvider></SessionProvider></SafeAreaProvider>;
// Inside Shell's existing Stack, add:
<Stack.Screen name="sign-in" options={{ headerShown: false }} />
<Stack.Screen name="create-profile" options={{ headerShown: false }} />
<Stack.Screen name="edit-profile" options={{ headerShown: false }} />
<Stack.Screen name="follow-list" options={{ headerShown: false }} />
<Stack.Screen name="user/[id]" options={{ headerShown: false }} />

// apps/mobile/app/sign-in.tsx (new)
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorState, LoadingState } from '../src/components';
import { SessionGate } from '../src/features/session/SessionGate';
import { SignInScreen, useAuth } from '../src/social';
function Content() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const auth = useAuth();
  // Observe resolved auth/profile state; onDone can run before profile loading settles.
  useEffect(() => {
    if (auth.status === 'needsProfile') router.replace('/create-profile');
    if (auth.status === 'ready') router.replace('/(tabs)/profile');
  }, [auth.status, router]);
  if (auth.loading) return <LoadingState message="Loading account…" />;
  if (auth.profileError) return <ErrorState title="Profile unavailable" message="Check your connection and retry."
    action={{ label: 'Retry', onPress: () => void auth.refreshProfile() }} />;
  return <SignInScreen initialMode={mode === 'signUp' ? 'signUp' : 'signIn'}
    onContinueAsGuest={() => router.replace('/(tabs)/map')} />;
}
export default function SignInRoute() { return <SessionGate><Content /></SessionGate>; }

// apps/mobile/app/create-profile.tsx (new)
import { Redirect, useRouter } from 'expo-router';
import { ErrorState, LoadingState } from '../src/components';
import { SessionGate } from '../src/features/session/SessionGate';
import { CreateProfileScreen, useAuth } from '../src/social';
function Content() {
  const router = useRouter(); const auth = useAuth();
  if (auth.loading) return <LoadingState message="Loading account…" />;
  if (!auth.enabled || !auth.user) return <Redirect href="/sign-in" />;
  if (auth.profileError) return <ErrorState title="Profile unavailable" message="Check your connection and retry."
    action={{ label: 'Retry', onPress: () => void auth.refreshProfile() }} />;
  if (auth.profile) return <Redirect href="/(tabs)/profile" />;
  return <CreateProfileScreen onDone={() => router.replace('/(tabs)/profile')}
    onBack={() => { void auth.signOut().then(() => router.replace('/sign-in')); }} />;
}
export default function CreateProfileRoute() { return <SessionGate><Content /></SessionGate>; }

// apps/mobile/app/edit-profile.tsx (new)
import { useRouter } from 'expo-router';
import { SessionGate } from '../src/features/session/SessionGate';
import { EditProfileScreen } from '../src/social';
export default function EditProfileRoute() {
  const router = useRouter();
  return <SessionGate><EditProfileScreen onDone={() => router.replace('/(tabs)/profile')}
    onBack={() => router.back()} /></SessionGate>;
}

// apps/mobile/app/follow-list.tsx (new)
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SessionGate } from '../src/features/session/SessionGate';
import { FollowListScreen } from '../src/social';
export default function FollowListRoute() {
  const router = useRouter();
  const { userId, kind } = useLocalSearchParams<{ userId?: string; kind?: string }>();
  if (!userId || (kind !== 'followers' && kind !== 'following')) return <Redirect href="/(tabs)/profile" />;
  return <SessionGate><FollowListScreen userId={userId} kind={kind} onBack={() => router.back()}
    onOpenUser={(id) => router.push({ pathname: '/user/[id]', params: { id } })} /></SessionGate>;
}

// apps/mobile/app/user/[id].tsx (new; import paths have two parent levels)
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SessionGate } from '../../src/features/session/SessionGate';
import { UserProfileScreen } from '../../src/social';
export default function UserRoute() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id?: string }>();
  if (!id) return <Redirect href="/(tabs)/friends" />;
  return <SessionGate><UserProfileScreen userId={id} onBack={() => router.back()}
    onOpenSpot={(spotId) => router.push({ pathname: '/spot/[id]', params: { id: spotId } })}
    onOpenFollowList={(kind, userId) => router.push({ pathname: '/follow-list', params: { kind, userId } })}
    onSignIn={() => router.push('/sign-in')}
    onCreateAccount={() => router.push({ pathname: '/sign-in', params: { mode: 'signUp' } })} /></SessionGate>;
}

// apps/mobile/app/(tabs)/friends.tsx: replace placeholder wrapper.
import { useRouter } from 'expo-router';
import { TabPlaceholder } from '../../src/features/navigation/TabPlaceholder';
import { FriendsScreen, isSocialEnabled } from '../../src/social';
export default function Friends() {
  const router = useRouter();
  if (!isSocialEnabled()) return <TabPlaceholder screen="Friends" />;
  return <FriendsScreen onOpenProfile={(id) => router.push({ pathname: '/user/[id]', params: { id } })}
    onSignIn={() => router.push('/sign-in')}
    onCreateAccount={() => router.push({ pathname: '/sign-in', params: { mode: 'signUp' } })} />;
}

// apps/mobile/app/(tabs)/profile.tsx: replace placeholder wrapper.
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { RecoveryControls } from '../../src/data/RecoveryControls';
import { TabPlaceholder } from '../../src/features/navigation/TabPlaceholder';
import { ProfileScreen, isSocialEnabled } from '../../src/social';
export default function Profile() {
  const router = useRouter();
  if (!isSocialEnabled()) return <TabPlaceholder screen="Profile" />;
  return <><ProfileScreen
    onEditProfile={() => router.push('/edit-profile')}
    onOpenFollowList={(kind, userId) => router.push({ pathname: '/follow-list', params: { kind, userId } })}
    onEditPreferences={() => router.push('/preferences')}
    onOpenSpot={(id) => router.push({ pathname: '/spot/[id]', params: { id } })}
    onSignIn={() => router.push('/sign-in')}
    onCreateAccount={() => router.push({ pathname: '/sign-in', params: { mode: 'signUp' } })}
    onFinishProfile={() => router.push('/create-profile')} />
    {/* Keep demo recovery accessible when social replaces the placeholder. */}
    <ScrollView style={{ maxHeight: 180 }}><RecoveryControls /></ScrollView></>;
}
// Existing (tabs)/_layout.tsx already declares friends and profile; retain it.
// D may hide native tab headers for these two screens to avoid duplicate titles.

// apps/mobile/src/data/SessionProvider.tsx: exactly two added lines.
import { syncSavedSpot } from '../social/savedSync';
// At the end of toggleSaved, AFTER store.update and local setSession succeed:
void syncSavedSpot(id, savingNew, detail?.spot);

// apps/mobile/.env (git-ignored): add the three social variables below.
// EXPO_PUBLIC_SOCIAL_ENABLED=1
// EXPO_PUBLIC_SUPABASE_URL=https://<nook-social-project-ref>.supabase.co
// EXPO_PUBLIC_SUPABASE_ANON_KEY=<public-anon-or-publishable-key>
// Keep the separate contacts flag OFF until phone checks pass:
// EXPO_PUBLIC_CONTACTS_MATCHING=0
// Preserve D's DATA_PROVIDER/API/NEARBY settings. Restart Metro after editing.
// To verify P0 again: EXPO_NO_DOTENV=1 and remove all SOCIAL_ENABLED,
// SUPABASE_* and CONTACTS_MATCHING env variables from the Metro process.
```

Manual two-account checklist (pending; use two real test accounts/devices or isolated sessions)
- [ ] Configure nook-social, migrations 001 + 002, RLS script, Email provider and Confirm email OFF. Restart Metro with social enabled; leave contacts off.
- [ ] Guest: Continue as guest -> onboarding -> Explore -> detail -> save/unsave -> restart; local saves survive and no account is required. With all social variables unset, repeat and confirm zero Supabase traffic.
- [ ] Account A: create account/profile, lowercase unique username, duplicate/invalid username errors, optional fields empty, discoverability initially off. Back from profile creation signs out safely; finish setup after signing back in.
- [ ] Account B: create a distinct profile. A searches B by username and display name; clear search, no results, network error/retry and rapid changed queries leave no stale results. Own account is excluded.
- [ ] A opens B, follows/unfollows via Friends/profile/follow-list; button/count/list state survives navigation and refresh. Duplicate follow creates no duplicate edge; self-follow is unavailable/rejected. Open followers/following and select a person.
- [ ] B saves a real current-dataset place. A cannot read B's saves before following, can read after following, and loses access after unfollowing. Reverse follow direction does not grant access. B cannot write A's profile/follows/saves; verify via the RLS script too.
- [ ] A's existing device saves backfill once at sign-in. New save/unsave mirrors after local success; offline/cloud failure preserves the local result. Open own/other saved spots by stable ID; unavailable/out-of-dataset IDs show existing detail fallback.
- [ ] Edit profile: display name/major/avatar/phone/discoverability; username remains fixed in both UI and DB. Update study preferences and verify vibe refresh. Sign out and restart; guest preferences/saves remain local and no other account's profile is shown.
- [ ] Device photo picker: allow/deny/cancel, valid photo upload, invalid/oversized failure, and public avatar display after relaunch.
- [ ] Only after phone review: enable EXPO_PUBLIC_CONTACTS_MATCHING=1 and restart Metro. Use known real test numbers, explicitly opt B into discovery; A grants/denies contacts permission and tests retry, no contacts/no matches, duplicates, international formatting and >200 contacts batching. Verify payloads contain hashes only; no automatic permission prompt or upload before tapping. Turn B's discovery off/remove number; matching stops. Return flag to 0 until accepted.
- [ ] On presenter phone: supported Expo Go, keyboard/back/safe areas, native map, photo picker, large text, VoiceOver/TalkBack, loading/empty/error/offline recovery, guest Sign in entry points and two-account navigation. Record device/OS/Expo Go version and tested SHA before D merges.

## Social route integration - October 25, 2026 (latest handoff)

Implemented on feat/social at the user's explicit request to wire D-owned routes for D's review. This supersedes the uncommitted-route instructions above. D still owns merge and presenter-phone acceptance.

Every route file changed in this integration:
- apps/mobile/app/_layout.tsx: AuthProvider inside SessionProvider and five social Stack declarations.
- apps/mobile/app/(tabs)/_layout.tsx: hide the Friends/Profile native headers because the screens supply titles.
- apps/mobile/app/(tabs)/friends.tsx: FriendsScreen, profile links and sign-in/create-account entry points.
- apps/mobile/app/(tabs)/profile.tsx: ProfileScreen, edit/preferences/saved-spot/follow-list links, finish-profile and auth entry points. Retains RecoveryControls and guest study preferences.
- apps/mobile/app/sign-in.tsx (new): sign-in/sign-up mode, Continue as guest, and navigation after auth/profile resolution; retry on profile-load error.
- apps/mobile/app/create-profile.tsx (new): account/profile loading guards, retry, completion and sign-out on Back.
- apps/mobile/app/edit-profile.tsx (new): mounts form after profile loads; completion and Back.
- apps/mobile/app/user/[id].tsx (new): UserProfileScreen with user, follow-list, spot and auth links.
- apps/mobile/app/follow-list.tsx (new): follower/following parameter validation, signed-out guard, Back and person links.

No Explore, detail, onboarding, ranking, provider, dependency, environment or migration edits in this integration. The pre-existing local SessionProvider save-sync edit was stashed for verification and remains excluded from this route commit; it is preserved locally for D's separate two-line integration. Auth is optional: no global account guard was added. Contacts remain gated. Preview/local harness files remain excluded.

Actual verification:
- npm run typecheck and npm run lint passed; git diff --check passed.
- npm test: 506 passed, 1 failed assertion and one suite failed to load (41 passing / 2 failing files). Same two failures already reproduced on main: Windows C:\C:\... fixture path in reconstruct-cached-time.test.ts, and pinned fixture SHA-256 mismatch in evaluate-real.test.ts. No B/C-owned fixes attempted.
- Actual Expo web fixture journey with all social variables unset: fresh onboarding -> default Study/manual UT Austin -> Explore -> first result detail -> save. Preferences/location/Explore/detail/saved text matched the previously captured main baseline exactly, including result order and scores. Zero Supabase requests.
- Repeated the same fresh journey with social enabled, contacts off and a dummy public configuration pointing to a non-resolving .invalid domain, without an authenticated session. Onboarding/Explore/detail/save matched the social-off journey exactly; zero Supabase requests. No credentials or real accounts were used, and no sign-in request was submitted.
- Social-enabled signed-out Friends/Profile render their actual guest screens. Friends Sign in opens /sign-in; Continue as guest returns to Explore. Profile Create account opens sign-up mode. Guest preferences and recovery remain accessible. /create-profile and /follow-list redirect signed-out users to sign-in; /edit-profile returns to Profile; /user/[id] renders its guest auth entry points. The user screen does not fabricate a profile or request one before sign-in.
- Opening the first recommendation used its DOM link because the existing collapsed web result sheet is not pointer-accessible to automation. The unchanged web map uses its existing list fallback. These checks do not establish native touch/map acceptance.

Not verified: real two-account authentication/profile/follow navigation, hosted Supabase setup/RLS, photo picker, contacts on a phone, native large text/accessibility and presenter-phone acceptance. Next smallest step: D reviews the nine route files and applies the separately preserved saved-sync lines, then runs the real-account and presenter-phone checklist before merge. gh is unavailable; handoff uses the main...feat/social compare URL.

## Morning shared integration - October 25, 2026 (current handoff)

The user designated A as coordinator while D is unreachable. Target is Devpost at 11:30 and judging at 14:00; A decides whether to merge main around 10:30 after the full demo works. Main remains the known-good fallback at 21ba7a0. No main merge, force push, dependency install/change, lockfile regeneration, DB migration or deployment was performed by A.

Inventory and merge decisions:
- GitHub's public API reports zero open PRs; gh is unavailable. Check https://github.com/amohash/nook/pulls and https://github.com/amohash/nook/branches. The complete fetched remote-branch list with last commit date/author is recorded below. No inference about D's unpushed work is possible.
- At initial fetch only origin/fix/explore-study-ux (D, 87ed74e) and origin/feat/social (A, 616464d) were missing from main. PR #43 is merged (a08da34); every other pushed A design/preferences/dependency branch was already an ancestor of main. No redundant merges were made.
- D and social dry merges had no conflicts. GitHub had zero statuses/check runs for both heads; its combined 'pending' state was not a running CI check. D's actual root typecheck/lint passed; its tests failed only on the same two baseline Windows issues. Social's prior checks had the same known failures. These branches were suitable for integration testing; this did not establish phone acceptance.
- Created integration/morning from origin/main and pushed it. Pulled with --rebase before work and before each commit/merge, then pushed each small commit immediately. Merge order: D (269da05), skip already-merged #43/other A work, then social (1c715d0). Applied the exact two-line saved-sync addition after local storage succeeds (c810b0c). AuthProvider and all five stack routes/tab callbacks were already pushed in social, so they were retained without duplication. The historical snippet above is superseded by those route files.
- During this run B pushed fictional-austin-v2 (27e8a93 / f8106b9) and the Windows fixture-path test fix (5b69d30) directly to integration/morning. Pulled and retained both. B's two explicitly fictional venues add real scorer-driven scenario variation; no new real venue facts, reviews or Muse results were fabricated. New dataset namespace intentionally starts fresh onboarding/preferences/saves.
- Actual live testing found stale following counts when returning to retained tabs. Commit 1385d13 refreshes Profile, UserProfile, FollowList, Friends and useFollowState on focus and filters the Following list by current edges. Confirmed tab navigation updates counts and removes unfollowed rows. No state library, dependency or contract change.

D-owned review scope relative to main (review the actual diff, not the old snippet):
- apps/mobile/app/_layout.tsx: AuthProvider and five social Stack declarations.
- apps/mobile/app/(tabs)/_layout.tsx: Friends/Profile header visibility only.
- apps/mobile/app/(tabs)/friends.tsx and profile.tsx: real social screens, navigation callbacks, guest preferences and recovery.
- New apps/mobile/app/sign-in.tsx, create-profile.tsx, edit-profile.tsx, follow-list.tsx and user/[id].tsx.
- apps/mobile/src/data/SessionProvider.tsx: the exact import and void syncSavedSpot(id, savingNew, detail?.spot) call after local success.
- D's own pushed changes also modify app/(tabs)/map.tsx, app/spot/[id].tsx, src/data/providers.ts, features/explore/PlaceAssistant.tsx, PlaceMap.native.tsx and PlaceMap.types.ts. Those are intentional D UX/tunnel changes, not social overrides. Unified D-owned diff was generated at .expo/morning-integration/d-owned.diff (ignored); public full comparison is https://github.com/amohash/nook/compare/main...integration/morning.

Verification results on the combined shared branch:
- PASS: npm run typecheck, npm run lint and git diff --check. No dependency/manifest/lockfile/config-plugin diff against origin/main.
- FAIL, baseline Windows artifact bytes only: npm test reports 528 passed / 1 failed, 43 passing files / 1 failing file. The remaining packages/core/measurements/evaluate-real.test.ts SHA-256 assertion sees CRLF bytes 93646182...; LF normalization and the unchanged origin/main Git blob both hash to the pinned bae26a4d... value. No data corruption or real fixture edit. B fixed the other known C:\C:\... test-path failure; it now passes. A did not change C's test or normalize the checkout.
- PASS, web guest functionality: physically moved apps/mobile/.env aside, left .env.hold untouched, removed SOCIAL_ENABLED, every SUPABASE_* and CONTACTS_MATCHING from the Metro process, set EXPO_NO_DOTENV=1, restarted --clear. Fresh three-step onboarding/manual UT Austin -> Study/Meet Friends -> explicit 10-minute filter -> web list fallback -> detail -> save -> reload worked. Current Study top three: Paper Lantern, Pocket Library, West Stacks; Friends: Gather Yard, Creekside Coffee, Little Bowl. 15 minutes yielded 12 candidates; 10 minutes yielded 10 and excluded both new 13-minute venues. Save survived reload, and browser Resource Timing recorded no Supabase resources. Existing disabled.test also passed.
- Exact visual/dataset identity to origin/main: NOT A PASS CLAIM. D intentionally changed sheet/pins/copy; B intentionally changed the labeled fictional dataset from ten venues/v1 to twelve/v2. Social-off P0 behavior works, original-ten golden ranking remains tested, and constraints/ranker are unchanged. Native map interaction cannot be verified on web; the existing web fallback works. The old separate Map/List toggle described in DEMO.md is stale.
- PASS, real nook-social web: created two clearly labeled QA accounts, created profiles without phone/photo, signed out and signed back in, opened Profile with preference-derived vibe and local saved spots, searched @username in Friends, followed/unfollowed, verified Following and counts, navigated follow lists/person profiles, and signed out to a working guest map. The final app Save generated a real saved_spots POST 201 after local success. Previous immediate full-page QA navigations interrupted an in-flight best-effort sync; reran with page retained until response completed. Local saves were preserved.
- PASS, live saved-spot read boundary: with account A's real authenticated session, B's saved_spots query returned HTTP 200 / zero rows before follow, two rows after follow, zero after unfollow. The UI likewise switched between 'Saved spots are private' and B's two saved places. This verifies this read boundary, not the entire SQL authorization suite. Hosted RLS SQL test/migration execution and cross-user write denial were not rerun by A.
- QA usernames qa_mvnx5wb6_a and qa_mvnx5wb6_b remain clearly labeled in nook-social with synthetic demo place snapshots and no phone/contact data. No fake social activity was presented as real users. The QA session is signed out at handoff. Do not use these QA people or counts as pitch evidence.
- Environment handling: the user approved .env.hold. Printed variable names only; exactly SOCIAL_ENABLED / SUPABASE_URL / SUPABASE_ANON_KEY with public prefixes. Verified flag=1 and expected project URL by equality. JWT role=anon, ref=camhduhuzawmsrimtybw; never printed key/token/password. Copied without deleting .env.hold, ran ON with --clear, moved .env aside for OFF and restarted --clear, restored it, and restarted ON --clear. Final .env and .env.hold are byte-identical, both ignored, untracked and unstaged. Contacts flag is absent, so matching remains off; the QA process also explicitly used CONTACTS_MATCHING=0.
- PENDING / NOT PHONE-VERIFIED: Expo Go compatibility, native maps/tiles/pins/sheet gestures, GPS allow/deny, Share/Maps, avatar photo picker/upload, contacts on a phone, system large text, safe areas, keyboard/Back and accessibility. No native performance, hosted nearby acquisition or Muse call result is claimed.

Known demo documentation/configuration gaps:
- Main and integration already declare Expo SDK 58 / RN 0.88, despite the user's SDK 57 description and old DEMO.md. PR #48 made that migration; A made no dependency changes. This branch requires matching SDK-58-compatible Expo Go. Running it in SDK-57-only Expo Go cannot be promised; do not downgrade during the demo.
- DEMO.md was audited against 7e67622 and incorrectly describes social as absent, the custom navigation as unmounted, only ten demo venues, the older pin legend and the old API timeout/nearby state. Use the current code and fixture-v2 labels. B reports deployed Render cc8f7aa still lacks newer nearby/assistant guest APIs; no deployment was performed here. The verified fixture journey does not need that backend.
- docs/demo-assets/nook-demo-final.mp4 and its screenshot folder do not exist. They are planned locations, not ready backups. Native device rehearsal and a video recording are still required before submission/judging. No evidence can reveal D's unpushed local changes; no additional pushed D branch was missed.

Run from the repository root. A's Windows location is C:\Users\zgaud\Documents\Nook\nook; B should use his own checkout root. Existing uncommitted work must be committed or explicitly stashed by its owner before switching. Git won't transfer A's ignored .env to B; B needs his own ignored nook-social public configuration if testing accounts.

```powershell
Set-Location C:\Users\zgaud\Documents\Nook\nook
git status --short
git fetch --all --prune
git switch integration/morning
git pull --rebase origin integration/morning
# Keep the installed dependencies from the existing lockfile; no upgrade/install command.
Remove-Item Env:EXPO_NO_DOTENV -ErrorAction SilentlyContinue
$env:EXPO_PUBLIC_DATA_PROVIDER = 'fixture'
$env:EXPO_PUBLIC_CONTACTS_MATCHING = '0'
# Web (stop with Ctrl+C before starting a different mode):
npm.cmd run dev:web -- --port 8096 --clear
# Expo Go on the same LAN, using an SDK-58-compatible client:
npm.cmd run dev:mobile -- --clear
# If Wi-Fi blocks Metro, use internet/tunnel instead:
$env:NODE_PATH = (npm.cmd root -g)
npm.cmd run dev:mobile -- --tunnel --clear
```

On B's non-Windows shell use the same Git/root npm scripts with npm instead of npm.cmd and the shell's normal environment syntax. Fixture mode is the verified fallback. A Metro tunnel carries JS, not a laptop-only API; real nearby mode additionally needs B's current reachable HTTPS backend/configuration. No dependency installation is authorized by these commands; if tunnel tooling or the matching Expo Go client is unavailable, that is a prerequisite, not a reason to alter manifests.

Ready-to-paste message for B and C (prepared, not sent):

> We are using integration/morning as the shared demo branch; main stays untouched as the fallback. Pull with git pull --rebase origin integration/morning before starting and again before every commit. Make small commits and push each immediately; never force-push this branch. No dependency/manifest/lockfile changes. Coordinate before overlapping files: A handles mobile/social integration, B backend/data, C ranking/AI. The branch includes D's pushed Explore UX, A social/routes/saved sync and B's labeled fixture-v2 additions/path-test fix. Current Windows checks: typecheck/lint pass; 528 tests pass, one remaining CRLF fixture-hash assertion fails. Web guest/social flows passed, including real followers-only saved reads; phone acceptance is pending. SDK is already 58, not 57. Only A decides a main merge around 10:30 after the complete demo works. Flag blockers immediately and preserve all labels/unknowns; no provider/DB/dependency changes without coordination.

The full remote branch inventory follows; dates are the head commit's author date in its recorded offset, not a promise of last push time.

```text
origin/chore/backend-demo-release | 2026-10-25 02:14:00 -0500 | Andrew Sun | in main
origin/chore/foundation | 2026-10-24 18:18:25 -0500 | amohash | in main
origin/chore/social-deps | 2026-10-25 04:02:57 -0500 | ryhlu | in main
origin/data/demo-locations | 2026-10-25 09:30:03 -0500 | Andrew Sun | not in main
origin/docs/demo-pack | 2026-10-25 02:14:16 -0500 | amohash | in main
origin/feat/austin-data-coverage | 2026-10-25 02:11:40 -0500 | Andrew Sun | in main
origin/feat/cached-time-dataset | 2026-10-25 02:02:45 -0500 | Andrew Sun | in main
origin/feat/complete-filters | 2026-10-25 01:25:42 -0500 | amohash | in main
origin/feat/data-api | 2026-10-25 01:27:32 -0500 | Andrew Sun | in main
origin/feat/demo-visual-integration | 2026-10-25 02:14:43 -0500 | amohash | in main
origin/feat/design-detail | 2026-10-25 01:55:43 -0500 | ryhlu | in main
origin/feat/design-explore | 2026-10-24 23:57:02 -0500 | ryhlu | in main
origin/feat/design-filters | 2026-10-25 01:55:31 -0500 | ryhlu | in main
origin/feat/design-onboarding | 2026-10-24 21:28:54 -0500 | ryhlu | in main
origin/feat/design-tab-bar | 2026-10-25 01:34:33 -0500 | ryhlu | in main
origin/feat/detail-reasons-sharing | 2026-10-25 01:27:24 -0500 | amohash | in main
origin/feat/explore-map-layout | 2026-10-25 02:51:24 -0500 | amohash | in main
origin/feat/group-compromise | 2026-10-25 02:02:48 -0500 | Jeff Jone | in main
origin/feat/live-mobile-integration | 2026-10-25 03:01:37 -0500 | amohash | in main
origin/feat/mobile-design-preview | 2026-10-24 22:05:20 -0500 | amohash | in main
origin/feat/mobile-explore-integration | 2026-10-25 00:23:25 -0500 | amohash | in main
origin/feat/mobile-flow | 2026-10-24 19:50:19 -0500 | amohash | in main
origin/feat/mobile-onboarding-integration | 2026-10-24 22:41:55 -0500 | amohash | in main
origin/feat/mobile-origin | 2026-10-24 20:17:43 -0500 | amohash | in main
origin/feat/mobile-tabs | 2026-10-25 00:36:10 -0500 | amohash | in main
origin/feat/muse-assistant-ui | 2026-10-25 02:35:54 -0500 | amohash | in main
origin/feat/muse-evidence-quality | 2026-10-25 02:54:49 -0500 | amohash | in main
origin/feat/no-match-recovery | 2026-10-25 01:34:32 -0500 | amohash | in main
origin/feat/normalize-time-evidence | 2026-10-25 01:35:10 -0500 | amohash | in main
origin/feat/offline-recovery | 2026-10-25 01:41:09 -0500 | amohash | in main
origin/feat/onboarding-preferences | 2026-10-25 01:27:41 -0500 | amohash | in main
origin/feat/place-assistant-evaluation | 2026-10-25 02:44:37 -0500 | amohash | in main
origin/feat/preferences-page | 2026-10-25 03:23:06 -0500 | ryhlu | in main
origin/feat/ranking-ai | 2026-10-24 20:37:31 -0500 | Jeff Jone | in main
origin/feat/real-data-evaluation | 2026-10-25 02:12:47 -0500 | Jeff Jone | in main
origin/feat/runtime-nearby-api | 2026-10-25 02:32:55 -0500 | amohash | in main
origin/feat/runtime-nearby-server | 2026-10-25 02:51:46 -0500 | amohash | in main
origin/feat/sdk-58 | 2026-10-25 04:33:40 -0500 | amohash | in main
origin/feat/social | 2026-10-25 07:41:44 -0500 | ryhlu | not in main
origin/feat/ui-apple-polish | 2026-10-25 03:50:28 -0500 | amohash | in main
origin/fix/austin-discovery-tunnel | 2026-10-25 05:28:28 -0500 | amohash | in main
origin/fix/cold-start-tolerance | 2026-10-25 04:22:24 -0500 | amohash | in main
origin/fix/explore-study-ux | 2026-10-25 05:51:10 -0500 | amohash | not in main
origin/fix/mobile-api-city | 2026-10-24 22:00:39 -0500 | amohash | in main
origin/fix/muse-assistant-completion-budget | 2026-10-25 03:20:52 -0500 | amohash | in main
origin/integrate/current-pr-batch | 2026-10-25 02:18:26 -0500 | amohash | in main
origin/integration/morning | 2026-10-25 09:33:09 -0500 | ryhlu | not in main
origin/main | 2026-10-25 05:29:01 -0500 | Amogh Astagi | in main
```

## Web Explore missing-data diagnosis - October 25, 2026

- User reported no visible data/map. Checked running processes and Expo manifests: ports 8096 (PID 31812) and 8099 serve C:\Users\zgaud\Documents\Nook\nook\apps\mobile, SDK 58; checkout is integration/morning. At inspection local 96869d6 was one documentation-only B commit behind origin 878cbae; pulled current. Port 8081 is another Expo process but its manifest probe timed out; no user server was stopped.
- Reproduced the actual display bug: twelve fixture cards were loaded, but the initial peek sheet hid its body and put the first card below the visible viewport. Fixed only app/(tabs)/map.tsx to initialize the sheet expanded on web. Native retains peek. Actual pointer click opened detail after this fix. Fresh web fixture preview shows twelve cards and the 'Demo scenario · fictional venues and synthetic facts' label.
- apps/mobile/.env still contains only the three social public variables; it has no data backend configuration. No .env.local/development override exists. This is sufficient for fictional fixtures because data/index.ts defaults to demo unless DATA_PROVIDER=api; a missing backend URL alone does not explain missing fixture cards. Social configuration is independent of spot data; never use nook-social as the place API.
- Every spot-data-related public variable read by the app: EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_DATA_PROVIDER (api or fixture; unset/non-api chooses demo), EXPO_PUBLIC_NEARBY_ENABLED (runtime discovery), EXPO_PUBLIC_ASSISTANT_ENABLED (Muse UI/API). The latter two must be 0 for the old hosted snapshot-only backend. .env.example defaults fixture, localhost:3001, nearby=1 and assistant=0; copying it into API mode without correcting URL/nearby is insufficient.
- Render URL found in docs/DEMO.md and MOBILE-RUNTIME-ACCEPTANCE.md: https://nook-api-demo.onrender.com. Measured GET /health 200 / 470ms, /v1/cities 200 / 78ms, /v1/cities/us-tx-austin/spots 200 / 115ms. Backend is awake, CORS *, deployed cc8f7aa; serves 30 cached places, austin-20261025-muse-photos-v1.
- Important additional backend incompatibility: current mobile recommendations request limit=200, while this older Render deployment returns 400 invalid_query for 200 (77ms) but 200 with 3 results for limit=3 (201ms). Adding API_BASE_URL alone still produces 'Places unavailable'. Did not silently reduce the requested candidate count or change contracts; B must deploy a compatible backend. Current local cached reranking works.
- Fallbacks are explicit, not automatic: no bundled real Austin snapshot is loaded by the mobile fixture provider. Real offline cache requires a previous validated download; fictional demo is bundled and always available. Forced an unreachable API on port 8100: honest error/recovery screen -> Use fictional demo data -> twelve places with Demo scenario label. Downloaded real snapshot on 8101 -> Use cached real dataset -> three eligible cafes with Cached dataset label. Then injected backend failure, selected API to reproduce error, selected cached real again -> same three results, no extra API requests. No silent source mixing or fabricated facts.
- Verified real cached list: Trippy Buck Coffee Truck, St Benedict Coffee Company and Lucky Lab Coffee Co.; first card on-screen at y364..598 in an 800px viewport. Native map is intentionally unsupported on web via PlaceMap.tsx; native implementation is PlaceMap.native.tsx. Web uses the shared ranked list; no map package/dependency upgrade.
- Typecheck/lint passed; 37 focused recovery/provider/sheet tests passed. No broad test repeat for this two-line presentation fix. Preserved social-ON .env and .env.hold, ignored and unstaged; no env/dependency/lockfile change. Diagnosis test servers were separate; returned the preview to the normal fixture server on port 8096.

For reliable bundled data, add these lines to the existing apps/mobile/.env without replacing its social values:
EXPO_PUBLIC_DATA_PROVIDER=fixture
EXPO_PUBLIC_API_BASE_URL=https://nook-api-demo.onrender.com
EXPO_PUBLIC_NEARBY_ENABLED=0
EXPO_PUBLIC_ASSISTANT_ENABLED=0
EXPO_PUBLIC_CONTACTS_MATCHING=0

Stop the chosen old server, run git pull --rebase origin integration/morning, remove stale EXPO_NO_DOTENV/process overrides if present, then npm.cmd run dev:web -- --port 8096 --clear from the root (or npx.cmd expo start --web --port 8096 --clear inside apps/mobile). For real data change DATA_PROVIDER to api with the same URL/flags, then explicitly choose Data & recovery -> Use cached real dataset after the initial snapshot download until B fixes the deployed recommendations contract. Metro process env overrides .env, so clear EXPO_PUBLIC_DATA_PROVIDER and EXPO_PUBLIC_API_BASE_URL overrides before retesting file-based configuration.
