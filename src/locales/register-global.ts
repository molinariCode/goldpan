import type { GoldpanMessages } from '../types';

/**
 * Used by the <script> builds of the locales: registers the messages on
 * `window.Goldpan` if the core script is already loaded, otherwise queues them.
 * Does not import the core, so each locale file stays tiny.
 */
export function registerGlobal(code: string, messages: GoldpanMessages): void {
  const g = globalThis as unknown as {
    Goldpan?: { registerLocale?: (c: string, m: GoldpanMessages) => void };
    GoldpanLocales?: Record<string, GoldpanMessages>;
  };
  g.GoldpanLocales = g.GoldpanLocales || {};
  g.GoldpanLocales[code] = messages;
  g.Goldpan?.registerLocale?.(code, messages);
}
