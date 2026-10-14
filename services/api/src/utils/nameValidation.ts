/**
 * Person-name validation. Returns an error message, or null when the name is acceptable.
 *
 * IMPORTANT: keep in sync with apps/mobile/src/utils/nameValidation.ts — the form blocks what
 * the API rejects, so the two must agree.
 */

/** Characters a name may contain: letters (any script), combining marks, space, . ' ’ - */
export const NAME_DISALLOWED_CHARS = /[^\p{L}\p{M} .'’-]/gu;

// Words nobody is actually called — placeholders typed to get past a form.
const PLACEHOLDER_NAMES = new Set([
  'test', 'tester', 'testing', 'user', 'username', 'name', 'firstname', 'lastname', 'fullname',
  'null', 'undefined', 'unknown', 'anonymous', 'nil', 'none', 'na', 'nan', 'guest', 'demo',
  'abc', 'abcd', 'xyz', 'sample', 'example', 'asdf', 'qwerty',
]);

// Words that would let someone pass as ARTH staff.
const RESERVED_WORDS = new Set(['admin', 'administrator', 'moderator', 'support', 'official', 'staff']);

// Runs of keys from the keyboard rows — somebody mashing the keyboard, not a name.
const KEYBOARD_RUNS = ['qwer', 'asdf', 'zxcv', 'hjkl', 'uiop'];

export function validateName(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return 'Name is required.';

  const letterCount = (value.match(/\p{L}/gu) ?? []).length;
  if (letterCount < 3) return 'Name must have at least 3 letters.';
  if (value.length > 60) return 'Name can be at most 60 characters.';

  if (!/^\p{L}/u.test(value)) return 'Name must start with a letter.';
  if (!/^[\p{L}\p{M} .'’-]+$/u.test(value)) return 'Use only letters, spaces, . - and apostrophes.';
  if (!/[\p{L}\p{M}.]$/u.test(value)) return 'Name can not end with a hyphen or apostrophe.';

  if (/ {2,}/.test(value)) return 'Use a single space between words.';
  if (/[.'’-]{2,}/u.test(value)) return 'Remove repeated punctuation.';
  if (/ [-'’]|[-'’] /u.test(value)) return 'Hyphens and apostrophes can not be next to a space.';

  const words = value.split(' ');
  if (words.some((w) => w.length > 30)) return 'Each word in a name can be at most 30 characters.';

  if (/(\p{L})\1{2,}/u.test(value)) return 'Name can not repeat the same letter three times in a row.';

  const lower = value.toLowerCase();
  const squashed = lower.replace(/[^\p{L}]/gu, '');
  if (KEYBOARD_RUNS.some((run) => squashed.includes(run))) return 'Please enter your real name.';

  const plainWords = lower.split(/[ .'’-]+/u).filter(Boolean);
  if (plainWords.every((w) => PLACEHOLDER_NAMES.has(w))) return 'Please enter your real name.';
  if (plainWords.some((w) => RESERVED_WORDS.has(w))) return 'This name is not allowed.';

  if (/(www|https?|\.com|\.in|\.net|\.org)/i.test(value)) return 'Name can not look like a web address.';

  return null;
}
