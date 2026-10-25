import { isDomainBlocked, suggestDomain } from './domains';
import { format } from './i18n';
import type {
  CustomValidationResult,
  DropPolicy,
  EntryReason,
  EntryStatus,
  IssuePolicy,
  GoldpanCounts,
  GoldpanEntry,
  GoldpanMessages,
} from './types';
import { domainOf, isValidEmailFormat } from './validate';

/** One row of the list before it is judged. */
export interface Item {
  id: string;
  raw: string;
  /** normalized */
  email: string;
}

export interface ClassifyConfig {
  maxEmails: number | null;
  duplicates: DropPolicy;
  existing: IssuePolicy;
  existingSet: ReadonlySet<string>;
  blockedSet: ReadonlySet<string>;
  typoCheck: IssuePolicy | false;
  knownSet: ReadonlySet<string>;
  validate?: (email: string) => CustomValidationResult;
  messages: GoldpanMessages;
}

/** Verdict on the address alone, regardless of its neighbours: safe to cache per address. */
export interface StaticCheck {
  status: EntryStatus;
  reason: EntryReason | null;
  message: string;
  suggestion: string | null;
}

const PASSED: StaticCheck = { status: 'valid', reason: null, message: '', suggestion: null };

/** `ada@gmial.com` + `gmail.com` → `ada@gmail.com` */
function withDomain(email: string, domain: string): string {
  return email.slice(0, email.lastIndexOf('@') + 1) + domain;
}

/** Format, exclusion list, typo check and custom rule, in this order. */
export function checkAddress(email: string, cfg: ClassifyConfig): StaticCheck {
  const m = cfg.messages;
  if (!isValidEmailFormat(email)) return { status: 'invalid', reason: 'format', message: m.format, suggestion: null };

  const domain = domainOf(email);
  const blocked = isDomainBlocked(domain, cfg.blockedSet);
  const likely = blocked || cfg.typoCheck ? suggestDomain(domain, cfg.knownSet) : null;
  const suggestion = likely ? withDomain(email, likely) : null;

  if (blocked) {
    // An excluded misspelling (gmal.com) still offers the fix.
    return {
      status: 'invalid',
      reason: 'blockedDomain',
      message: suggestion ? format(m.typo, { suggestion }) : m.blockedDomain,
      suggestion,
    };
  }

  let typo: StaticCheck | null = null;
  if (cfg.typoCheck && suggestion) {
    typo = {
      status: cfg.typoCheck === 'reject' ? 'invalid' : 'warning',
      reason: 'typo',
      message: format(m.typo, { suggestion }),
      suggestion,
    };
    if (typo.status === 'invalid') return typo;
  }

  const custom = cfg.validate?.(email);
  if (custom && custom !== true) return { status: custom.status, reason: 'custom', message: custom.message, suggestion: null };

  return typo ?? PASSED;
}

/**
 * Judges every item in list order. Pure and repeatable: after a removal or
 * an edit, running it again moves the next duplicate or the first address
 * waiting beyond the limit into the free place.
 */
export function classify(
  items: readonly Item[],
  cfg: ClassifyConfig,
  cache: Map<string, StaticCheck> = new Map(),
): GoldpanEntry[] {
  const m = cfg.messages;
  const accepted = new Set<string>();
  let used = 0;

  return items.map(({ id, raw, email }) => {
    let check = cache.get(email);
    if (!check) cache.set(email, (check = checkAddress(email, cfg)));
    let { status, reason, message, suggestion } = check;

    if (status !== 'invalid') {
      let policy: IssuePolicy | null = null;
      if (accepted.has(email)) {
        // `drop` only filters what is being added; a duplicate created by an edit is flagged in yellow.
        policy = cfg.duplicates === 'reject' ? 'reject' : 'warn';
        reason = 'duplicate';
        message = m.duplicate;
      } else if (cfg.existingSet.has(email)) {
        policy = cfg.existing;
        reason = 'existing';
        message = m.existing;
      }
      if (policy) {
        status = policy === 'reject' ? 'invalid' : 'warning';
        suggestion = null;
      }
    }

    if (status !== 'invalid') {
      if (cfg.maxEmails !== null && used >= cfg.maxEmails) {
        status = 'invalid';
        reason = 'limit';
        message = m.limit;
        suggestion = null;
      } else {
        used++;
        accepted.add(email);
      }
    }

    return Object.freeze({ id, email, raw, status, reason, message, suggestion });
  });
}

export function countEntries(entries: readonly GoldpanEntry[], maxEmails: number | null): GoldpanCounts {
  let valid = 0;
  let warning = 0;
  let invalid = 0;
  for (const e of entries) {
    if (e.status === 'valid') valid++;
    else if (e.status === 'warning') warning++;
    else invalid++;
  }
  const admitted = valid + warning;
  return { valid, warning, invalid, admitted, remaining: maxEmails === null ? null : Math.max(0, maxEmails - admitted) };
}
