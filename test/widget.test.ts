// @vitest-environment jsdom
import { Goldpan, type ConfirmStop } from '../src/index';
import it_ from '../src/locales/it';

function setup(html = '<form><label for="to">To</label><input id="to" name="to" placeholder="Recipients"></form>') {
  document.body.innerHTML = html;
  return document.querySelector<HTMLInputElement>('input')!;
}

function type(pan: Goldpan, text: string) {
  const input = pan.inputElement;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function press(el: HTMLElement, key: string) {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(e);
  return e;
}

const rows = (pan: Goldpan) => [...pan.element.querySelectorAll<HTMLLIElement>('.goldpan__row')];

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('Goldpan widget', () => {
  it('replaces the input, moves the label to it and copies the placeholder', () => {
    const field = setup();
    const pan = new Goldpan(field);
    expect(field.hidden).toBe(true);
    expect(field.nextElementSibling).toBe(pan.element);
    expect(document.querySelector('label')!.htmlFor).toBe(pan.inputElement.id);
    expect(pan.inputElement.hasAttribute('aria-label')).toBe(false);
    expect(pan.inputElement.placeholder).toBe('Recipients');
  });

  it('keeps the name of a field wrapped in its label, or given by aria-label', () => {
    setup('<form><label>Invite <input name="to"></label></form>');
    const wrapped = new Goldpan('input');
    expect(wrapped.inputElement.getAttribute('aria-label')).toBe('Invite');
    expect(document.querySelector('label')!.contains(wrapped.element)).toBe(false);

    setup('<input aria-label="Guests">');
    expect(new Goldpan('input').inputElement.getAttribute('aria-label')).toBe('Guests');
  });

  it('accepts a CSS selector and refuses a second instance on the same element', () => {
    setup();
    const pan = new Goldpan('#to');
    expect(() => new Goldpan('#to')).toThrow(/already initialized/);
    expect(Goldpan.getInstance('#to')).toBe(pan);
  });

  it('adds addresses when a separator is typed and on Enter', () => {
    const pan = new Goldpan(setup());
    type(pan, 'a@x.com,');
    expect(pan.getEmails()).toEqual(['a@x.com']);
    pan.inputElement.value = 'b@x.com';
    expect(press(pan.inputElement, 'Enter').defaultPrevented).toBe(true);
    expect(pan.getEmails()).toEqual(['a@x.com', 'b@x.com']);
  });

  it('commits text completed through an input method', () => {
    const pan = new Goldpan(setup());
    pan.inputElement.value = 'a@x.com ';
    pan.inputElement.dispatchEvent(new Event('compositionend'));
    expect(pan.getEmails()).toEqual(['a@x.com']);
  });

  it('lets Enter submit the form when the field is empty', () => {
    const pan = new Goldpan(setup());
    expect(press(pan.inputElement, 'Enter').defaultPrevented).toBe(false);
  });

  it('never traps Tab, and commits the text on blur', () => {
    const pan = new Goldpan(setup());
    pan.inputElement.value = 'c@x.com';
    expect(press(pan.inputElement, 'Tab').defaultPrevented).toBe(false);
    pan.inputElement.dispatchEvent(new FocusEvent('blur'));
    expect(pan.getEmails()).toEqual(['c@x.com']);
  });

  it('shows pasted markup as plain text', () => {
    const pan = new Goldpan(setup());
    pan.add(['"><img src=x onerror=alert(1)>', 'a&b"c\'d@x.com', '<svg/onload=alert(1)>@x.com']);
    expect(pan.element.querySelector('.goldpan__list img, .goldpan__list svg:not(.goldpan__svg)')).toBeNull();
    const shown = [...pan.element.querySelectorAll('.goldpan__address')].map((el) => el.textContent);
    expect(shown).toEqual(pan.getEntries().map((e) => e.raw));
    expect(pan.getEntries().every((e) => e.status === 'invalid')).toBe(true);
  });

  it('keeps the original input in sync, so a plain form sends the addresses', () => {
    const field = setup();
    const pan = new Goldpan(field, { separator: ';' });
    const changes: string[] = [];
    field.addEventListener('change', () => changes.push(field.value));
    pan.add('a@x.com b@x.com not-an-email');
    expect(field.value).toBe('a@x.com;b@x.com');
    expect(new FormData(field.form!).get('to')).toBe('a@x.com;b@x.com');
    expect(changes).toEqual(['a@x.com;b@x.com']);
  });

  it('starts from the value already in the original input', () => {
    const field = setup('<input value="Ada <a@x.com>, b@x.com">');
    expect(new Goldpan(field).getEmails()).toEqual(['a@x.com', 'b@x.com']);
  });

  it('flags red addresses; with `rejected: \'block\'` they also make the form invalid', () => {
    const pan = new Goldpan(setup());
    pan.add('ok@x.com');
    expect(pan.inputElement.hasAttribute('aria-invalid')).toBe(false);
    pan.add('broken');
    expect(pan.inputElement.getAttribute('aria-invalid')).toBe('true');
    expect(pan.inputElement.validity.valid).toBe(true); // 'ask' (default) asks on submit instead
    pan.setOptions({ rejected: 'block' });
    expect(pan.inputElement.validity.valid).toBe(false);
    expect(pan.inputElement.validationMessage).toBe('Some addresses are rejected: fix or remove them.');
    pan.remove('broken');
    expect(pan.inputElement.validity.valid).toBe(true);
    expect(pan.inputElement.hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows the rejected addresses when the browser finds the field invalid', () => {
    const field = setup();
    const pan = new Goldpan(field, { rejected: 'block' });
    pan.add('a@x.com broken');
    expect(field.form!.reportValidity()).toBe(false);
    expect(pan.getFilter()).toBe('invalid');
  });

  it('honours `required` on the original input', () => {
    const field = setup('<form><input id="to" required></form>');
    const pan = new Goldpan(field);
    expect(field.required).toBe(false);
    expect(pan.inputElement.getAttribute('aria-required')).toBe('true');
    expect(pan.inputElement.validity.valid).toBe(false);
    pan.add('a@x.com');
    expect(pan.inputElement.validity.valid).toBe(true);
    pan.destroy();
    expect(field.required).toBe(true);
  });

  it('follows a form reset back to the initial value', async () => {
    const field = setup('<form><input id="to" value="first@x.com"></form>');
    const pan = new Goldpan(field);
    pan.add('second@x.com');
    field.form!.reset();
    await new Promise((r) => setTimeout(r, 0));
    expect(pan.getEmails()).toEqual(['first@x.com']);
    expect(field.value).toBe('first@x.com');
  });

  it('counts, filters and disables empty categories', () => {
    const pan = new Goldpan(setup(), { maxEmails: 3, duplicates: 'warn' });
    pan.add('a@x.com a@x.com bad c@x.com d@x.com');
    expect(pan.getCounts()).toEqual({ valid: 2, warning: 1, invalid: 2, admitted: 3, remaining: 0 });
    const filter = (s: string) => pan.element.querySelector<HTMLButtonElement>(`.goldpan__filter--${s}`)!;
    expect(filter('invalid').textContent).toContain('2');
    expect(pan.element.querySelector('.goldpan__tally')!.textContent).toBe('3 of 3 places');

    filter('invalid').click();
    expect(pan.getFilter()).toBe('invalid');
    expect(filter('invalid').getAttribute('aria-pressed')).toBe('true');
    expect(rows(pan).filter((li) => !li.hidden)).toHaveLength(2);
    filter('invalid').click();
    expect(pan.getFilter()).toBe('all');
    pan.clear();
    expect(filter('valid').disabled).toBe(true);
  });

  it('rounds a fractional limit down everywhere', () => {
    const pan = new Goldpan(setup(), { maxEmails: 2.7 });
    pan.add('a@x.com b@x.com c@x.com');
    expect(pan.getCounts()).toMatchObject({ admitted: 2, remaining: 0 });
    expect(pan.element.querySelector('.goldpan__tally')!.textContent).toBe('2 of 2 places');
    expect(pan.element.querySelector('.goldpan__tally')!.classList.contains('goldpan__tally--full')).toBe(true);
  });

  it('puts the counter and the filters above the text box, then one card per address', () => {
    const pan = new Goldpan(setup());
    pan.add('a@x.com bad');
    const parts = [...pan.element.children].map((el) => el.className);
    expect(parts.slice(0, 4)).toEqual(['goldpan__head', 'goldpan__input', 'goldpan__notice', 'goldpan__list']);
    const head = pan.element.querySelector('.goldpan__head')!;
    expect([...head.children].map((el) => el.className)).toEqual(['goldpan__tally', 'goldpan__filters']);
    expect(pan.element.querySelectorAll('.goldpan__list > .goldpan__row')).toHaveLength(2);
  });

  it('writes the counter with the right plural form', () => {
    const pan = new Goldpan(setup());
    const counter = () => pan.element.querySelector('.goldpan__tally')!.textContent;
    pan.add('a@x.com');
    expect(counter()).toBe('1 address');
    pan.add('b@x.com');
    expect(counter()).toBe('2 addresses');
    Goldpan.registerLocale('it', it_);
    pan.setOptions({ locale: 'it' });
    expect(counter()).toBe('2 indirizzi');
  });

  it('drops a pasted duplicate by default and highlights the original', () => {
    vi.useFakeTimers();
    const pan = new Goldpan(setup());
    const dropped = vi.fn();
    pan.on('duplicate', dropped);
    pan.add('a@x.com b@x.com');
    pan.add('B@x.com c@x.com');
    expect(pan.getEmails()).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
    expect(dropped).toHaveBeenCalledWith({ dropped: ['b@x.com'] });
    expect(rows(pan)[1].classList.contains('goldpan__row--highlight')).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(rows(pan)[1].classList.contains('goldpan__row--highlight')).toBe(false);
  });

  it('flags a duplicate created by an edit instead of dropping it', () => {
    const pan = new Goldpan(setup());
    pan.add('a@x.com b@x.com');
    pan.update('b@x.com', 'a@x.com');
    expect(pan.getEntries().map((e) => `${e.status}:${e.reason ?? ''}`)).toEqual(['valid:', 'warning:duplicate']);
  });

  it('removing an accepted address lets the first one beyond the limit in', () => {
    const pan = new Goldpan(setup(), { maxEmails: 2 });
    pan.add('a@x.com b@x.com c@x.com');
    expect(pan.getEntries().map((e) => e.status)).toEqual(['valid', 'valid', 'invalid']);
    pan.element.querySelector<HTMLButtonElement>('.goldpan__row [data-action="remove"]')!.click();
    expect(pan.getEmails()).toEqual(['b@x.com', 'c@x.com']);
  });

  it('onLimit: drop leaves out what does not fit and emits "limit"', () => {
    const pan = new Goldpan(setup(), { maxEmails: 1, onLimit: 'drop' });
    const limit = vi.fn();
    pan.on('limit', limit);
    pan.add('a@x.com b@x.com');
    expect(pan.getEntries()).toHaveLength(1);
    expect(limit).toHaveBeenCalledWith({ rejected: ['b@x.com'] });
  });

  it('setValue() replaces the list with a single change event', () => {
    const pan = new Goldpan(setup());
    pan.add('a@x.com');
    const change = vi.fn();
    pan.on('change', change);
    pan.setValue(['b@x.com', 'c@x.com']);
    expect(pan.getEmails()).toEqual(['b@x.com', 'c@x.com']);
    expect(change).toHaveBeenCalledTimes(1);
    pan.setValue('');
    expect(pan.getEmails()).toEqual([]);
  });

  it('typo: one-click fix', () => {
    const pan = new Goldpan(setup());
    pan.add('ada@example.com');
    pan.add('grace@outlookk.com');
    expect(pan.getEntries()[1]).toMatchObject({ status: 'warning', reason: 'typo', suggestion: 'grace@outlook.com' });
    const fix = pan.element.querySelectorAll<HTMLButtonElement>('[data-action="fix"]');
    expect(fix).toHaveLength(1);
    expect(fix[0].querySelector('.goldpan__tool-text')!.textContent).toBe('Fix');
    // the accessible name starts with the visible text (WCAG 2.5.3, label in name)
    expect(fix[0].textContent).toBe('Fix, Use grace@outlook.com');
    expect(fix[0].hasAttribute('aria-label')).toBe(false);
    expect(fix[0].title).toBe('Use grace@outlook.com');
    fix[0].click();
    expect(pan.getEntries()[1]).toMatchObject({ email: 'grace@outlook.com', status: 'valid' });
  });

  it('a misspelling on the exclusion list is red and keeps the fix', () => {
    const pan = new Goldpan(setup());
    pan.add('ada@gmal.com');
    expect(pan.getEntries()[0]).toMatchObject({ status: 'invalid', reason: 'blockedDomain', suggestion: 'ada@gmail.com' });
    pan.element.querySelector<HTMLButtonElement>('[data-action="fix"]')!.click();
    expect(pan.getEmails()).toEqual(['ada@gmail.com']);
  });

  it('edits in place, keeping position and id', () => {
    const pan = new Goldpan(setup());
    pan.add('a@x.com brokn c@x.com');
    const id = pan.getEntries()[1].id;
    pan.element.querySelectorAll<HTMLButtonElement>('[data-action="edit"]')[1].click();
    const box = pan.element.querySelector<HTMLInputElement>('.goldpan__edit')!;
    expect(box.value).toBe('brokn');
    box.value = 'b@x.com';
    press(box, 'Enter');
    expect(pan.getEmails()).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
    expect(pan.getEntries()[1].id).toBe(id);
  });

  it('Escape cancels an edit', () => {
    const pan = new Goldpan(setup());
    pan.add('a@x.com');
    pan.element.querySelector<HTMLButtonElement>('[data-action="edit"]')!.click();
    const box = pan.element.querySelector<HTMLInputElement>('.goldpan__edit')!;
    box.value = 'zzz';
    press(box, 'Escape');
    expect(pan.getEmails()).toEqual(['a@x.com']);
    expect(pan.element.querySelector('.goldpan__edit')).toBeNull();
  });

  it('setOptions() re-judges everything (new existing list, new limit)', () => {
    const pan = new Goldpan(setup());
    pan.add('a@x.com b@x.com');
    pan.setOptions({ existingEmails: ['A@x.com'], maxEmails: 1 });
    expect(pan.getEntries().map((e) => `${e.status}:${e.reason}`)).toEqual(['warning:existing', 'invalid:limit']);
    pan.setOptions({ maxEmails: null });
    expect(pan.getEntries()[1].status).toBe('valid');
  });

  it('emits events through on() and as DOM CustomEvents', () => {
    const field = setup();
    const pan = new Goldpan(field);
    const add = vi.fn();
    const change = vi.fn();
    const dom = vi.fn();
    const off = pan.on('add', add);
    pan.on('change', change);
    field.addEventListener('goldpan:remove', (e) => dom((e as CustomEvent).detail.entry.email));
    pan.add('a@x.com');
    pan.remove('a@x.com');
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0][0].entries[0].email).toBe('a@x.com');
    expect(change).toHaveBeenCalledTimes(2);
    expect(dom).toHaveBeenCalledWith('a@x.com');
    off();
    pan.add('b@x.com');
    expect(add).toHaveBeenCalledTimes(1);
  });

  it('a failing listener does not break the widget', () => {
    const pan = new Goldpan(setup());
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    pan.on('change', () => {
      throw new Error('boom');
    });
    expect(() => pan.add('a@x.com')).not.toThrow();
    expect(pan.getEmails()).toEqual(['a@x.com']);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('switches language at runtime', () => {
    Goldpan.registerLocale('it', it_);
    const pan = new Goldpan(setup(), { locale: 'it', placeholder: undefined });
    pan.add('x');
    expect(pan.element.querySelector('.goldpan__filter--invalid')!.textContent).toContain('Scartati');
    expect(pan.getEntries()[0].message).toBe('Non è un indirizzo email valido');
    pan.setOptions({ locale: 'en' });
    expect(pan.getEntries()[0].message).toBe('Not a valid email address');
    pan.setOptions({ messages: { format: 'Nope' } });
    expect(pan.getEntries()[0].message).toBe('Nope');
  });

  it('destroy() gives the original element back', () => {
    const field = setup();
    const pan = new Goldpan(field);
    pan.add('a@x.com');
    pan.destroy();
    expect(field.hidden).toBe(false);
    expect(field.hasAttribute('data-goldpan')).toBe(false);
    expect(document.querySelector('.goldpan')).toBeNull();
    expect(document.querySelector('label')!.htmlFor).toBe('to');
    expect(Goldpan.getInstance(field)).toBeUndefined();
    expect(() => pan.add('b@x.com')).toThrow(/destroyed/);
    expect(new Goldpan(field)).toBeInstanceOf(Goldpan);
  });

  it('a field wrapped in its label, with aria-labelledby or plain, is given back untouched', () => {
    for (const html of ['<label>To <input name="to"></label>', '<span id="t">To</span><input aria-labelledby="t">', '<input>']) {
      document.body.innerHTML = html;
      const field = document.querySelector('input')!;
      const before = field.outerHTML;
      const pan = new Goldpan(field);
      pan.add('a@x.com');
      pan.destroy();
      field.value = '';
      expect(field.outerHTML).toBe(before);
    }
  });

  it('exclusion list: default, extended, replaced, off, edited globally', () => {
    const verdict = (opts: object, email: string) => {
      document.body.innerHTML = '<input>';
      const s = new Goldpan('input', opts);
      s.add(email);
      const e = s.getEntries()[0];
      s.destroy();
      return `${e.status}:${e.reason ?? ''}`;
    };
    expect(verdict({}, 'a@mailinator.com')).toBe('invalid:blockedDomain');
    expect(verdict({ blockedDomains: [...Goldpan.blockedDomains, 'acme.com'] }, 'a@acme.com')).toBe('invalid:blockedDomain');
    expect(verdict({ blockedDomains: [...Goldpan.blockedDomains, 'acme.com'] }, 'a@mailinator.com')).toBe('invalid:blockedDomain');
    expect(verdict({ blockedDomains: ['acme.com'] }, 'a@mailinator.com')).toBe('valid:');
    expect(verdict({ blockedDomains: [], typoCheck: false }, 'a@gmal.com')).toBe('valid:');
    Goldpan.blockedDomains.push('competitor.io');
    expect(verdict({}, 'a@competitor.io')).toBe('invalid:blockedDomain');
    Goldpan.blockedDomains.pop();
  });

  it('works inside a plain container', () => {
    document.body.innerHTML = '<div id="box"></div>';
    const pan = new Goldpan('#box');
    pan.add('a@x.com');
    expect(document.querySelector('#box > .goldpan')).toBe(pan.element);
  });

  it('works inside a shadow root, label included', () => {
    document.body.innerHTML = '<div id="host"></div>';
    const root = document.querySelector('#host')!.attachShadow({ mode: 'open' });
    root.innerHTML = '<label for="to">To</label><input id="to">';
    const pan = new Goldpan(root.querySelector<HTMLInputElement>('input')!);
    expect(root.querySelector('label')!.htmlFor).toBe(pan.inputElement.id);
    pan.add('a@x.com');
    expect(root.querySelector<HTMLInputElement>('#to')!.value).toBe('a@x.com');
  });

  it('instances are independent', () => {
    document.body.innerHTML = '<input id="a"><input id="b">';
    const [a, b] = Goldpan.init('input');
    a.add('a@x.com');
    b.add('b@x.com');
    a.clear();
    expect(a.getEmails()).toEqual([]);
    expect(b.getEmails()).toEqual(['b@x.com']);
  });

  it('disabled state', () => {
    const pan = new Goldpan(setup('<input id="to" disabled>'));
    expect(pan.inputElement.disabled).toBe(true);
    pan.enable();
    expect(pan.inputElement.disabled).toBe(false);
  });

  it('reads a pasted address-book line', () => {
    const pan = new Goldpan(setup());
    const e = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(e, 'clipboardData', { value: { getData: () => 'Ada Lovelace <ada@x.com>; Grace <grace@x.com>' } });
    pan.inputElement.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(pan.getEmails()).toEqual(['ada@x.com', 'grace@x.com']);
  });
});

describe('confirm() and rejected addresses', () => {
  const notice = (pan: Goldpan) => pan.element.querySelector<HTMLElement>('.goldpan__notice')!;
  // A second confirmation counts only a moment after the first one (a double click does not).
  const later = () => vi.advanceTimersByTime(600);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('returns true at once when nothing is rejected, after adding the text still in the box', () => {
    const pan = new Goldpan(setup());
    pan.inputElement.value = 'a@x.com';
    expect(pan.confirm()).toBe(true);
    expect(pan.getEmails()).toEqual(['a@x.com']);
    expect(notice(pan).hidden).toBe(true);
  });

  it('asks by default: the first confirmation shows the rejected addresses, the next one goes on', () => {
    const pan = new Goldpan(setup());
    const stops: ConfirmStop[] = [];
    pan.on('confirm', (stop) => stops.push(stop));
    pan.add('a@x.com broken also-broken');
    expect(pan.confirm()).toBe(false);
    expect(pan.getFilter()).toBe('invalid');
    expect(stops).toEqual([{ state: 'ask', message: 'There are 2 rejected addresses.', label: 'Ignore and send' }]);
    expect(notice(pan).hidden).toBe(false);
    expect(notice(pan).textContent).toBe('There are 2 rejected addresses. Press again to go on without them.');
    later();
    expect(pan.confirm()).toBe(true);
    expect(stops[stops.length - 1]).toEqual({ state: null, message: '', label: '' });
    expect(notice(pan).hidden).toBe(true);
    expect(pan.getFilter()).toBe('all');
    expect(pan.getEmails()).toEqual(['a@x.com']);
    // The next confirmation asks again.
    expect(pan.confirm()).toBe(false);
  });

  it('does not take a double click for a second confirmation', () => {
    const pan = new Goldpan(setup());
    pan.add('broken');
    expect(pan.confirm()).toBe(false);
    vi.advanceTimersByTime(100);
    expect(pan.confirm()).toBe(false);
    later();
    expect(pan.confirm()).toBe(true);
  });

  it('keeps the message in step with the list and ends it when nothing is rejected', () => {
    const pan = new Goldpan(setup());
    const said: Array<string | null> = [];
    pan.on('confirm', ({ state, message }) => said.push(state && message));
    pan.add('a@x.com one two');
    pan.confirm();
    pan.remove('one');
    expect(notice(pan).textContent).toBe('There is 1 rejected address. Press again to go on without it.');
    pan.remove('two');
    expect(said).toEqual(['There are 2 rejected addresses.', 'There is 1 rejected address.', null]);
    expect(notice(pan).hidden).toBe(true);
    expect(pan.getFilter()).toBe('all');
  });

  it('speaks the language of the widget', () => {
    Goldpan.registerLocale('it', it_);
    const pan = new Goldpan(setup(), { locale: 'it' });
    const labels: string[] = [];
    pan.on('confirm', ({ label }) => labels.push(label));
    pan.add('a@x.com broken');
    pan.confirm();
    expect(notice(pan).textContent).toBe('C’è 1 indirizzo scartato. Premi di nuovo per procedere senza.');
    expect(labels).toEqual(['Ignora e invia']);
  });

  it('leaves the message to the page with `inlineMessage: false`', () => {
    const pan = new Goldpan(setup(), { inlineMessage: false });
    let message = '';
    pan.on('confirm', (stop) => (message = stop.message));
    pan.add('broken');
    pan.confirm();
    expect(message).toBe('There is 1 rejected address.');
    expect(notice(pan).hidden).toBe(true);
  });

  it("stops every time with `rejected: 'block'`", () => {
    const pan = new Goldpan(setup(), { rejected: 'block' });
    const stops: ConfirmStop[] = [];
    pan.on('confirm', (stop) => stops.push(stop));
    pan.add('a@x.com broken');
    expect(pan.confirm()).toBe(false);
    later();
    expect(pan.confirm()).toBe(false);
    expect(stops).toEqual([{ state: 'block', message: 'Some addresses are rejected: fix or remove them.', label: '' }]);
    expect(notice(pan).textContent).toBe('Some addresses are rejected: fix or remove them.');
    pan.remove('broken');
    expect(stops[stops.length - 1]!.state).toBeNull();
    expect(pan.confirm()).toBe(true);
  });

  it("goes on at once with `rejected: 'skip'`", () => {
    const pan = new Goldpan(setup(), { rejected: 'skip' });
    pan.add('a@x.com broken');
    expect(pan.confirm()).toBe(true);
    expect(notice(pan).hidden).toBe(true);
    expect(pan.getFilter()).toBe('all');
  });

  it('treats a form submit as a confirmation', () => {
    const field = setup('<form><input id="to" name="to"><button id="go">Send</button></form>');
    const pan = new Goldpan(field);
    const form = field.form!;
    const sent: string[] = [];
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      sent.push(String(new FormData(form).get('to')));
    });
    pan.add('a@x.com broken');
    form.requestSubmit(document.querySelector<HTMLButtonElement>('#go')!);
    expect(sent).toEqual([]);
    expect(notice(pan).hidden).toBe(false);
    later();
    form.requestSubmit(document.querySelector<HTMLButtonElement>('#go')!);
    expect(sent).toEqual(['a@x.com']);
    expect(notice(pan).hidden).toBe(true);
  });

  it("lets the form through when nothing is rejected, or with `rejected: 'skip'`", () => {
    const field = setup('<form><input id="to" name="to"></form>');
    const pan = new Goldpan(field);
    let submits = 0;
    field.form!.addEventListener('submit', (event) => {
      event.preventDefault();
      submits++;
    });
    pan.add('a@x.com');
    field.form!.requestSubmit();
    pan.add('broken');
    pan.setOptions({ rejected: 'skip' });
    field.form!.requestSubmit();
    expect(submits).toBe(2);
    expect(notice(pan).hidden).toBe(true);
  });

  it('ends the stop when the widget is destroyed, so the page can put its button back', () => {
    const pan = new Goldpan(setup());
    const states: Array<string | null> = [];
    pan.on('confirm', ({ state }) => states.push(state));
    pan.add('broken');
    pan.confirm();
    pan.destroy();
    expect(states).toEqual(['ask', null]);
  });
});
