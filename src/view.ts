import { format } from './i18n';
import { icon } from './icons';
import type { EntryStatus, FilterValue, GoldpanCounts, GoldpanEntry, GoldpanMessages } from './types';

export type RowAction = 'fix' | 'edit' | 'remove';

/** Everything the view needs to draw the list once. */
export interface Scene {
  entries: readonly GoldpanEntry[];
  counts: GoldpanCounts;
  /** The limit of accepted addresses, `null` without one. */
  max: number | null;
  filter: FilterValue;
  disabled: boolean;
  canEdit(entry: GoldpanEntry): boolean;
}

export interface Texts {
  messages: GoldpanMessages;
  placeholder: string;
  /** Accessible name of the text box; `null` when a label already names it. */
  inputName: string | null;
  listName: string;
}

export interface Look {
  theme: 'light' | 'dark' | 'auto';
  disabled: boolean;
  className?: string;
  showCounter: boolean;
}

/** What the user asked for, passed back to the owner of the view. */
export interface Intents {
  action(action: RowAction, id: string): void;
  filter(status: EntryStatus): void;
}

/** DOM of one row, kept between renders. */
interface Row {
  li: HTMLLIElement;
  mark: HTMLSpanElement;
  address: HTMLSpanElement;
  note: HTMLSpanElement;
  tools: HTMLSpanElement;
  /** Status whose icon is drawn. */
  marked: EntryStatus | null;
  /** Everything shown in the row: when unchanged, the row is not touched. */
  drawn: string;
  /** What the buttons depend on: they are rebuilt only when it changes, so focus is not lost. */
  tooling: string;
}

interface FilterButton {
  button: HTMLButtonElement;
  name: HTMLSpanElement;
  count: HTMLSpanElement;
}

const STATUSES: readonly EntryStatus[] = ['valid', 'warning', 'invalid'];
/** How long a row stays highlighted after a copy of it was dropped. */
const HIGHLIGHT_MS = 1200;

/** Draws a Goldpan widget. It holds no data of its own: every render receives a full scene. */
export class ListView {
  readonly root: HTMLDivElement;
  readonly input: HTMLInputElement;

  private readonly doc: Document;
  private readonly intents: Intents;
  private readonly tally: HTMLSpanElement;
  private readonly filterGroup: HTMLDivElement;
  private readonly filters = {} as Record<EntryStatus, FilterButton>;
  private readonly list: HTMLUListElement;
  private readonly notice: HTMLParagraphElement;
  private readonly noticeText: HTMLSpanElement;
  private readonly empty: HTMLParagraphElement;
  private readonly live: HTMLDivElement;
  private readonly rows = new Map<string, Row>();
  private readonly highlighted = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly teardown: Array<() => void> = [];
  private messages!: GoldpanMessages;
  private customClasses: string[] = [];
  private editing: string | null = null;
  private sayTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(doc: Document, id: string, intents: Intents) {
    this.doc = doc;
    this.intents = intents;

    const root = (this.root = this.make('div', 'goldpan'));
    root.id = id;
    this.list = this.make('ul', 'goldpan__list');
    this.list.id = `${id}-list`;

    // Head: the counter on the left, one filter per status on the right
    const head = this.make('div', 'goldpan__head');
    this.tally = this.make('span', 'goldpan__tally');
    this.tally.id = `${id}-tally`;
    this.filterGroup = this.make('div', 'goldpan__filters');
    this.filterGroup.setAttribute('role', 'group');
    for (const status of STATUSES) {
      const button = this.make('button', `goldpan__filter goldpan__filter--${status}`);
      button.type = 'button';
      button.dataset.status = status;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-controls', this.list.id);
      const name = this.make('span', 'goldpan__filter-name');
      const count = this.make('span', 'goldpan__filter-count');
      button.append(icon(doc, status), name, count);
      this.filterGroup.append(button);
      this.filters[status] = { button, name, count };
    }
    head.append(this.tally, this.filterGroup);

    // Text box, below the head; the addresses follow, one card each
    const input = (this.input = this.make('input', 'goldpan__input'));
    input.type = 'text';
    input.id = `${id}-input`;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('inputmode', 'email');
    input.setAttribute('enterkeyhint', 'enter');
    input.setAttribute('aria-describedby', this.tally.id);
    input.setAttribute('aria-controls', this.list.id);

    // Message about the rejected addresses after a confirmation, between the text box and the cards
    this.notice = this.make('p', 'goldpan__notice');
    this.notice.hidden = true;
    this.noticeText = this.make('span', 'goldpan__notice-text');
    this.notice.append(icon(doc, 'invalid'), this.noticeText);

    this.empty = this.make('p', 'goldpan__empty');
    this.live = this.make('div', 'goldpan__sr-only');
    this.live.setAttribute('role', 'status');
    this.live.setAttribute('aria-live', 'polite');

    root.append(head, input, this.notice, this.list, this.empty, this.live);

    this.listen(this.filterGroup, 'click', (event) => {
      const button = (event.target as Element).closest<HTMLElement>('.goldpan__filter');
      if (button) this.intents.filter(button.dataset.status as EntryStatus);
    });
    this.listen(this.list, 'click', (event) => {
      const button = (event.target as Element).closest<HTMLElement>('.goldpan__tool');
      const id = button?.closest<HTMLElement>('.goldpan__row')?.dataset.id;
      if (button && id) this.intents.action(button.dataset.action as RowAction, id);
    });
    // The browser reports the field as invalid on submit: show it from then on.
    this.listen(input, 'invalid', () => root.classList.add('goldpan--show-validity'));
  }

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------

  setLook(look: Look): void {
    const { classList } = this.root;
    classList.remove(...this.customClasses);
    this.customClasses = (look.className ?? '').split(/\s+/).filter(Boolean);
    classList.add(...this.customClasses);
    classList.toggle('goldpan--disabled', look.disabled);
    this.root.dataset.theme = look.theme;
    this.input.disabled = look.disabled;
    this.tally.hidden = !look.showCounter;
  }

  setTexts(texts: Texts): void {
    const m = (this.messages = texts.messages);
    this.input.placeholder = texts.placeholder;
    if (texts.inputName === null) this.input.removeAttribute('aria-label');
    else this.input.setAttribute('aria-label', texts.inputName);
    this.list.setAttribute('aria-label', texts.listName);
    this.filterGroup.setAttribute('aria-label', m.filterGroup);
    for (const status of STATUSES) this.filters[status].name.textContent = m[status];
    this.empty.textContent = m.empty;
    // Every label may have changed.
    for (const row of this.rows.values()) row.drawn = row.tooling = '';
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  render(scene: Scene): void {
    const focused = deepActiveElement(this.doc);

    // Rows whose entry is gone leave first: the ones that stay are then already in order.
    const present = new Set(scene.entries.map((e) => e.id));
    for (const [id, row] of this.rows) {
      if (present.has(id)) continue;
      row.li.remove();
      this.rows.delete(id);
    }

    // One pass with a cursor on the DOM, never indexing the live list of children
    // (that would make long lists quadratic): a row moves only when out of place.
    let cursor = this.list.firstElementChild;
    for (const entry of scene.entries) {
      let row = this.rows.get(entry.id);
      if (!row) this.rows.set(entry.id, (row = this.buildRow(entry.id)));
      this.paint(row, entry, scene, focused);
      if (row.li === cursor) cursor = cursor.nextElementSibling;
      else this.list.insertBefore(row.li, cursor);
    }

    const { counts } = scene;
    const m = this.messages;
    for (const status of STATUSES) {
      const { button, count } = this.filters[status];
      count.textContent = String(counts[status]);
      // An empty category cannot be shown on its own.
      button.disabled = scene.disabled || counts[status] === 0;
    }
    this.tally.textContent =
      scene.max === null
        ? format(m.counter, { count: counts.admitted }, m.lang)
        : format(m.counterMax, { count: counts.admitted, max: scene.max }, m.lang);
    this.tally.classList.toggle('goldpan__tally--full', counts.remaining === 0);
    this.empty.hidden = scene.entries.length > 0;
    this.root.classList.toggle('goldpan--has-errors', counts.invalid > 0);
    this.showOnly(scene.filter);
  }

  /** Shows the rows of one status, or all of them. */
  showOnly(filter: FilterValue): void {
    for (const row of this.rows.values()) {
      const hide = filter !== 'all' && row.li.dataset.status !== filter;
      if (row.li.hidden !== hide) row.li.hidden = hide;
    }
    for (const status of STATUSES) this.filters[status].button.setAttribute('aria-pressed', String(filter === status));
  }

  private paint(row: Row, entry: GoldpanEntry, scene: Scene, focused: Element | null): void {
    const editing = this.editing === entry.id;
    const lit = this.highlighted.has(entry.id);
    const editable = scene.canEdit(entry);
    const drawn = [entry.status, entry.reason, entry.message, entry.suggestion, entry.raw, editing, lit, editable, scene.disabled].join('\u0000');
    if (drawn === row.drawn) return;
    row.drawn = drawn;

    const { li } = row;
    li.dataset.status = entry.status;
    if (entry.reason) li.dataset.reason = entry.reason;
    else delete li.dataset.reason;
    li.classList.toggle('goldpan__row--editing', editing);
    li.classList.toggle('goldpan__row--highlight', lit);

    if (row.marked !== entry.status) {
      row.mark.replaceChildren(icon(this.doc, entry.status));
      row.marked = entry.status;
    }
    if (!editing) {
      row.address.textContent = entry.raw;
      row.address.title = entry.raw;
    }
    row.note.textContent = entry.message;
    row.note.hidden = !entry.message;

    const tooling = [entry.suggestion, entry.raw, editable, scene.disabled].join('\u0000');
    if (tooling === row.tooling) return;
    row.tooling = tooling;
    const m = this.messages;
    const hadFocus = focused && row.tools.contains(focused) ? (focused as HTMLElement).dataset.action : undefined;
    const buttons: HTMLButtonElement[] = [];
    if (entry.suggestion) buttons.push(this.tool('fix', format(m.fix, { suggestion: entry.suggestion }), m.fixButton, scene.disabled));
    if (editable) buttons.push(this.tool('edit', format(m.edit, { email: entry.raw }), null, scene.disabled));
    buttons.push(this.tool('remove', format(m.remove, { email: entry.raw }), null, scene.disabled));
    row.tools.replaceChildren(...buttons);
    if (hadFocus) row.tools.querySelector<HTMLButtonElement>(`[data-action="${hadFocus}"]`)?.focus();
  }

  private buildRow(id: string): Row {
    const li = this.make('li', 'goldpan__row');
    li.dataset.id = id;
    const mark = this.make('span', 'goldpan__mark');
    const text = this.make('span', 'goldpan__text');
    const address = this.make('span', 'goldpan__address');
    const note = this.make('span', 'goldpan__note');
    const tools = this.make('span', 'goldpan__tools');
    text.append(address, note);
    li.append(mark, text, tools);
    return { li, mark, address, note, tools, marked: null, drawn: '', tooling: '' };
  }

  private tool(action: RowAction, description: string, text: string | null, disabled: boolean): HTMLButtonElement {
    const button = this.make('button', `goldpan__tool goldpan__tool--${action}`);
    button.type = 'button';
    button.dataset.action = action;
    button.disabled = disabled;
    button.title = description;
    button.append(icon(this.doc, action));
    if (text) {
      // Visible text first, so that the accessible name starts with what is on screen
      // ("Fix, use ada@gmail.com"): people using speech control can say what they see.
      const visible = this.make('span', 'goldpan__tool-text');
      visible.textContent = text;
      const extra = this.make('span', 'goldpan__sr-only');
      extra.textContent = `, ${description}`;
      button.append(visible, extra);
    } else {
      button.setAttribute('aria-label', description);
    }
    return button;
  }

  // ---------------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------------

  /** Points for a moment at rows that a dropped copy duplicated. */
  highlight(ids: readonly string[]): void {
    for (const id of ids) {
      const row = this.rows.get(id);
      if (!row) continue;
      clearTimeout(this.highlighted.get(id));
      row.li.classList.add('goldpan__row--highlight');
      this.highlighted.set(
        id,
        setTimeout(() => {
          this.highlighted.delete(id);
          this.rows.get(id)?.li.classList.remove('goldpan__row--highlight');
        }, HIGHLIGHT_MS),
      );
    }
  }

  /** Reads a short message to screen-reader users. */
  say(text: string): void {
    // Emptying the region first makes screen readers repeat an identical message.
    this.live.textContent = '';
    clearTimeout(this.sayTimer);
    this.sayTimer = setTimeout(() => (this.live.textContent = text), 50);
  }

  /** Shows the message about the rejected addresses (empty text hides it); a new text is also read aloud. */
  setNotice(text: string): void {
    if (text === this.noticeText.textContent && !this.notice.hidden === !!text) return;
    this.noticeText.textContent = text;
    this.notice.hidden = !text;
    if (text) this.say(text);
  }

  /** Native form validation goes through the visible text box. */
  setValidity(message: string, invalid: boolean): void {
    this.input.setCustomValidity(message);
    if (!message) this.root.classList.remove('goldpan--show-validity');
    if (invalid) this.input.setAttribute('aria-invalid', 'true');
    else this.input.removeAttribute('aria-invalid');
  }

  // ---------------------------------------------------------------------
  // Editing and focus
  // ---------------------------------------------------------------------

  /**
   * Turns the address of a row into a text box. `done` receives the new text,
   * or `null` when the edit is cancelled, and whether the keyboard ended it.
   */
  beginEdit(id: string, raw: string, done: (value: string | null, byKeyboard: boolean) => void): void {
    const row = this.rows.get(id);
    if (!row) return;
    this.editing = id;
    row.li.classList.add('goldpan__row--editing');

    const box = this.make('input', 'goldpan__edit');
    box.type = 'text';
    box.value = raw;
    box.spellcheck = false;
    box.setAttribute('inputmode', 'email');
    box.setAttribute('aria-label', format(this.messages.editField, { email: raw }));
    row.address.replaceChildren(box);

    let over = false;
    const finish = (value: string | null, byKeyboard: boolean) => {
      if (over) return;
      over = true;
      this.editing = null;
      row.drawn = '';
      done(value, byKeyboard);
    };
    box.addEventListener('keydown', (event) => {
      if (event.isComposing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(box.value.trim(), true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(null, true);
      }
    });
    box.addEventListener('blur', () => finish(box.value.trim(), false));
    box.focus();
    box.select();
  }

  focusRow(id: string, action: RowAction): void {
    const tools = this.rows.get(id)?.tools;
    const button =
      tools?.querySelector<HTMLButtonElement>(`[data-action="${action}"]`) ??
      tools?.querySelector<HTMLButtonElement>('[data-action]');
    (button ?? this.input).focus();
  }

  /** The visible row after this one, or else before it: where focus goes after a removal. */
  neighbourOf(id: string): string | null {
    const li = this.rows.get(id)?.li;
    const visible = (el: Element | null | undefined, step: 'nextElementSibling' | 'previousElementSibling') => {
      while (el && (el as HTMLElement).hidden) el = el[step];
      return el as HTMLElement | null | undefined;
    };
    const near = visible(li?.nextElementSibling, 'nextElementSibling') ?? visible(li?.previousElementSibling, 'previousElementSibling');
    return near?.dataset.id ?? null;
  }

  destroy(): void {
    for (const undo of this.teardown) undo();
    for (const timer of this.highlighted.values()) clearTimeout(timer);
    clearTimeout(this.sayTimer);
    this.root.remove();
  }

  // ---------------------------------------------------------------------

  private make<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
    const el = this.doc.createElement(tag);
    el.className = className;
    return el;
  }

  private listen<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, handler: (event: HTMLElementEventMap[K]) => void): void {
    target.addEventListener(type, handler);
    this.teardown.push(() => target.removeEventListener(type, handler));
  }
}

/** The focused element, looking inside shadow roots. */
function deepActiveElement(doc: Document): Element | null {
  let el = doc.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el;
}
