import { z } from 'zod';

// Kept in sync with the mobile app's curated emoji picker (tree/flower/environment glyphs only)
// so a request forged outside that picker can't slip an arbitrary emoji into the shared list.
export const SPECIES_EMOJI_OPTIONS = [
  '🌳', '🌲', '🌴', '🌵', '🎋', '🌱', '🪴', '🌿', '☘️', '🍀',
  '🌾', '🍁', '🍂', '🍃', '🌷', '🌸', '🌹', '🌺', '🌻', '🌼',
  '💐', '🏵️', '🥭', '🍊', '🥥', '🫒', '🍈', '🌰',
  '🌍', '🌎', '🌏', '🌦️', '🌈', '☀️', '🌙', '⛰️',
] as const;

export const createSpeciesSchema = z.object({
  commonName: z.string().trim().min(2, 'Species name is too short').max(40, 'Species name is too long'),
  emoji: z.enum(SPECIES_EMOJI_OPTIONS, { errorMap: () => ({ message: 'Pick one of the offered emoji' }) }),
});
