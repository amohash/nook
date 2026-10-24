# Space three minute demonstration and pitch

## The story

One person wants to study. Their friends want somewhere social. Space helps them choose a place for this moment, explains the fit, and lets them share a decision. The live product action is a real change of constraints producing a new ranking. Do not try to tour every screen in three minutes.

Use one speaker and one phone driver. Other teammates cover questions afterwards. A prepares the story; D drives the phone. Keep one simple architecture/scale slide available, but stay on the app for most of the pitch. The draft has about 295 spoken words, leaving time for taps and deliberate pauses; rehearse to the timer rather than forcing every sentence into the slot.

## Run of show and suggested wording

| Time | Screen/action | Spoken draft |
|---|---|---|
| 0:00–0:15 | Austin Explore ready; no setup/login | “You have ninety minutes before your next class. One friend needs quiet, another wants coffee, and nobody wants a twenty-minute argument about where to go. Space helps you choose a place that fits the moment.” |
| 0:15–0:35 | Briefly show completed onboarding choices; select Study | “Start with what you want to do, your budget, and how far you're willing to walk. You can use your location or choose a starting point manually. We'll look for a quiet place near campus.” |
| 0:35–1:15 | Apply budget/walk constraints, top three, open first detail | “Space filters the available places, then ranks the ones that fit. Here's why this one appears: the estimated walk fits our limit, the price fits our budget, and the review evidence suggests the right atmosphere. Muse turns that evidence into a short description and tags. We keep the sources visible, and missing information stays unknown.” |
| 1:15–1:45 | Change to Meet friends; show ranking change; tap Share | “Now our friends are joining. We switch the intent, and group suitability matters more. Watch the recommendations change. We can compare the tradeoffs, choose a place, and share the shortlist. Our aim is to help a group make a decision they can act on together.” |
| 1:45–2:10 | Evidence label and one later-time preset; optional city replaces this segment | “Timing matters too. This chart shows typical activity, not a guarantee of open seats. We distinguish historical patterns, fresh observations, and demo scenarios. The ranking is computed from the current filters; the answers aren't preselected.” |
| 2:10–2:45 | Show concise architecture/scale visual or actual request counter | “SerpApi supplies place data. Muse extracts reusable atmosphere features. After that, the same cached facts can serve many different preferences without another model call for every tap. We limit new-area requests, enrich selected candidates, and refresh data as it ages. Our next step is a campus pilot, then broader coverage and shared group preferences.” |
| 2:45–3:00 | Return to the chosen place and share action | “Space connects the places around you to what you and your friends want to do. Tonight's prototype demonstrates the choice, the explanation, and the action. We want to make deciding where to meet feel easy.” |

This script assumes the stated features are working. Edit claims to the actual build. If Muse is unavailable, say summaries are curated prototype content and do not claim a working Muse integration. If sharing is only a native text sheet, do not imply the recipient can open a deployed collaborative room. If using a fixed demo clock or synthetic data, say so at the first relevant screen and keep its badge visible.

If group compromise works, substitute it for the simple Meet friends segment: show two labeled preference profiles, each person's fit, and the balanced result. If second-city import is proven reliable, replace the 1:45–2:10 segment with a prepared city job and explain whether it is live, cached or a replay. Do not add another segment beyond three minutes or ask for an arbitrary city on stage.

## Prepare three deterministic scenarios

| Scenario | Prepared input | Expected behavior |
|---|---|---|
| Quiet solo study | Manual UT origin; quiet preference; affordable cap; 15-minute estimated walk; 90-minute session | A qualifying quiet venue outranks a closer noisy one; reasons show the tradeoff |
| Meet four friends | Same area; explicit group size and social atmosphere; user-approved filters retained | Group-friendly option rises through actual scoring; unknown seating never becomes a booking guarantee |
| Later or no match | Later dated start, or incompatible strict constraints | Closed venues fail the open-session filter; zero results offers a visible relaxation instead of violating constraints |

For fictional golden fixtures, use unmistakably named venues such as “Demo Grove Cafe,” “Demo Corner Library” and “Demo Social Hall.” Encode known hours, price, noise and group suitability so C can calculate expected ordering. Do not attach synthetic ratings or crowds to a real business without an explicit scenario overlay and label. For a real cached demonstration, B/C verify the scenario on the actual snapshot; do not force the ranking to match this narrative if evidence differs.

Freeze the demo clock to a dated local instant, for example Saturday October 24 at 6 p.m. Central, and display “Demo time.” This prevents an overnight rehearsal from unexpectedly closing all the venues. Live mode uses actual time; reset must restore the selected mode and clock consistently.

## What can be hard coded

Safe: onboarding copy, preference presets, allowed tags, campus origin, verified cached places, cached Muse outputs, local saved IDs, fictional test profiles, known error scenarios, fixed demo clock and a labeled cached-import replay. These are data or scenario inputs.

Keep real: navigation, filters, scoring, explanations derived from fields, save/unsave, share invocation, API integration where claimed, and actual job progress where called live. Do not hard code the winner, claim sample accounts are users, invent Google reviews, or display fake API savings. Use separate badges for dataset mode and crowd evidence.

## Evidence and efficient scaling

The main defensible efficiency claim is architectural: “We extract features once and reuse them when preferences change.” Add measured numbers only after recording them from this build. Track cold/warm elapsed time, candidate count, provider requests, app cache hits, model calls and scoring duration. Count retries. Compare equivalent datasets/workloads if claiming an improvement.

Do not say “the second visitor costs nothing,” “we have every place,” “we guarantee the best three,” or “any city builds in under a minute” without evidence. Better: “Shared caching avoids repeating expensive provider and model work; fresh data still needs refresh.” The original simulator's savings can be described in technical Q&A as synthetic experiments, never as real deployment results.

## Fallback sequence

1. Start from a warm presenter phone with a deployed backend, known snapshot, loaded bundle and charger.
2. If a live response exceeds five seconds, keep the current results, show a cached-data label and continue. Do not narrate repeated retries.
3. If map tiles fail, use the ranked list; the same filter story still works.
4. If the app or mirroring fails, play the locally saved demo video and explain it is a recording of the prototype.
5. Do not depend on login, a new city import, email, an app-store installation or an unknown judge's hometown.

## Rehearsal and submission checklist

- Presenter and driver agree on every tap, reset step and fallback line.
- One device mirrors cleanly with readable text; Do Not Disturb is on; battery/power and hotspot checked.
- Three complete timed rehearsals fit within three minutes; five consecutive app flows pass without crash.
- Backup video and screenshots exist before 6 a.m., play locally, and match the final feature claims.
- Devpost includes the problem, working features, stack, source repo, demo video, limitations, AI use and third-party attribution as required by the actual form.
- Soft submission prepared by Saturday 11:15 p.m.; final materials ready/submitted before the team's Sunday 8 a.m. deadline.
- Track choices fit the actual build. Meta's human-connection story is the shared choice; SerpApi is substantive place discovery. Best Pitch participation/sign-up is checked in event announcements.

## Likely judge questions

**Why not Google Maps?** Space adds explicit personal/group constraints, an explainable short list and atmosphere interpretation. Do not claim existing products have no similar features.

**Is it live?** State exactly which data is fresh, cached, typical or synthetic. Popular times does not mean live available seats.

**How does it scale?** Shared area caches, bounded provider jobs, reusable AI features and cheap local ranking; later spatial indexing and workers. Coverage and freshness cost money.

**Why AI?** It turns varied review text into structured atmosphere evidence and short summaries. Numeric ranking and hard constraints stay inspectable.

**What did you actually build?** Demonstrate the committed prototype and identify precomputed data, manual fallbacks and roadmap features plainly.
