// Short, human-friendly game codes.
// Alphabet excludes ambiguous characters (0/O, 1/I/L) so codes are
// easy to read aloud and type. Codes are always uppercase.

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 symbols

// Generate a random code (default 6 chars => ~887M combinations).
export function generateCode(len = 6) {
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return s; // already uppercase
}

// Clean user input into a comparable code: uppercase, strip anything
// not in the alphabet (spaces, dashes, ambiguous chars a user might add).
export function normalizeCodeInput(input) {
  return (input || '').trim().toUpperCase().replace(/[^A-Z2-9]/g, '');
}
