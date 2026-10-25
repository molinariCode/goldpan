/**
 * Correct domains of popular mailbox providers, used by the typo check.
 * Add your own with the `knownDomains` option; that also stops a legitimate
 * domain that happens to look like a popular one from being reported.
 */
export const DEFAULT_KNOWN_DOMAINS: string[] = [
  // Worldwide
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'ymail.com', 'rocketmail.com', 'aol.com', 'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'pm.me', 'zoho.com', 'yandex.com', 'mail.com', 'email.com',
  'gmx.com', 'gmx.net', 'fastmail.com', 'hey.com', 'tutanota.com', 'tuta.io', 'qq.com',
  '163.com', '126.com', 'sina.com', 'naver.com', 'daum.net',
  // Country versions of the big ones
  'hotmail.it', 'hotmail.fr', 'hotmail.es', 'hotmail.de', 'hotmail.co.uk',
  'outlook.it', 'outlook.fr', 'outlook.es', 'outlook.de',
  'live.it', 'live.fr', 'live.co.uk',
  'yahoo.it', 'yahoo.fr', 'yahoo.es', 'yahoo.de', 'yahoo.co.uk', 'yahoo.co.jp', 'yahoo.com.br',
  // Italy, certified mail (PEC) included
  'libero.it', 'virgilio.it', 'alice.it', 'tin.it', 'tim.it', 'tiscali.it', 'fastwebnet.it',
  'email.it', 'inwind.it', 'iol.it', 'poste.it', 'pec.it', 'legalmail.it', 'arubapec.it', 'postecert.it',
  // Rest of Europe
  'web.de', 'gmx.de', 't-online.de', 'freenet.de', 'orange.fr', 'free.fr', 'laposte.net', 'sfr.fr',
  'wanadoo.fr', 'telefonica.net', 'btinternet.com', 'sky.com', 'virginmedia.com', 'seznam.cz',
  'wp.pl', 'o2.pl', 'interia.pl', 'mail.ru', 'yandex.ru', 'ukr.net', 'bluewin.ch',
  // Americas
  'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net', 'bol.com.br', 'uol.com.br', 'terra.com.br',
];

/**
 * EXCLUSION LIST: domains that are always refused (red) unless an instance
 * passes its own `blockedDomains`. Change it here, or at runtime before
 * creating instances: `Goldpan.blockedDomains.push('competitor.com')`.
 * `*.domain.com` also covers every sub-domain.
 */
export const DEFAULT_BLOCKED_DOMAINS: string[] = [
  // Misspellings so common they are certainly wrong (shown with a one-click fix)
  'gmal.com', 'gmial.com', 'gmai.com', 'gamil.com', 'gnail.com', 'gmail.co', 'gmail.con', 'gmail.cm',
  'hotmial.com', 'hotmal.com', 'hotmail.co', 'hotmail.con', 'outlok.com', 'outlook.co',
  'yaho.com', 'yahooo.com', 'yahoo.con', 'iclod.com', 'icloud.co', 'libreo.it',
  // Throw-away mailbox services
  'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'sharklasers.com', '10minutemail.com',
  'temp-mail.org', 'trashmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
];

/**
 * Two-letter country codes in use as top-level domains (plus `uk` and `eu`).
 * A provider on a real country code is a regional service (hotmail.be,
 * yahoo.com.ar), not a typo of another country's one.
 */
const COUNTRY_CODES = new Set(
  (
    'ac ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bm bn bo bq br bs bt bv bw by bz ' +
    'ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg eh er es et eu ' +
    'fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu ' +
    'id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ' +
    'ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om ' +
    'pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st su sv sx sy sz ' +
    'tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug uk um us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw'
  ).split(' '),
);

/** Real country codes that, next to a big provider, are nearly always a slip for .com or .net. */
const SLIP_CODES = new Set(['co', 'cm', 'om', 'ne']);

/** Provider names shorter than this are compared only exactly (aol vs aon, msn vs msc…). */
const MIN_FUZZY_NAME = 5;

/**
 * Edit distance between two strings, counting insertions, deletions,
 * substitutions and swaps of two neighbouring characters (optimal string
 * alignment). Stops early: any result above `max` is returned as `max + 1`.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let older: number[] = [];
  let above = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowBest = i;
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(above[j] + 1, row[j - 1] + 1, above[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, older[j - 2] + 1);
      row[j] = d;
      rowBest = Math.min(rowBest, d);
    }
    if (rowBest > max) return max + 1;
    older = above;
    above = row;
  }
  return Math.min(above[b.length], max + 1);
}

/** `mail.example.co.uk` → name `mail`, suffix `example.co.uk`. Null without a dot. */
function splitDomain(domain: string): { name: string; suffix: string } | null {
  const dot = domain.indexOf('.');
  return dot > 0 ? { name: domain.slice(0, dot), suffix: domain.slice(dot + 1) } : null;
}

/**
 * True when `typed` (one edit away from `intended`) is a slip rather than a
 * real alternative: the label that changed is not a country code in use,
 * or is one of the codes typed by mistake for .com/.net.
 */
function isSuffixSlip(typed: string, intended: string): boolean {
  const a = typed.split('.');
  const b = intended.split('.');
  if (a.length !== b.length) return true;
  const changed = a.find((label, i) => label !== b[i]) ?? '';
  return !COUNTRY_CODES.has(changed) || SLIP_CODES.has(changed);
}

/**
 * Returns the domain the user probably meant, or `null` when the domain looks fine.
 *
 * Two kinds of slips are recognised, never both at once:
 * - the provider name, with the same ending: `gmial.com` → `gmail.com`,
 *   `libreo.it` → `libero.it`. The first letter must match and short names
 *   (`aol`, `gmx`, `msn`) are skipped, as they sit one letter away from many
 *   real company domains;
 * - the ending, with the same provider name: `gmail.con` → `gmail.com`,
 *   `hotmail.co` → `hotmail.com`. A real country ending (`hotmail.be`,
 *   `yahoo.in`) is a regional service and is left alone.
 */
export function suggestDomain(domain: string, known: ReadonlySet<string>): string | null {
  if (known.has(domain)) return null;
  const typed = splitDomain(domain);
  if (!typed) return null;
  for (const candidate of known) {
    const target = splitDomain(candidate);
    if (!target) continue;
    if (typed.name === target.name) {
      if (editDistance(typed.suffix, target.suffix, 1) === 1 && isSuffixSlip(typed.suffix, target.suffix)) return candidate;
    } else if (
      typed.suffix === target.suffix &&
      target.name.length >= MIN_FUZZY_NAME &&
      typed.name[0] === target.name[0] &&
      editDistance(typed.name, target.name, 1) === 1
    ) {
      return candidate;
    }
  }
  return null;
}

/**
 * True when the domain is on the list. `*.example.com` entries also match every
 * sub-domain, and `*.xyz` a whole top-level domain.
 */
export function isDomainBlocked(domain: string, blocked: ReadonlySet<string>): boolean {
  if (blocked.size === 0) return false;
  if (blocked.has(domain) || blocked.has('*.' + domain)) return true;
  // Walk up the parents: a.b.example.com → b.example.com → example.com → com.
  for (let dot = domain.indexOf('.'); dot !== -1; dot = domain.indexOf('.', dot + 1)) {
    if (blocked.has('*.' + domain.slice(dot + 1))) return true;
  }
  return false;
}
