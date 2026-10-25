import type { GoldpanMessages } from '../types';
export type { GoldpanMessages } from '../types';
import en from './en';
import it from './it';
import es from './es';
import fr from './fr';
import de from './de';
import pt from './pt';
import zh from './zh';
import ja from './ja';

/** Every bundled locale, keyed by language code. */
const all: Record<string, GoldpanMessages> = { en, it, es, fr, de, pt, zh, ja };

export default all;
export { en, it, es, fr, de, pt, zh, ja };
