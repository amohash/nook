// The repository root is a workspace, not an Expo app. Without this guard, `npx expo start` or
// `npx expo install` run from here picks the root as the project (no entry file, wrong package.json).
// The real app is apps/mobile; its own app.json is used when Expo runs there.
throw new Error([
  'This is the workspace root, not the Expo app.',
  'Run Expo from apps/mobile:   cd apps/mobile && npx expo start',
  'or from here:                npm run dev:mobile',
  'Install packages with:       cd apps/mobile && npx expo install <package>',
].join('\n'));
