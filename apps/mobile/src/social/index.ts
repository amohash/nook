// Social (accounts/profiles) is behind EXPO_PUBLIC_SOCIAL_ENABLED; see ./config.ts.
export { socialConfig, isSocialEnabled, type SocialConfig } from './config';
export { getSupabase } from './client';
export { AuthProvider, AuthPreviewProvider, useAuth, type AuthContextValue, type AuthResult, type AuthStatus } from './AuthProvider';
export { SignInScreen, type SignInScreenProps } from './SignInScreen';
export { CreateProfileScreen, type CreateProfileScreenProps } from './CreateProfileScreen';
export { SocialPreview } from './SocialPreview';
export type { Profile } from './profileApi';
export { AUTH_ERROR_TEXT, type AuthErrorKind } from './authErrors';
