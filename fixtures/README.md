# Fictional starter dataset

`src/index.ts` exports twelve fictional venues in the `demo:` namespace. All facts
are synthetic, coordinates are illustrative, and summaries are hand-written.
There are no real reviews, ratings, Muse output, live crowd readings or seat
availability claims. The fixed scenario clock is October 24, 2026, 6 p.m. Central.
Keep future recorded real provider snapshots separate from this package's demo data.

Morning demo revision `fictional-austin-v2` adds West Stacks (quiet library) and
Creekside Coffee (lively café). Both are **fictional**, with illustrative coordinates
about 13 estimated walking minutes from the manual UT Austin origin. A 15-minute
limit includes them; 10 minutes excludes them. Their sparse synthetic typical-crowd
patterns include an explicit unknown hour. These are not real venues, reviews,
ratings, Muse summaries or occupancy measurements. All synthetic facts remain in
`demo` mode and the app must show “Demo scenario”. Real cached Austin JSON files
are unchanged. Ratings/review counts remain unknown for every demo venue.

Use the bundled fixture provider (`EXPO_PUBLIC_DATA_PROVIDER=fixture`) or choose
Data & recovery → Use fictional demo data. The fixed demo clock and the same shared
ranker make Study/Meet Friends reproducible without provider or model calls. Web
uses list fallback; native map verification requires an Expo Go-compatible phone.
