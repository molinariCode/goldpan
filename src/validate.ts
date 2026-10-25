// Letters and digits of any script, plus the symbols RFC 5322 allows in an unquoted local part.
const ATOM = "[\\p{L}\\p{M}\\p{N}!#$%&'*+/=?^_`{|}~-]+";
const LOCAL_PART = new RegExp(`^${ATOM}(?:\\.${ATOM})*$`, 'u');
// A domain label: letters/digits, inner hyphens, 1–63 characters.
const LABEL = /^[\p{L}\p{M}\p{N}](?:[\p{L}\p{M}\p{N}-]{0,61}[\p{L}\p{M}\p{N}])?$/u;
// A top-level domain: letters only, or an ASCII-encoded (punycode) international one.
const TOP_LEVEL = /^(?:[\p{L}\p{M}]{2,63}|xn--[a-z0-9-]{1,59})$/u;

/**
 * Checks the shape of an address the way real mail systems do, not the whole
 * RFC 5322 grammar: quoted local parts, comments and IP-address domains are
 * refused on purpose, international (IDN / UTF-8) addresses are accepted.
 * It does not check that the mailbox exists.
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || email.length > 254) return false;
  const at = email.indexOf('@');
  if (at < 1 || at !== email.lastIndexOf('@')) return false;

  const local = email.slice(0, at);
  if (local.length > 64 || !LOCAL_PART.test(local)) return false;

  const domain = email.slice(at + 1);
  if (domain.length > 253) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && labels.every((l) => LABEL.test(l)) && TOP_LEVEL.test(labels[labels.length - 1]);
}

/** The part after the `@`. */
export function domainOf(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1);
}
