// Entry of the <script> build: exposes window.Goldpan and picks up locales
// whose script was loaded before the core.
import { Goldpan } from './Goldpan';
import type { GoldpanMessages } from './types';

const g = globalThis as unknown as { Goldpan?: typeof Goldpan; GoldpanLocales?: Record<string, GoldpanMessages> };
g.Goldpan = Goldpan;
for (const [code, messages] of Object.entries(g.GoldpanLocales ?? {})) Goldpan.registerLocale(code, messages);
