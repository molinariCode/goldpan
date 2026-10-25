import en from './locales/en';
import type { LocaleInput, GoldpanMessages, PluralText } from './types';

const locales = new Map<string, GoldpanMessages>([['en', en]]);
const pluralRules = new Map<string, Intl.PluralRules>();

/** Makes a translation selectable by code: `registerLocale('it', it)`, then `locale: 'it'`. */
export function registerLocale(code: string, messages: Partial<GoldpanMessages>): void {
  locales.set(code.toLowerCase(), { ...en, lang: code, ...messages });
}

/** Exact code first (`pt-br`), then the bare language (`pt`). */
export function getLocale(code: string): GoldpanMessages | undefined {
  const key = code.toLowerCase();
  return locales.get(key) ?? locales.get(key.split('-')[0]);
}

export function availableLocales(): string[] {
  return [...locales.keys()];
}

export function resolveMessages(locale: LocaleInput | undefined, overrides?: Partial<GoldpanMessages>): GoldpanMessages {
  let base = en;
  if (typeof locale === 'string') {
    const found = getLocale(locale);
    if (!found && typeof console !== 'undefined') {
      console.warn(`[Goldpan] Locale "${locale}" is not registered, falling back to "en".`);
    }
    base = found ?? en;
  } else if (locale) {
    base = { ...en, ...locale };
  }
  return overrides ? { ...base, ...overrides } : base;
}

/**
 * Fills `{name}` placeholders. A plural text picks its variant from `values.count`
 * with the rules of `lang`. Unknown placeholders are left as they are.
 */
export function format(template: string | PluralText, values: Record<string, string | number>, lang = 'en'): string {
  const text = typeof template === 'string' ? template : pluralVariant(template, Number(values.count ?? 0), lang);
  return text.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : whole,
  );
}

function pluralVariant(text: PluralText, count: number, lang: string): string {
  let rules = pluralRules.get(lang);
  if (!rules) {
    try {
      rules = new Intl.PluralRules(lang);
    } catch {
      rules = new Intl.PluralRules('en');
    }
    pluralRules.set(lang, rules);
  }
  return text[rules.select(count) as keyof PluralText] ?? text.other;
}
