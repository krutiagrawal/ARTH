import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env';

// gemini-2.5-flash-lite was deprecated for new API keys (404 "no longer available to new
// users") — 3.5 is Google's suggested replacement in that same error message.
const MODEL = 'gemini-3.5-flash-lite';

const PROMPT = `You are a photo verifier for a tree-planting app. A user submitted this photo as proof they just planted a tree.

Decide whether the photo genuinely shows a person planting (or having just planted) a young tree or sapling — e.g. a hand/person with a sapling, soil, a planting hole, a shovel, or a newly planted tree still in the ground with disturbed earth around it.

Reject photos that are: unrelated to planting, a stock/screenshot image, a mature tree/forest with no planting activity or evidence, or too unclear to tell.

Respond with strict JSON only, matching this shape:
{ "isPlanting": boolean, "reason": string }

"reason" must be a short (under 140 characters), user-facing sentence explaining the decision — friendly if approved, specific about what's missing if rejected.`;

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
