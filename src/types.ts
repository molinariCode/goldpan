/** Final status of an address: green, amber or red. */
export type EntryStatus = 'valid' | 'warning' | 'invalid';

/**
 * Why an address is not plainly valid.
 * - `format`        malformed address (always an error)
 * - `blockedDomain` domain on the exclusion list (always an error)
 * - `typo`          domain looks like a misspelled known provider (gmial.com)
 * - `duplicate`     the same address appears earlier in the list
 * - `existing`      the address is in `existingEmails`
 * - `limit`         `maxEmails` is already reached (always an error)
 * - `custom`        flagged by your `validate` callback
 */
export type EntryReason = 'format' | 'blockedDomain' | 'typo' | 'duplicate' | 'existing' | 'limit' | 'custom';

/** `'warn'`: accept the address and flag it in yellow. `'reject'`: refuse it in red. */
export type IssuePolicy = 'warn' | 'reject';

/** Like {@link IssuePolicy}, plus `'drop'`: the address is not added to the list at all. */
export type DropPolicy = IssuePolicy | 'drop';

/**
 * What confirming the list (or submitting its form) does while rejected addresses are present.
 * `'ask'`: the first time it shows them and stops; confirming again goes on without them.
 * `'block'`: it shows them and stops until they are fixed or removed. `'skip'`: it goes on without them.
 */
export type RejectedPolicy = 'ask' | 'block' | 'skip';

/** Where a confirmation stopped by rejected addresses stands (event `confirm`). */
export interface ConfirmStop {
  /**
   * `'ask'`: one more confirmation goes on without the rejected addresses.
   * `'block'`: they must be fixed or removed first. `null`: nothing is pending (any more).
   */
  state: 'ask' | 'block' | null;
  /** Text for the person, to show near your send button (`''` when nothing is pending). */
  message: string;
  /** Label for your send button while one more press goes on without them (`''` otherwise). */
  label: string;
}

export type FilterValue = 'all' | EntryStatus;

export interface GoldpanEntry {
  /** Stable id, kept for the whole life of the entry (edits included). */
  readonly id: string;
  /** Normalized address (trimmed, lower-cased, Unicode NFC). This is what `getEmails()` returns. */
  readonly email: string;
  /** The text exactly as it was typed or pasted. */
  readonly raw: string;
  readonly status: EntryStatus;
  readonly reason: EntryReason | null;
  /** Localized explanation, `''` for valid entries. */
  readonly message: string;
  /** Proposed correction when the domain looks misspelled. */
  readonly suggestion: string | null;
}

/** What a `validate` callback returns. `null`, `undefined` or `true` accept the address. */
export type CustomValidationResult =
  | null
  | undefined
  | true
  | { status: 'warning' | 'invalid'; message: string };

/**
 * A text that depends on a number, one variant per plural category of the language
 * (see `Intl.PluralRules`). `other` is mandatory, the rest falls back to it.
 */
export type PluralText = { other: string } & Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many', string>>;

export interface GoldpanMessages {
  /** BCP 47 language tag, used to pick plural forms. */
  lang: string;
  placeholder: string;
  /** Accessible name of the text field when the original input has no label. */
  inputLabel: string;
  /** Name of the `valid` filter. */
  valid: string;
  /** Name of the `warning` filter. */
  warning: string;
  /** Name of the `invalid` filter. */
  invalid: string;
  /** Accessible name of the group of filters. */
  filterGroup: string;
  /** Counter without a limit. `{count}` = accepted addresses. */
  counter: string | PluralText;
  /** Counter with a limit ("3 of 10 places"). `{count}` = accepted addresses, `{max}` = `maxEmails`. */
  counterMax: string;
  empty: string;
  format: string;
  blockedDomain: string;
  /** `{suggestion}` = the corrected address. */
  typo: string;
  duplicate: string;
  existing: string;
  limit: string;
  /** Accessible description of the fix button, read after its visible text. `{suggestion}` */
  fix: string;
  /** Visible text of the fix button. */
  fixButton: string;
  /** Edit button. `{email}` */
  edit: string;
  /** Remove button. `{email}` */
  remove: string;
  /** Text box that replaces an address being edited. `{email}` */
  editField: string;
  /** Read by screen readers after an addition. `{valid}`, `{warning}`, `{invalid}` */
  announceAdd: string;
  /** `{email}` */
  announceRemove: string;
  /** Shown while rejected addresses stop the confirmation (`rejected: 'block'`); also the browser's validation message. */
  formHasErrors: string;
  /** Said when a confirmation stops on rejected addresses (`rejected: 'ask'`). `{count}` = rejected addresses. */
  rejectedAsk: string | PluralText;
  /** Added to `rejectedAsk` in the widget's own message: how to go on without them. */
  rejectedAgain: string | PluralText;
  /** Label for your send button while one more press goes on without the rejected addresses. */
  rejectedSkip: string;
  /** Browser validation message when the original input is `required` and nothing was added. */
  formRequired: string;
}

export type LocaleInput = string | Partial<GoldpanMessages>;

export interface GoldpanOptions {
  /** Code of a registered locale (`'en'` is built in) or a messages object. Default `'en'`. */
  locale?: LocaleInput;
  /** Replace single messages on top of the locale. */
  messages?: Partial<GoldpanMessages>;
  /** Placeholder of the text field. Defaults to the original input's placeholder, then the locale. */
  placeholder?: string;

  /** Most addresses that can be accepted (valid + warnings). `null` = no limit. Default `null`. */
  maxEmails?: number | null;
  /** Addresses beyond `maxEmails`: shown in red (`'reject'`) or not added (`'drop'`). Default `'reject'`. */
  onLimit?: 'reject' | 'drop';

  /**
   * The same address twice. `'drop'` keeps only the first one and highlights it,
   * `'warn'` keeps both in yellow (each one takes a place), `'reject'` shows the copy in red.
   * Default `'drop'`.
   */
  duplicates?: DropPolicy;
  /** Addresses that are already registered on your side (members, previous invites…). */
  existingEmails?: Iterable<string>;
  /** What to do with addresses found in `existingEmails`. Default `'warn'`. */
  existing?: IssuePolicy;

  /**
   * Domains that are always refused. Default: `Goldpan.blockedDomains`
   * (well-known misspellings and throw-away mailbox services).
   * Passing a list REPLACES the default: spread it to extend, `[]` to turn it off.
   * `*.example.com` also covers every sub-domain. Large lists and Sets are fine.
   */
  blockedDomains?: Iterable<string>;
  /**
   * Probable misspellings of popular providers (gmial.com → gmail.com), with a one-click fix.
   * `'warn'` accepts them in yellow, `'reject'` refuses them, `false` turns the check off. Default `'warn'`.
   */
  typoCheck?: IssuePolicy | false;
  /** More correct domains for the typo check (they are also never reported as typos). */
  knownDomains?: Iterable<string>;

  /** Your own rule, run after the built-in checks. */
  validate?: (email: string) => CustomValidationResult;

  /** Separator used to write the accepted addresses into the original input. Default `', '`. */
  separator?: string;
  /**
   * While rejected addresses are present, what `confirm()` (call it from your send button) and a
   * submit of the form do. `'ask'`: the first time they are shown and it stops, confirming again goes
   * on without them. `'block'`: they are shown and it stops until they are fixed. `'skip'`: it goes on
   * without them. Default `'ask'`.
   */
  rejected?: RejectedPolicy;
  /**
   * Show the message about rejected addresses inside the widget, above the list. Turn it off when you
   * show it yourself, near your send button, from the `confirm` event. Default `true`.
   */
  inlineMessage?: boolean;
  /** Rows that show the edit button. Default `'all'`. */
  editable?: 'all' | 'valid' | 'invalid' | 'none';
  /** Show the counter in the header. Default `true`. */
  showCounter?: boolean;
  /** Colour scheme; `'auto'` follows the operating system. Default `'light'`. */
  theme?: 'light' | 'dark' | 'auto';
  /** Extra class name(s) for the root element. */
  className?: string;
  /** Disable the widget. Defaults to the original input's `disabled` state. */
  disabled?: boolean;

  onChange?: (state: GoldpanState) => void;
}

export interface GoldpanCounts {
  valid: number;
  warning: number;
  invalid: number;
  /** valid + warning */
  admitted: number;
  /** Places left, or `null` without a limit. */
  remaining: number | null;
}

export interface GoldpanState {
  emails: string[];
  entries: GoldpanEntry[];
  counts: GoldpanCounts;
  hasErrors: boolean;
}

export interface GoldpanEventMap {
  /** The list changed (added, removed, edited, replaced, options changed). */
  change: GoldpanState;
  /** Entries just added, by the user or by `add()`. */
  add: { entries: GoldpanEntry[] };
  remove: { entry: GoldpanEntry };
  update: { before: GoldpanEntry; after: GoldpanEntry };
  /** Addresses that did not fit in `maxEmails`. */
  limit: { rejected: string[] };
  /** Addresses not added because they were already in the list (`duplicates: 'drop'`). */
  duplicate: { dropped: string[] };
  filter: { filter: FilterValue };
  /** A confirmation stopped on rejected addresses, or that stop changed (texts, language) or ended. */
  confirm: ConfirmStop;
}

export type GoldpanEventName = keyof GoldpanEventMap;
