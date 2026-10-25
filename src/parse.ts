/** Characters that end an address: ASCII and full-width comma/semicolon, the ideographic comma, line breaks, tabs. */
const LIST_SEPARATORS = /[,;，；、\r\n\t]+/;
/** A `<bracketed address>` or any run of characters that are neither spaces nor brackets. */
const TOKENS = /<([^<>]*)>|[^\s<>]+/g;
const QUOTED = /"(?:[^"\\]|\\.)*"/g;

/**
 * Extracts candidate addresses from free text, in the order they appear.
 *
 * Understands what people actually paste:
 *  - separators: commas, semicolons (also full-width), spaces, tabs, line breaks — an Excel column works
 *  - address books: `Ada Lovelace <ada@example.com>; "Hopper, Grace" <grace@example.com>`
 *  - `mailto:` links, with or without `?subject=…`
 *  - sentence punctuation: `(write to info@example.com).`
 *
 * Words next to a `<bracketed address>` are taken as the display name and skipped,
 * unless they contain an `@`.
 */
export function parseEmails(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  // Quoted display names may contain commas or spaces: blank them out first.
  const source = String(text).replace(QUOTED, ' ');
  for (const part of source.split(LIST_SEPARATORS)) {
    const hasBrackets = /<[^<>]*>/.test(part);
    for (const match of part.matchAll(TOKENS)) {
      if (match[1] !== undefined) pushCandidate(out, match[1]);
      else if (!hasBrackets || match[0].includes('@')) pushCandidate(out, match[0]);
    }
  }
  return out;
}

function pushCandidate(out: string[], token: string): void {
  let t = token.trim();
  if (/^mailto:/i.test(t)) t = t.slice(7).split('?')[0];
  // Punctuation around an address in a sentence: "(info@example.com)." or 'quoted'.
  t = t.replace(/^[(\['"]+/, '').replace(/[.,:;)\]'"]+$/, '');
  if (t) out.push(t);
}

/** Canonical form used for comparisons and output: trimmed, lower-cased, Unicode NFC. */
export function normalizeEmail(email: string): string {
  return email.trim().normalize('NFC').toLowerCase();
}

/** True when the text being typed contains a character that completes an address. */
export function hasSeparator(text: string): boolean {
  return /[\s,;，；、]/.test(text);
}
