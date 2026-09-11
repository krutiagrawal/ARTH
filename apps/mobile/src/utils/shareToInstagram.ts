// `react-native-share` isn't one of Expo Go's precompiled native modules (it's a third-party
// library needing a real native build) — its own package resolves its native binding eagerly at
// import time, so a top-level `import` here would crash the WHOLE app the instant this module is
// first required (which happens at startup, since this is reachable from AchievementGrid, used
// on nearly every screen). Deferred to a lazy require() inside each function instead, so it only
// throws (caught below, degrading to a no-op) when a share button is actually pressed under Expo
// Go — the rest of the app keeps working. Under a real dev-client/production build this resolves
// and behaves identically to a normal top-level import.
function loadShareModule(): typeof import('react-native-share') | null {
  try {
    return require('react-native-share');
  } catch {
    return null;
  }
}

/**
 * Shares an image straight into the Instagram Stories composer (background pre-loaded, like
 * Strava's "share to Instagram"). Falls back to the generic OS share sheet when Instagram isn't
 * installed or the direct call fails/is cancelled, so the action always does something useful.
 */
export async function shareImageToInstagramStory(imageUri: string, caption?: string) {
  const mod = loadShareModule();
  if (!mod) return; // Sharing isn't available in this runtime (e.g. Expo Go) — silently no-op.
  const { default: Share, Social } = mod as any;

  try {
    const result = await Share.shareSingle({
      social: Social.InstagramStories,
      backgroundImage: imageUri,
      // Optional — only enables the "back to app" attribution link on the story. Sharing still
      // works fine without a Facebook App ID configured.
      appId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '',
    });
    if (result?.success === false) throw new Error(result.message);
  } catch {
    await shareImageGeneric(imageUri, caption);
  }
}

/** Generic OS share sheet — lets the user pick any app (WhatsApp, Instagram feed post, etc). */
export async function shareImageGeneric(imageUri: string, caption?: string) {
  const mod = loadShareModule();
  if (!mod) return;
  const { default: Share } = mod as any;
  await Share.open({ url: imageUri, message: caption }).catch(() => {});
}
