// Hand-drawn 24×24 stroke icons, built with the DOM (no innerHTML, no icon font, no request).
// Each one is drawn once per document, then cloned: cloning is far cheaper than parsing.

export type IconName = 'valid' | 'warning' | 'invalid' | 'edit' | 'remove';

type Shape = [tag: 'circle' | 'path', attributes: Record<string, string>];

// valid: a tick; warning: a triangle; invalid: a "no entry" sign; edit: a pen over a line; remove: a cross.
const SHAPES: Record<IconName, Shape[]> = {
  valid: [['path', { d: 'M5 12.5l4.5 4.5L19 7', 'stroke-width': '2.4' }]],
  warning: [['path', { d: 'M12 4L21 19.5H3z' }], ['path', { d: 'M12 10v4' }], ['path', { d: 'M12 17v.01' }]],
  invalid: [['circle', { cx: '12', cy: '12', r: '8.5' }], ['path', { d: 'M6 6l12 12' }]],
  edit: [['path', { d: 'M15 4.5l3.5 3.5L9 17.5H5.5V14z' }], ['path', { d: 'M4 21h16' }]],
  remove: [['path', { d: 'M6 6l12 12M18 6L6 18', 'stroke-width': '2.4' }]],
};

const FRAME: Record<string, string> = {
  class: 'goldpan__svg',
  viewBox: '0 0 24 24',
  width: '16',
  height: '16',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const drawn = new WeakMap<Document, Map<IconName, SVGSVGElement>>();

function draw(doc: Document, tag: string, attributes: Record<string, string>): SVGElement {
  const el = doc.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  return el;
}

/** A fresh copy of an icon for `doc`; it takes the colour of the surrounding text. */
export function icon(doc: Document, name: IconName): SVGSVGElement {
  let icons = drawn.get(doc);
  if (!icons) drawn.set(doc, (icons = new Map()));
  let master = icons.get(name);
  if (!master) {
    master = draw(doc, 'svg', FRAME) as SVGSVGElement;
    for (const [tag, attributes] of SHAPES[name]) master.append(draw(doc, tag, attributes));
    icons.set(name, master);
  }
  return master.cloneNode(true) as SVGSVGElement;
}
