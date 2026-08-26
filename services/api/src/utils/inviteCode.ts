import crypto from 'node:crypto';

// Short, human-typeable codes for group/corporate invite links — unlike
// resetToken's 32-byte hex (a URL param nobody types by hand), this needs to
// be readable off a screen and entered manually, so it's short and excludes
// visually-ambiguous characters (0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateInviteCode(length = 8): string {
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}
