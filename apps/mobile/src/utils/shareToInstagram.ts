// `react-native-share` isn't one of Expo Go's precompiled native modules (it's a third-party
// library needing a real native build) – its own package resolves its native binding eagerly at
// import time, so a top-level `import` here would crash the WHOLE app the instant this module is
// first required (which happens at startup, since this is reachable from AchievementGrid, used
// on nearly every screen). Deferred to a lazy require() inside each function instead, so it only
// throws (caught below, degrading to a no-op) when a share button is actually pressed under Expo
// Go – the rest of the app keeps working. Under a real dev-client/production build this resolves
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
export async function shareImageToInstagramStory(imageUri: string, caption?: string): Promise<boolean> {
  const mod = loadShareModule();
  if (!mod) return false; // Sharing isn't available in this runtime (e.g. Expo Go) – silently no-op.
  const { default: Share, Social } = mod as any;

  try {
    const result = await Share.shareSingle({
      social: Social.InstagramStories,
      backgroundImage: imageUri,
      // Optional – only enables the "back to app" attribution link on the story. Sharing still
      // works fine without a Facebook App ID configured.
      appId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '',
    });
    if (result?.success === false) throw new Error(result.message);
    return true;
  } catch {
    return shareImageGeneric(imageUri, caption);
  }
}

/** Generic OS share sheet – lets the user pick any app (WhatsApp, Instagram feed post, etc). */
/** Resolves true only if the user actually completed a share (not dismissed the sheet). */
export async function shareImageGeneric(imageUri: string, caption?: string): Promise<boolean> {
  const mod = loadShareModule();
  if (!mod) return false;
  const { default: Share } = mod as any;
  try {
    const result = await Share.open({ url: imageUri, message: caption });
    return result?.success !== false;
  } catch {
    return false;
  }
}

export type ShareTarget = 'whatsapp' | 'instagram' | 'instagramStory' | 'twitter' | 'other';

const SOCIAL_KEY: Record<'whatsapp' | 'instagram' | 'twitter', string> = {
  whatsapp: 'Whatsapp',
  instagram: 'Instagram',
  twitter: 'Twitter',
};

/**
 * Shares an image straight into one specific app (WhatsApp, Instagram feed, X). Falls back to the
 * generic OS share sheet when the app isn't installed or the direct call fails, so the button
 * always does something useful.
 */
async function shareImageToApp(target: 'whatsapp' | 'instagram' | 'twitter', imageUri: string, caption?: string): Promise<boolean> {
  const mod = loadShareModule();
  if (!mod) return false;
  const { default: Share, Social } = mod as any;

  try {
    const result = await Share.shareSingle({
      social: Social[SOCIAL_KEY[target]],
      url: imageUri,
      message: caption,
      type: 'image/jpeg',
    });
    if (result?.success === false) throw new Error(result.message);
    return true;
  } catch {
    return shareImageGeneric(imageUri, caption);
  }
}

export function shareImage(target: ShareTarget, imageUri: string, caption?: string): Promise<boolean> {
  switch (target) {
    case 'instagramStory':
      return shareImageToInstagramStory(imageUri, caption);
    case 'other':
      return shareImageGeneric(imageUri, caption);
    default:
      return shareImageToApp(target, imageUri, caption);
  }
}
