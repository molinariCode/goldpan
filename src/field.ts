export type TextField = HTMLInputElement | HTMLTextAreaElement;

/** How the widget stands in for an `<input>` or `<textarea>`, and how it hands it back. */
export interface FieldLink {
  /** The field was `required`: the widget now enforces it. */
  readonly required: boolean;
  /** A `<label for>` or `aria-labelledby` names the visible input. */
  readonly labelled: boolean;
  /** Text naming the field, from its label, its `aria-label` or a wrapping `<label>`. */
  readonly name: string | null;
  /** Puts the field back exactly as it was. */
  release(): void;
}

/** Tag names rather than `instanceof`, so that elements of other frames are recognised too. */
export function isTextField(el: Element): el is TextField {
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
}

/**
 * Hides the field, shows `widget` in its place and moves its accessible name and
 * `required` state onto `input`. The field stays in the form and keeps receiving the value.
 */
export function linkField(field: TextField, widget: HTMLElement, input: HTMLInputElement): FieldLink {
  // A field wrapped in its <label>: the widget goes after the label, which keeps naming the field.
  const wrapper = field.closest('label');
  const ownName = field.getAttribute('aria-label') || wrapper?.textContent?.trim() || null;
  (wrapper ?? field).after(widget);

  const { hidden, required } = field;
  field.hidden = true;
  // A hidden required field would stop the form with an error message nobody can see.
  field.required = false;
  field.setAttribute('data-goldpan', widget.id);
  if (required) input.setAttribute('aria-required', 'true');

  const label = labelOf(field);
  const labelledBy = field.getAttribute('aria-labelledby');
  if (label) label.htmlFor = input.id;
  else if (labelledBy) input.setAttribute('aria-labelledby', labelledBy);

  return {
    required,
    labelled: Boolean(label || labelledBy),
    name: label?.textContent?.trim() || ownName,
    release() {
      field.hidden = hidden;
      field.required = required;
      field.removeAttribute('data-goldpan');
      if (label) label.htmlFor = field.id;
    },
  };
}

/** The `<label for>` of a field, looked up in its own document or shadow root. */
function labelOf(field: TextField): HTMLLabelElement | null {
  if (!field.id) return null;
  const root = field.getRootNode() as ParentNode;
  if (typeof root.querySelector !== 'function') return null;
  const id = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(field.id) : field.id.replace(/["\\]/g, '\\$&');
  return root.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
}
