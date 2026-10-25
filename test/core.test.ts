import { classify, type ClassifyConfig } from '../src/classify';
import { DEFAULT_KNOWN_DOMAINS, editDistance, isDomainBlocked, suggestDomain } from '../src/domains';
import { format } from '../src/i18n';
import en from '../src/locales/en';
import all from '../src/locales/all';
import { normalizeEmail, parseEmails } from '../src/parse';
import { isValidEmailFormat } from '../src/validate';

describe('parseEmails', () => {
  it('splits on commas, semicolons, spaces, tabs and line breaks', () => {
    expect(parseEmails('a@x.com, b@x.com;c@x.com d@x.com\te@x.com\nf@x.com\r\ng@x.com')).toEqual([
      'a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com', 'f@x.com', 'g@x.com',
    ]);
  });

  it('splits on full-width and ideographic separators', () => {
    expect(parseEmails('a@x.com，b@x.com；c@x.com、d@x.com　e@x.com')).toEqual([
      'a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com',
    ]);
  });

  it('reads address-book lines, quoted names with commas included', () => {
    expect(parseEmails('Ada Lovelace <ada@x.com>; "Hopper, Grace" <grace@x.com>, alan@x.com')).toEqual([
      'ada@x.com', 'grace@x.com', 'alan@x.com',
    ]);
  });

  it('keeps an address written next to a bracketed one, in order', () => {
    expect(parseEmails('b@y.com Ada <a@x.com> c@z.com')).toEqual(['b@y.com', 'a@x.com', 'c@z.com']);
  });

  it('drops mailto: and its query, and sentence punctuation', () => {
    expect(parseEmails('mailto:info@x.com?subject=Hi (sales@x.com). <mailto:help@x.com>')).toEqual([
      'info@x.com', 'sales@x.com', 'help@x.com',
    ]);
  });

  it('keeps unparseable words so the user sees them as errors', () => {
    expect(parseEmails('a@x.com ada.lovelace.example.com')).toEqual(['a@x.com', 'ada.lovelace.example.com']);
  });

  it('returns nothing for blank input', () => {
    expect(parseEmails('  ,; \n ')).toEqual([]);
  });

  it('normalizes case and Unicode composition', () => {
    expect(normalizeEmail(' Ada@Caffè.IT ')).toBe('ada@caffè.it');
  });
});

describe('isValidEmailFormat', () => {
  it.each([
    'simple@example.com',
    'first.last+tag@sub.example.co.uk',
    "o'connor@example.ie",
    'chef@caffè.it',
    'user@xn--caff-dra.it',
    '用户@例子.广告',
  ])('accepts %s', (e) => expect(isValidEmailFormat(e)).toBe(true));

  it.each([
    'plain',
    '@example.com',
    'a@b',
    'a@@b.com',
    'a@b@c.com',
    '.a@b.com',
    'a.@b.com',
    'a..b@c.com',
    'a@-b.com',
    'a@b-.com',
    'a@b.c',
    'a@b.123',
    'a b@c.com',
    '<img/src/onerror=alert(1)>',
    `${'a'.repeat(65)}@b.com`,
  ])('rejects %s', (e) => expect(isValidEmailFormat(e)).toBe(false));
});

describe('typo check', () => {
  const known = new Set(DEFAULT_KNOWN_DOMAINS);

  it('measures edit distance with swaps, and stops at the cap', () => {
    expect(editDistance('gmail.com', 'gmial.com')).toBe(1);
    expect(editDistance('gmail.com', 'gmal.com')).toBe(1);
    expect(editDistance('gmail.com', 'gmail.con')).toBe(1);
    expect(editDistance('kitten', 'sitting', 5)).toBe(3);
    expect(editDistance('abc', 'xyz', 1)).toBe(2);
  });

  it.each([
    ['gmal.com', 'gmail.com'],
    ['gmial.com', 'gmail.com'],
    ['gmai.com', 'gmail.com'],
    ['gmail.con', 'gmail.com'],
    ['gmail.co', 'gmail.com'],
    ['gmail.cm', 'gmail.com'],
    ['gmail.comm', 'gmail.com'],
    ['hotmial.com', 'hotmail.com'],
    ['hotmail.co.ul', 'hotmail.co.uk'],
    ['yahooo.com', 'yahoo.com'],
    ['outlok.com', 'outlook.com'],
    ['libreo.it', 'libero.it'],
    ['libero.ot', 'libero.it'],
    ['icloud.cpm', 'icloud.com'],
  ])('suggests %s → %s', (typo, fixed) => expect(suggestDomain(typo, known)).toBe(fixed));

  it.each([
    // the providers themselves and look-alikes that are providers too
    'gmail.com', 'mail.com', 'ymail.com', 'email.com', 'tin.it', 'tim.it', 'wp.pl',
    // ordinary domains
    'example.com', 'acme.io',
    // regional domains of the big providers
    'hotmail.be', 'hotmail.nl', 'hotmail.se', 'live.ie', 'live.at', 'live.be', 'yahoo.in', 'yahoo.dk', 'yahoo.gr',
    'yahoo.ie', 'yahoo.se', 'yahoo.com.ar', 'yahoo.co.id', 'outlook.be', 'outlook.at', 'outlook.pt', 'gmx.at', 'gmx.ch',
    // real companies one letter away from a short provider name
    'aon.com', 'skf.com', 'msc.com', 'gmc.com', 'cloud.com', 'wahoo.com',
  ])('leaves %s alone', (domain) => expect(suggestDomain(domain, known)).toBeNull());
});

describe('isDomainBlocked', () => {
  const blocked = new Set(['mailinator.com', '*.tempmail.dev']);
  it('matches whole domains, wildcard sub-domains and whole top-level domains', () => {
    expect(isDomainBlocked('mailinator.com', blocked)).toBe(true);
    expect(isDomainBlocked('tempmail.dev', blocked)).toBe(true);
    expect(isDomainBlocked('x.y.tempmail.dev', blocked)).toBe(true);
    expect(isDomainBlocked('sub.mailinator.com', blocked)).toBe(false);
    expect(isDomainBlocked('example.com', blocked)).toBe(false);
    expect(isDomainBlocked('spam.example.xyz', new Set(['*.xyz']))).toBe(true);
  });
});

describe('classify', () => {
  const base: ClassifyConfig = {
    maxEmails: null,
    duplicates: 'drop',
    existing: 'warn',
    existingSet: new Set(),
    blockedSet: new Set(),
    typoCheck: 'warn',
    knownSet: new Set(DEFAULT_KNOWN_DOMAINS),
    messages: en,
  };
  const items = (...emails: string[]) => emails.map((raw, i) => ({ id: String(i), raw, email: normalizeEmail(raw) }));
  const statuses = (cfg: Partial<ClassifyConfig>, ...emails: string[]) =>
    classify(items(...emails), { ...base, ...cfg }).map((e) => `${e.status}:${e.reason ?? ''}`);

  it('compares addresses without regard to letter case', () => {
    expect(statuses({}, 'Ada@Example.com', 'ada@example.com')).toEqual(['valid:', 'warning:duplicate']);
  });

  it('duplicates: warn takes a place, reject leaves it free', () => {
    expect(statuses({ maxEmails: 2, duplicates: 'warn' }, 'a@x.com', 'a@x.com', 'b@x.com')).toEqual([
      'valid:', 'warning:duplicate', 'invalid:limit',
    ]);
    expect(statuses({ maxEmails: 2, duplicates: 'reject' }, 'a@x.com', 'a@x.com', 'b@x.com')).toEqual([
      'valid:', 'invalid:duplicate', 'valid:',
    ]);
  });

  it('existing addresses follow their own policy', () => {
    const existingSet = new Set(['ada@x.com']);
    expect(statuses({ existingSet }, 'ADA@x.com')).toEqual(['warning:existing']);
    expect(statuses({ existingSet, existing: 'reject' }, 'ada@x.com')).toEqual(['invalid:existing']);
  });

  it('has no limit unless one is set', () => {
    expect(statuses({}, 'a@x.com', 'b@x.com', 'c@x.com')).toEqual(['valid:', 'valid:', 'valid:']);
  });

  it('moves the first address waiting beyond the limit in when a place frees up', () => {
    const list = items('a@x.com', 'b@x.com', 'c@x.com');
    const cfg = { ...base, maxEmails: 2 };
    expect(classify(list, cfg).map((e) => e.status)).toEqual(['valid', 'valid', 'invalid']);
    expect(classify(list.slice(1), cfg).map((e) => e.status)).toEqual(['valid', 'valid']);
  });

  it('typo: yellow by default, red or off on request, always with the suggestion', () => {
    const [r] = classify(items('ada@gmial.com'), base);
    expect(r).toMatchObject({ status: 'warning', reason: 'typo', suggestion: 'ada@gmail.com' });
    expect(r.message).toBe('Did you mean ada@gmail.com?');
    expect(statuses({ typoCheck: 'reject' }, 'ada@gmial.com')).toEqual(['invalid:typo']);
    expect(statuses({ typoCheck: false }, 'ada@gmial.com')).toEqual(['valid:']);
  });

  it('blocked domains are errors, and a blocked misspelling keeps its suggestion', () => {
    expect(statuses({ blockedSet: new Set(['spam.com']) }, 'x@spam.com')).toEqual(['invalid:blockedDomain']);
    const [r] = classify(items('x@gmal.com'), { ...base, typoCheck: false, blockedSet: new Set(['gmal.com']) });
    expect(r).toMatchObject({ status: 'invalid', reason: 'blockedDomain', suggestion: 'x@gmail.com' });
  });

  it('runs the custom rule after the built-in checks', () => {
    const validate = (e: string) =>
      e.endsWith('@competitor.com')
        ? { status: 'invalid' as const, message: 'No competitors' }
        : e.startsWith('info@')
          ? { status: 'warning' as const, message: 'Shared mailbox' }
          : null;
    const out = classify(items('a@competitor.com', 'info@x.com', 'ada@x.com', 'bad'), { ...base, validate });
    expect(out.map((e) => [e.status, e.message])).toEqual([
      ['invalid', 'No competitors'],
      ['warning', 'Shared mailbox'],
      ['valid', ''],
      ['invalid', 'Not a valid email address'],
    ]);
  });
});

describe('locales', () => {
  const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const forms = (v: unknown): string[] => (typeof v === 'string' ? [v] : Object.values(v as Record<string, string>));

  it('every locale has every message, with the same placeholders as English', () => {
    for (const [code, messages] of Object.entries(all)) {
      expect(messages.lang, code).toBe(code);
      for (const key of Object.keys(en) as Array<keyof typeof en>) {
        if (key === 'lang') continue;
        const expected = placeholders(forms(en[key])[0]);
        for (const text of forms(messages[key])) {
          expect(text, `${code}.${key}`).toBeTypeOf('string');
          expect(placeholders(text), `${code}.${key}`).toBe(expected);
        }
      }
    }
  });

  it('format() fills placeholders, keeps unknown ones and picks plural forms', () => {
    expect(format('{a} and {b}', { a: 1 })).toBe('1 and {b}');
    expect(format(en.counter, { count: 1 }, 'en')).toBe('1 address');
    expect(format(en.counter, { count: 2 }, 'en')).toBe('2 addresses');
    expect(format(all.it.counter, { count: 1 }, 'it')).toBe('1 indirizzo');
    expect(format(all.fr.counter, { count: 0 }, 'fr')).toBe('0 adresse');
    expect(format(all.ja.counter, { count: 3 }, 'ja')).toBe('3 件');
  });
});

describe('Emitter', () => {
  it('calls every listener even when one unsubscribes or throws while being called', async () => {
    const { Emitter } = await import('../src/emitter');
    const events = new Emitter<{ ping: number }>();
    const seen: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const offFirst = events.on('ping', () => {
      seen.push('first');
      offFirst();
    });
    events.on('ping', () => {
      throw new Error('boom');
    });
    events.on('ping', (n) => seen.push(`third:${n}`));
    events.emit('ping', 1);
    events.emit('ping', 2);
    expect(seen).toEqual(['first', 'third:1', 'third:2']);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
