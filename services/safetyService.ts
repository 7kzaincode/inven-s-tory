
/**
 * ARCHIVAL SAFETY PROTOCOL
 * Centralized filtering for professional compliance.
 */

// A starter list of restricted terms. For a production app, 
// you would use a more comprehensive library or external API.
const BANNED_WORDS = [
  'profanity1', 'profanity2', 'badword3' // Add standard restricted terms here
];

/**
 * Checks if a string contains prohibited content.
 */
export function isClean(text: string): boolean {
  if (!text) return true;
  const normalized = text.toLowerCase();
  return !BANNED_WORDS.some(word => normalized.includes(word));
}

/**
 * Replaces prohibited content with archival placeholders.
 */
export function censor(text: string): string {
  if (!text) return "";
  let censoredText = text;
  BANNED_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    censoredText = censoredText.replace(regex, '[REDACTED]');
  });
  return censoredText;
}

/**
 * Validates a username against length and character standards.
 */
export function isValidHandle(username: string): { valid: boolean; error: string | null } {
  if (username.length < 3) return { valid: false, error: "HANDLE TOO SHORT" };
  if (username.length > 20) return { valid: false, error: "HANDLE TOO LONG" };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, error: "ALPHANUMERIC ONLY" };
  if (!isClean(username)) return { valid: false, error: "HANDLE NON-COMPLIANT" };
  return { valid: true, error: null };
}
