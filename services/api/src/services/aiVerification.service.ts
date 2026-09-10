import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env';

// gemini-2.5-flash-lite was deprecated for new API keys (404 "no longer available to new
// users") — 3.5 is Google's suggested replacement in that same error message.
const MODEL = 'gemini-3.5-flash-lite';

// "isPlanting" now means something narrower than its name suggests: not just "planting-related",
// but specifically "a hand/person holding an unplanted sapling, ready to plant it" — see the
// prompt below. Kept the field name to avoid touching every layer that already parses it.
const PROMPT = `You are a photo verifier for a tree-planting app. A user submitted this photo as proof they are about to plant a tree.

Approve (isPlanting: true) ONLY if the photo clearly shows a human hand or person actively holding an UNPLANTED sapling/seedling – bare-root, potted, or with a wrapped/exposed root ball – in a pre-planting pose: e.g. held over an open hole or loose soil, or simply held up/out, roots or root ball visible and clearly not yet in the ground.

Reject (isPlanting: false) everything else, including:
- A tree or sapling that is already planted/rooted in the ground, even if a hand is touching it, resting on it, or appears to be "holding" it.
- A person merely standing beside, near, or in front of a tree (no sapling in hand).
- A mature tree, forest, or any tree too large to be a seedling.
- A selfie or portrait where a tree is only in the background.
- Any photo unrelated to tree planting.
- A photo that is too unclear, blurry, or cropped to tell.
- A photo that is itself a photograph OF A SCREEN OR DISPLAY rather than a live scene – someone photographing their phone, monitor, or a printed picture instead of the real moment. Look for: a visible device bezel/frame or screen edge in the shot; moiré/interference banding or a fine repeating pixel/screen-door grid; a sharp glare hotspot or reflection typical of a glass/glossy screen; on-screen UI chrome such as a status bar, browser address bar, app icons, a cursor, or photo-app overlay; unnaturally flat, uniformly "backlit" lighting inconsistent with natural/ambient light; visible rounded screen corners. If you see ANY of these, reject even if the underlying image content would otherwise look plausible.

Respond with strict JSON only, matching this shape:
{ "isPlanting": boolean, "reason": string }

"reason" must be a short (under 140 characters), user-facing sentence explaining the decision – friendly if approved, specific about what's missing if rejected (e.g. "Looks like this tree is already planted – please show the sapling before it goes in the ground." or "This looks like a photo of a screen, not a live photo – please take a new photo of the real sapling."). Use an en dash (–), never an em dash (—), anywhere in "reason".`;

export interface PlantingVerification {
  status: 'verified' | 'rejected' | 'unverified';
  reason: string;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export async function verifyPlantingPhoto(photo: { buffer: Buffer; mimetype: string }): Promise<PlantingVerification> {
  if (!env.GEMINI_API_KEY) {
    console.warn('[aiVerification] GEMINI_API_KEY not set — skipping photo verification.');
    return { status: 'unverified', reason: 'AI verification not configured' };
  }

  try {
    const response = await getClient().models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType: photo.mimetype, data: photo.buffer.toString('base64') } },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isPlanting: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
          },
          required: ['isPlanting', 'reason'],
        },
        abortSignal: AbortSignal.timeout(10_000),
      },
    });

    const parsed = JSON.parse(response.text ?? '{}') as { isPlanting?: boolean; reason?: string };
    if (typeof parsed.isPlanting !== 'boolean') throw new Error('Malformed verification response');

    return {
      status: parsed.isPlanting ? 'verified' : 'rejected',
      reason: parsed.reason || (parsed.isPlanting ? 'Looks good!' : "This photo doesn't look like a tree planting."),
    };
  } catch (error) {
    // Gemini being down/slow/rate-limited shouldn't block a real planting — fail open and let
    // it through unverified rather than 500ing the whole submit flow.
    console.error('[aiVerification] verification call failed, letting photo through unverified:', error);
    return { status: 'unverified', reason: 'AI verification unavailable' };
  }
}
