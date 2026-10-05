import { randomInt } from 'crypto';

// Permanent, human-readable "ARTH Tree Identity" — e.g. "A48Z91". Fixed single-letter prefix
// (not type-encoding: Tree vs PlantedTree are told apart by which table resolves the id, not by
// the prefix) followed by 5 characters from an alphabet that drops 0/O and 1/I to avoid visual
// confusion. Collisions are handled by the caller (catch the unique-violation, regenerate,
// retry) rather than here — the ID space (35^5 ≈ 52.5M) makes that sufficient without a
// sequence table.
const PREFIX = 'A';
const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const BODY_LENGTH = 5;

export function generatePublicId(): string {
  let body = '';
  for (let i = 0; i < BODY_LENGTH; i++) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${PREFIX}${body}`;
}

const PUBLIC_ID_PATTERN = new RegExp(`^${PREFIX}[${ALPHABET}]{${BODY_LENGTH}}$`);

export function isValidPublicId(candidate: string): boolean {
  return PUBLIC_ID_PATTERN.test(candidate.toUpperCase());
}

export function normalizePublicId(candidate: string): string {
  return candidate.trim().toUpperCase();
}
