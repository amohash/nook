# Social screen designs (A)

Reference designs for the nook-social screens. Text in `[brackets]` is placeholder content, not copy to ship. Fonts in the mocks are illustrative; the app uses `src/theme` typography.

| File | Screen | Code | Status |
|---|---|---|---|
| `social-sign-in.png` | Sign in / create account | `apps/mobile/src/social/SignInScreen.tsx` | Implemented |
| `social-create-profile.png` | Create profile | `apps/mobile/src/social/CreateProfileScreen.tsx` | Implemented |
| `social-profile-own.png` | Your profile | `apps/mobile/src/social/ProfileScreen.tsx` (+ `EditProfileScreen.tsx`) | Implemented (Step 4) |
| `social-friends.png` | Friends (search, contacts, following) | `apps/mobile/src/social/FriendsScreen.tsx` | Implemented (Step 5); contacts card behind `EXPO_PUBLIC_CONTACTS_MATCHING=1` |
| `social-profile-other.png` | Someone else's profile | `apps/mobile/src/social/UserProfileScreen.tsx` | Implemented (Step 4) |

## Privacy wording (use exactly)

| Screen | Text |
|---|---|
| Sign in | An account is optional. Explore and saved spots keep working without one. |
| Create profile, phone toggle | **Let people who have my number find me** · People who have your number can find you. Only a hashed version is stored. You can turn this off anytime. |
| Your profile, saved spots | Visible to your followers |
| Friends, contacts card | We check which contacts use Nook. Numbers are hashed on your phone; only the hashes are sent. Only people who turned on “find me by number” can be found. |
| Someone else's profile | **Saved spots are private** · Follow @{username} to see the places they save. |

The mock for someone else's profile says "the places she saves". Nook stores no pronouns, so the app uses "they".

Unsalted phone hashes can be guessed back from the small phone-number space (see `supabase-social/README.md`). The wording above says what is stored and sent; don't strengthen it to "anonymous" or "can't be traced".
