# A design and onboarding assignment

Status: original design integrated. P0 onboarding intent, budget, walking limit and preference restoration implemented on `feat/onboarding-preferences`; review and presenter-phone verification pending. No merge by this thread.

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
