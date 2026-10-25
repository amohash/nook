// Social (accounts/profiles) is behind EXPO_PUBLIC_SOCIAL_ENABLED; see ./config.ts.
export { socialConfig, isSocialEnabled, type SocialConfig } from './config';
export { getSupabase } from './client';
export { AuthProvider, AuthPreviewProvider, useAuth, type AuthContextValue, type AuthResult, type AuthStatus } from './AuthProvider';
export { SignInScreen, type SignInScreenProps } from './SignInScreen';
export { CreateProfileScreen, type CreateProfileScreenProps } from './CreateProfileScreen';
export { ProfileScreen, ProfileView, GuestProfileCard, type ProfileScreenProps, type ProfileViewProps } from './ProfileScreen';
export { EditProfileScreen, type EditProfileScreenProps } from './EditProfileScreen';
export { UserProfileScreen, UserProfileView, type UserProfileScreenProps } from './UserProfileScreen';
export { FollowListScreen, FollowListView, type FollowListScreenProps } from './FollowListScreen';
export { FriendsScreen, FriendsView, type FriendsScreenProps, type FriendsViewProps } from './FriendsScreen';
export { contactsMatchingEnabled } from './config';
export { syncSavedSpot } from './savedSync';
export type { FollowKind, PublicProfile } from './socialApi';
export type { Profile } from './profileApi';
export { AUTH_ERROR_TEXT, type AuthErrorKind } from './authErrors';
