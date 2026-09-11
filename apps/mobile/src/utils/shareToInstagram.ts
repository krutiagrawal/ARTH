import Share, { Social } from 'react-native-share';

/**
 * Shares an image straight into the Instagram Stories composer (background pre-loaded, like
 * Strava's "share to Instagram"). Falls back to the generic OS share sheet when Instagram isn't
 * installed or the direct call fails/is cancelled, so the action always does something useful.
 */
export async function shareImageToInstagramStory(imageUri: string, caption?: string) {
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
  await Share.open({ url: imageUri, message: caption }).catch(() => {});
}
