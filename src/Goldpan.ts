import { classify, countEntries, type ClassifyConfig, type Item, type StaticCheck } from './classify';
import { DEFAULT_BLOCKED_DOMAINS, DEFAULT_KNOWN_DOMAINS } from './domains';
import { Emitter } from './emitter';
import { isTextField, linkField, type FieldLink, type TextField } from './field';
import { availableLocales, format, registerLocale, resolveMessages } from './i18n';
import { hasSeparator, normalizeEmail, parseEmails } from './parse';
import type {
  EntryStatus,
  FilterValue,
  GoldpanCounts,
  GoldpanEntry,
  GoldpanEventMap,
  GoldpanEventName,
  GoldpanMessages,
  GoldpanOptions,
  GoldpanState,
} from './types';
import { isValidEmailFormat } from './validate';
import { ListView, type RowAction } from './view';

type OptionalKey =
  | 'validate'
  | 'onChange'
  | 'placeholder'
  | 'className'
  | 'disabled'
  | 'messages'
  | 'existingEmails'
  | 'blockedDomains'
  | 'knownDomains';
type Settings = Required<Omit<GoldpanOptions, OptionalKey>> & Pick<GoldpanOptions, OptionalKey>;

const DEFAULTS: Settings = {
  locale: 'en',
  maxEmails: null,
  onLimit: 'reject',
  duplicates: 'drop',
  existing: 'warn',
  typoCheck: 'warn',
  separator: ', ',
  rejected: 'ask',
  inlineMessage: true,
  editable: 'all',
  showCounter: true,
  theme: 'light',
};

const instances = new WeakMap<Element, Goldpan>();
let created = 0;
/** A confirmation this soon after the one that stopped (a double click) does not go on. */
const CONFIRM_DELAY_MS = 500;
/** Key of `confirm` event payloads, to tell the page only about real changes. */
const stopKey = (state: string | null, message: string, label: string) => `${state}\u0000${message}\u0000${label}`;

/**
 * Goldpan: an email field that takes many addresses at once and sorts every one
 * of them into valid, to check (accepted, worth a look) or rejected.
 *
 * @example
 * const pan = new Goldpan('#recipients', { maxEmails: 50 });
 * pan.on('change', ({ emails }) => console.log(emails));
 */
export class Goldpan {
  /** Library version. */
  static readonly version: string = __VERSION__;
  /**
   * Default exclusion list, used by instances without a `blockedDomains` option.
   * Editable before creating instances: `Goldpan.blockedDomains.push('competitor.com')`.
   */
  static readonly blockedDomains: string[] = DEFAULT_BLOCKED_DOMAINS;
  /** Correct provider domains used by the typo check. Editable like `blockedDomains`. */
  static readonly knownDomains: string[] = DEFAULT_KNOWN_DOMAINS;
  /** Makes a translation selectable with `locale: 'xx'`. */
  static readonly registerLocale = registerLocale;
  /** Codes of the registered translations. */
  static readonly availableLocales = availableLocales;
  /** Extracts addresses from free text (separators, `Name <address>`, `mailto:`…). */
  static readonly parse = parseEmails;
  /** Checks the shape of a single address. */
  static readonly isValidFormat = isValidEmailFormat;

  /** The instance attached to an element, if any. */
  static getInstance(target: string | Element): Goldpan | undefined {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    return el ? instances.get(el) : undefined;
  }

  /** Attaches an instance to every element matching the selector, reusing existing ones. */
  static init(selector: string, options?: GoldpanOptions): Goldpan[] {
    return Array.from(document.querySelectorAll<HTMLElement>(selector), (el) => instances.get(el) ?? new Goldpan(el, options));
  }

  /** Root element of the widget. */
  readonly element: HTMLDivElement;
  /** The visible text box. */
  readonly inputElement: HTMLInputElement;

  private readonly host: HTMLElement;
  private readonly field: TextField | null;
  private readonly link: FieldLink | null;
  private readonly view: ListView;
  private readonly events = new Emitter<GoldpanEventMap>();
  private readonly teardown: Array<() => void> = [];
  /** Verdicts per address; emptied whenever the settings change. */
  private readonly checks = new Map<string, StaticCheck>();
  private readonly uid: string;
  private settings: Settings;
  private messages!: GoldpanMessages;
  private config!: ClassifyConfig;
  private items: Item[] = [];
  private entries: GoldpanEntry[] = [];
  private filter: FilterValue = 'all';
  private lastId = 0;
  private destroyed = false;
  /** A confirmation stopped on rejected addresses: `'ask'` waits for one more, `'block'` for fixes. */
  private stopped: 'ask' | 'block' | null = null;
  /** When the current stop began. */
  private stoppedAt = 0;
  /** The last `confirm` event, so that only changes are reported. */
  private lastStop = stopKey(null, '', '');

  /**
   * @param target An `<input>` or `<textarea>` (hidden and kept in sync, so plain forms keep working),
   *               any other container element, or a CSS selector.
   */
  constructor(target: string | HTMLElement, options: GoldpanOptions = {}) {
    const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    if (!el) throw new Error(`[Goldpan] Target element not found: ${String(target)}`);
    if (instances.has(el)) {
      throw new Error('[Goldpan] This element is already initialized. Use Goldpan.getInstance(el) or destroy() it first.');
    }

    this.host = el;
    this.field = isTextField(el) ? el : null;
    this.uid = `goldpan-${++created}`;
    this.settings = { ...DEFAULTS, disabled: this.field?.disabled ?? false, ...withoutUndefined(options) };
    this.view = new ListView(el.ownerDocument, this.uid, {
      action: (action, id) => this.onRowAction(action, id),
      filter: (status) => this.setFilter(this.filter === status ? 'all' : status),
    });
    this.element = this.view.root;
    this.inputElement = this.view.input;
    if (this.field) {
      this.link = linkField(this.field, this.element, this.inputElement);
    } else {
      this.link = null;
      el.append(this.element);
    }
    this.listenToTyping();
    this.listenToForm();
    instances.set(el, this);

    this.applySettings();
    // Addresses already written in the original field are the starting list.
    const initial = this.field?.value ?? '';
    if (initial.trim()) this.insert(parseEmails(initial), 0, { quiet: true });
    else this.refresh(false);
  }

  // ---------------------------------------------------------------------
  // Reading
  // ---------------------------------------------------------------------

  /** Accepted addresses (valid and to check), normalized, in list order. */
  getEmails(): string[] {
    return this.entries.filter((e) => e.status !== 'invalid').map((e) => e.email);
  }

  /** Every entry with its status and message, or only those with the given status. */
  getEntries(status?: EntryStatus): GoldpanEntry[] {
    return status ? this.entries.filter((e) => e.status === status) : this.entries.slice();
  }

  getCounts(): GoldpanCounts {
    return countEntries(this.entries, this.config.maxEmails);
  }

  /** True while at least one address is rejected. */
  hasErrors(): boolean {
    return this.entries.some((e) => e.status === 'invalid');
  }

  getState(): GoldpanState {
    return { emails: this.getEmails(), entries: this.getEntries(), counts: this.getCounts(), hasErrors: this.hasErrors() };
  }

  getOptions(): Readonly<GoldpanOptions> {
    return { ...this.settings };
  }

  getFilter(): FilterValue {
    return this.filter;
  }

  // ---------------------------------------------------------------------
  // Changing the list
  // ---------------------------------------------------------------------

  /** Adds addresses from free text or an array, read like a paste. Returns the entries created. */
  add(input: string | readonly string[]): GoldpanEntry[] {
    this.assertAlive();
    return this.insert(toTokens(input), this.items.length);
  }

  /** Replaces the whole list, with a single `change` event. Returns the entries created. */
  setValue(input: string | readonly string[]): GoldpanEntry[] {
    this.assertAlive();
    this.stop(null); // a new list has not been confirmed yet
    this.items = [];
    const created = this.insert(toTokens(input), 0, { silentChange: true });
    if (!created.length) this.refresh();
    this.emitChange();
    return created;
  }

  /** Removes an entry by id, or the first entry with that address. */
  remove(idOrEmail: string): boolean {
    this.assertAlive();
    const index = this.indexOf(idOrEmail);
    if (index < 0) return false;
    const removed = this.find(this.items[index].id)!;
    this.items.splice(index, 1);
    this.refresh();
    this.emit('remove', { entry: removed });
    this.view.say(format(this.messages.announceRemove, { email: removed.raw }));
    this.emitChange();
    return true;
  }

  /**
   * Replaces the text of an entry, keeping its place and its id. Further
   * addresses in the text go right after it; empty text removes the entry.
   */
  update(idOrEmail: string, text: string): GoldpanEntry | null {
    this.assertAlive();
    const index = this.indexOf(idOrEmail);
    if (index < 0) return null;
    const { id } = this.items[index];
    const [first, ...more] = parseEmails(text);
    if (first === undefined) {
      this.remove(id);
      return null;
    }
    const before = this.find(id)!;
    this.items[index] = { id, raw: first, email: normalizeEmail(first) };
    if (more.length) this.insert(more, index + 1, { silentChange: true });
    else this.refresh();
    const after = this.find(id)!;
    this.emit('update', { before, after });
    this.emitChange();
    return after;
  }

  /** Empties the list. */
  clear(): void {
    this.assertAlive();
    if (!this.items.length) return;
    this.items = [];
    this.refresh();
    this.emitChange();
  }

  // ---------------------------------------------------------------------
  // Settings and state
  // ---------------------------------------------------------------------

  /** Changes options at runtime (a new limit, new registered addresses…); every address is judged again. */
  setOptions(options: Partial<GoldpanOptions>): void {
    this.assertAlive();
    this.settings = { ...this.settings, ...withoutUndefined(options) };
    this.applySettings();
    this.refresh();
    this.emitChange();
  }

  /** Shows one status only (`'valid' | 'warning' | 'invalid'`) or everything (`'all'`). */
  setFilter(filter: FilterValue): void {
    this.assertAlive();
    this.filter = filter;
    this.view.showOnly(filter);
    this.emit('filter', { filter });
  }

  /**
   * Call it from the button that uses the list (send, invite, save): `true` means the accepted
   * addresses can be used now. While rejected addresses are present it follows the `rejected` option.
   * `'ask'`: the first time they are shown and it returns `false`; confirming again returns `true`.
   * `'block'`: they are shown and it returns `false` until they are fixed. `'skip'`: `true`.
   * Text still in the box is added first. The `confirm` event says what to show near your button.
   *
   * @example
   * sendButton.onclick = () => {
   *   if (pan.confirm()) send(pan.getEmails());
   * };
   */
  confirm(): boolean {
    this.assertAlive();
    this.takeTyped();
    const policy = this.settings.rejected;
    if (!this.hasErrors() || policy === 'skip') {
      this.stop(null);
      return true;
    }
    if (policy === 'ask' && this.stopped === 'ask') {
      // A double click is not an answer: the message must have been on screen for a moment.
      if (Date.now() - this.stoppedAt < CONFIRM_DELAY_MS) return false;
      this.stop(null);
      this.setFilter('all');
      return true;
    }
    this.setFilter('invalid');
    if (this.stopped !== policy) this.stoppedAt = Date.now();
    this.stop(policy);
    return false;
  }

  focus(): void {
    this.inputElement.focus();
  }

  enable(): void {
    this.setOptions({ disabled: false });
  }

  disable(): void {
    this.setOptions({ disabled: true });
  }

  /** Subscribes to an event; returns the function that unsubscribes. */
  on<K extends GoldpanEventName>(event: K, listener: (payload: GoldpanEventMap[K]) => void): () => void {
    return this.events.on(event, listener);
  }

  off<K extends GoldpanEventName>(event: K, listener: (payload: GoldpanEventMap[K]) => void): void {
    this.events.off(event, listener);
  }

  /** Removes the widget and gives the original element back, as it was. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop(null); // the page puts its send button back as it was
    for (const undo of this.teardown) undo();
    this.link?.release();
    this.view.destroy();
    instances.delete(this.host);
    this.events.clear();
  }

  // ---------------------------------------------------------------------
  // Internals: the list
  // ---------------------------------------------------------------------

  /**
   * Inserts addresses at a position, applying `duplicates: 'drop'` and `onLimit: 'drop'`.
   * `quiet`: no events at all (starting value). `silentChange`: no `change` event (the caller emits it).
   */
  private insert(tokens: string[], at: number, mode: { quiet?: boolean; silentChange?: boolean } = {}): GoldpanEntry[] {
    if (!tokens.length) return [];
    let incoming: Item[] = tokens.map((raw) => ({ id: `${this.uid}-${++this.lastId}`, raw, email: normalizeEmail(raw) }));

    const dropped: string[] = [];
    if (this.settings.duplicates === 'drop') {
      const present = new Set(this.items.map((i) => i.email));
      incoming = incoming.filter((item) => {
        if (present.has(item.email)) {
          dropped.push(item.email);
          return false;
        }
        present.add(item.email);
        return true;
      });
    }
    this.items.splice(at, 0, ...incoming);

    // Which new addresses do not fit, so that `onLimit: 'drop'` can leave them out.
    const fresh = new Set(incoming.map((i) => i.id));
    const overLimit = classify(this.items, this.config, this.checks).filter((e) => e.reason === 'limit' && fresh.has(e.id));
    if (overLimit.length && this.settings.onLimit === 'drop') {
      const out = new Set(overLimit.map((e) => e.id));
      this.items = this.items.filter((i) => !out.has(i.id));
      for (const id of out) fresh.delete(id);
    }

    this.refresh(!mode.quiet);
    const added = this.entries.filter((e) => fresh.has(e.id));
    if (mode.quiet) return added;

    if (dropped.length) {
      // Point at the address each dropped copy duplicated.
      const originals = new Set(dropped);
      this.view.highlight(this.entries.filter((e) => originals.delete(e.email)).map((e) => e.id));
      this.emit('duplicate', { dropped });
    }
    if (overLimit.length) this.emit('limit', { rejected: overLimit.map((e) => e.email) });
    if (added.length) this.emit('add', { entries: added });

    const said: string[] = [];
    if (added.length) {
      const c = countEntries(added, null);
      said.push(format(this.messages.announceAdd, { valid: c.valid, warning: c.warning, invalid: c.invalid }));
    }
    if (dropped.length) said.push(`${dropped.join(', ')}: ${this.messages.duplicate}`);
    if (said.length) this.view.say(said.join(' '));

    if (added.length && !mode.silentChange) this.emitChange();
    return added;
  }

  private indexOf(idOrEmail: string): number {
    const byId = this.items.findIndex((i) => i.id === idOrEmail);
    if (byId >= 0) return byId;
    const email = normalizeEmail(idOrEmail);
    return this.items.findIndex((i) => i.email === email);
  }

  private find(id: string): GoldpanEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  /** Judges every address again, draws the list and writes the accepted addresses into the field. */
  private refresh(notifyField = true): void {
    this.entries = classify(this.items, this.config, this.checks);
    this.draw();
    this.syncField(notifyField);
    // A stopped confirmation follows the list: its message counts what is left, it ends when nothing is.
    if (this.stopped) this.stop(this.hasErrors() && this.stopped === this.settings.rejected ? this.stopped : null);
  }

  private draw(): void {
    const counts = this.getCounts();
    // A filter on a status that just emptied would show nothing at all.
    if (this.filter !== 'all' && counts[this.filter] === 0) this.filter = 'all';
    const { editable, disabled } = this.settings;
    this.view.render({
      entries: this.entries,
      counts,
      max: this.config.maxEmails,
      filter: this.filter,
      disabled: !!disabled,
      canEdit: (entry) =>
        editable === 'all' ||
        (editable === 'valid' && entry.status !== 'invalid') ||
        (editable === 'invalid' && entry.status === 'invalid'),
    });
  }

  private applySettings(): void {
    const s = this.settings;
    if (s.maxEmails !== null && !(Number.isFinite(s.maxEmails) && s.maxEmails >= 0)) {
      throw new Error('[Goldpan] maxEmails must be a number ≥ 0, or null.');
    }
    const m = (this.messages = resolveMessages(s.locale, s.messages));
    const known = new Set(DEFAULT_KNOWN_DOMAINS);
    for (const domain of s.knownDomains ?? []) known.add(String(domain).trim().toLowerCase());
    this.config = {
      maxEmails: s.maxEmails === null ? null : Math.floor(s.maxEmails),
      duplicates: s.duplicates,
      existing: s.existing,
      existingSet: new Set(Array.from(s.existingEmails ?? [], (e) => normalizeEmail(String(e)))),
      blockedSet: new Set(Array.from(s.blockedDomains ?? DEFAULT_BLOCKED_DOMAINS, (d) => String(d).trim().toLowerCase())),
      typoCheck: s.typoCheck,
      knownSet: known,
      validate: s.validate,
      messages: m,
    };
    this.checks.clear();

    this.view.setLook({ theme: s.theme, disabled: !!s.disabled, className: s.className, showCounter: s.showCounter });
    this.view.setTexts({
      messages: m,
      placeholder: s.placeholder ?? (this.field?.getAttribute('placeholder') || m.placeholder),
      inputName: this.link?.labelled ? null : this.link?.name || m.inputLabel,
      listName: this.link?.name || m.inputLabel,
    });
  }

  // ---------------------------------------------------------------------
  // Internals: interaction
  // ---------------------------------------------------------------------

  private listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, handler, options);
    this.teardown.push(() => target.removeEventListener(type, handler, options));
  }

  private listenToTyping(): void {
    const input = this.inputElement;
    this.listen(input, 'keydown', (event) => {
      if (event.isComposing || event.keyCode === 229) return; // an input method is still composing
      if (event.key === 'Enter') {
        if (!input.value.trim()) return; // empty box: Enter submits the form as usual
        event.preventDefault();
        this.takeTyped();
      } else if (event.key === 'Escape' && input.value) {
        event.preventDefault();
        input.value = '';
      }
    });
    this.listen(input, 'input', (event) => {
      if (!(event as InputEvent).isComposing && hasSeparator(input.value)) this.takeTyped();
    });
    // Android keyboards and input methods deliver words through composition.
    this.listen(input, 'compositionend', () => {
      if (hasSeparator(input.value)) this.takeTyped();
    });
    this.listen(input, 'paste', (event) => {
      const text = event.clipboardData?.getData('text');
      if (!text) return;
      event.preventDefault();
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      input.value = input.value.slice(0, start) + text + input.value.slice(end);
      this.takeTyped();
    });
    this.listen(input, 'blur', () => {
      if (input.value.trim()) this.takeTyped();
    });
  }

  /** Native validation, `form.reset()` and submits while rejected addresses are present. */
  private listenToForm(): void {
    // The browser found the field invalid (a submit, reportValidity()): show the rejected addresses.
    this.listen(this.inputElement, 'invalid', () => {
      if (!this.hasErrors()) return;
      this.setFilter('invalid');
      if (this.settings.rejected === 'block') this.stop('block');
    });
    const form = this.field?.form;
    if (!form) return;
    // A submit is a confirmation: with rejected addresses it may stop (option `rejected`).
    // Capturing on the form itself runs first, so the page's own submit handlers stop too.
    this.listen(
      form,
      'submit',
      (event) => {
        if (this.settings.disabled || this.confirm()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true },
    );
    // `form.reset()` puts the original field back to its initial value: follow it.
    this.listen(form, 'reset', () =>
      // The reset event fires before the fields are reset.
      setTimeout(() => {
        if (this.destroyed) return;
        this.stop(null);
        this.items = [];
        this.filter = 'all';
        const initial = this.field!.value;
        if (initial.trim()) this.insert(parseEmails(initial), 0, { quiet: true });
        else this.refresh(false);
        this.emitChange();
      }),
    );
  }

  /** Sets where a confirmation stands, shows it in the widget and tells the page (event `confirm`). */
  private stop(state: 'ask' | 'block' | null): void {
    this.stopped = state;
    const m = this.messages;
    const count = this.getCounts().invalid;
    const message = state === 'ask' ? format(m.rejectedAsk, { count }, m.lang) : state === 'block' ? m.formHasErrors : '';
    const label = state === 'ask' ? m.rejectedSkip : '';
    const hint = state === 'ask' ? ` ${format(m.rejectedAgain, { count }, m.lang)}` : '';
    this.view.setNotice(this.settings.inlineMessage && message ? message + hint : '');
    const key = stopKey(state, message, label);
    if (key === this.lastStop) return;
    this.lastStop = key;
    this.emit('confirm', { state, message, label });
  }

  private takeTyped(): void {
    const text = this.inputElement.value;
    this.inputElement.value = '';
    if (text.trim()) this.add(text);
  }

  private onRowAction(action: RowAction, id: string): void {
    if (this.settings.disabled) return;
    if (action === 'remove') {
      this.removeAndRefocus(id);
    } else if (action === 'edit') {
      const entry = this.find(id);
      if (entry) this.view.beginEdit(id, entry.raw, (value, byKeyboard) => this.endEdit(id, value, byKeyboard));
    } else {
      const suggestion = this.find(id)?.suggestion;
      if (suggestion) {
        this.update(id, suggestion);
        this.view.focusRow(id, 'edit');
      }
    }
  }

  private endEdit(id: string, value: string | null, byKeyboard: boolean): void {
    const entry = this.find(id);
    if (!entry) return;
    if (value === '') {
      this.removeAndRefocus(id, byKeyboard);
      return;
    }
    if (value === null || value === entry.raw) this.draw();
    else this.update(id, value);
    // After a click elsewhere, focus stays where the person clicked.
    if (byKeyboard) this.view.focusRow(id, 'edit');
  }

  /** Removes an entry and keeps keyboard focus nearby: next row, else previous row, else the text box. */
  private removeAndRefocus(id: string, refocus = true): void {
    const next = this.view.neighbourOf(id);
    this.remove(id);
    if (!refocus) return;
    if (next && this.find(next)) this.view.focusRow(next, 'remove');
    else this.inputElement.focus();
  }

  // ---------------------------------------------------------------------
  // Internals: the original field and the events
  // ---------------------------------------------------------------------

  private syncField(notify: boolean): void {
    const emails = this.getEmails();
    const field = this.field;
    if (field) {
      const value = emails.join(this.settings.separator);
      if (field.value !== value) {
        field.value = value;
        if (notify) {
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
    const errors = this.hasErrors();
    let problem = '';
    if (errors && this.settings.rejected === 'block') problem = this.messages.formHasErrors;
    else if (this.link?.required && emails.length === 0) problem = this.messages.formRequired;
    this.view.setValidity(problem, errors);
  }

  private emit<K extends GoldpanEventName>(event: K, payload: GoldpanEventMap[K]): void {
    this.events.emit(event, payload);
    this.host.dispatchEvent(new CustomEvent(`goldpan:${event}`, { detail: payload, bubbles: true }));
  }

  private emitChange(): void {
    const state = this.getState();
    this.emit('change', state);
    try {
      this.settings.onChange?.(state);
    } catch (error) {
      console.error('[Goldpan] onChange failed:', error);
    }
  }

  private assertAlive(): void {
    if (this.destroyed) throw new Error('[Goldpan] This instance has been destroyed.');
  }
}

declare const __VERSION__: string;

function toTokens(input: string | readonly string[]): string[] {
  return typeof input === 'string' ? parseEmails(input) : input.flatMap((s) => parseEmails(String(s)));
}

/** Drops keys set to `undefined`, so that they do not override the defaults. */
function withoutUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>;
}
