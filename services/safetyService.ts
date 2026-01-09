
/**
 * ARCHIVAL SAFETY PROTOCOL
 */

// Strict regex for non-compliant and offensive terms
const BANNED_PATTERN = /\b(n[i1]gg[e3]r|f[a4]gg[o0]t|k[i1]k[e3]|c[o0][o0]n|sp[i1]c|w[e3]tb[a4]ck|r[e3]t[a4]rd|wh[o0]r[e3]|c[u0]nt)\b/gi;

/**
 * Checks if a string contains prohibited content.
 */
export function isClean(text: string): boolean {
  if (!text) return true;
  BANNED_PATTERN.lastIndex = 0;
  return !BANNED_PATTERN.test(text);
}

/**
 * Replaces prohibited content with placeholders.
 */
export function censor(text: string): string {
  if (!text) return "";
  BANNED_PATTERN.lastIndex = 0;
  return text.replace(BANNED_PATTERN, '[REDACTED]');
}

/**
 * Validates a username.
 */
export function isValidHandle(username: string): { valid: boolean; error: string | null } {
  const clean = username.replace('@', '').trim();
  if (clean.length < 3) return { valid: false, error: "HANDLE TOO SHORT" };
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) return { valid: false, error: "ALPHANUMERIC ONLY" };
  if (!isClean(clean)) return { valid: false, error: "HANDLE NON-COMPLIANT" };
  return { valid: true, error: null };
}
