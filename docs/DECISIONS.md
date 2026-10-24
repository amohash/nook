# Space team decisions

Record actual team choices here. These starting decisions are proposals from the plan; confirm them in the kickoff and update status. Keep secrets in local/host configuration, never this file.

| Decision | Proposed default | Owner | Status |
|---|---|---|---|
| Delivery deadline | Oct 25, 2026, 8 a.m. Central | All | User requirement |
| Feature freeze | 3 a.m. Central | D | Proposed |
| Main merger | D | All | Proposed |
| DB/deployment operator | B | All | Proposed |
| Required journey | Guest onboarding → filters → ranking → detail → share/save | All | Proposed |
| Social auth and new city | Gated P1 after midnight P0 check | All | Proposed |
| Scoring baseline | Scan cached candidates, explicit constraints | C | Proposed |
| Expo SDK and phone versions | Fill after physical device smoke | D | Pending |
| Node/npm versions | Fill after scaffold | D | Pending |
| Shared contract version | 1 | B | Proposed |
| Real dataset capture/version | Fill after provider integration | B | Pending |
| Muse model successfully called | Fill after account smoke | C | Pending |
| Sponsor quota and call budget | Fill after key verification | B | Pending |
| Final repo/deployment/tag | Fill at release | D/B | Pending |

For each changed decision append: time, owner, reason, affected paths, required caller changes and rollback. Avoid editing the same status row from multiple branches.
