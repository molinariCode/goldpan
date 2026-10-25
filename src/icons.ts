// Hand-drawn 24×24 stroke icons, built with the DOM (no innerHTML, no icon font, no request).
// Each one is drawn once per document, then cloned: cloning is far cheaper than parsing.

export type IconName = 'valid' | 'warning' | 'invalid' | 'edit' | 'remove' | 'fix';

type Shape = [tag: 'circle' | 'path', attributes: Record<string, string>];

const SHAPES: Record<IconName, Shape[]> = {
  valid: [['circle', { cx: '12', cy: '12', r: '9' }], ['path', { d: 'M8 12.5l2.7 2.7L16 9.5' }]],
  warning: [['path', { d: 'M12 3.5L21.5 20h-19z' }], ['path', { d: 'M12 10v4.5' }], ['path', { d: 'M12 17.5v.01' }]],
  invalid: [['circle', { cx: '12', cy: '12', r: '9' }], ['path', { d: 'M12 7.5v5.5' }], ['path', { d: 'M12 16.5v.01' }]],
  edit: [['path', { d: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z' }], ['path', { d: 'M13.5 6.5l4 4' }]],
  remove: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
  fix: [['path', { d: 'M4 12.5l5 5L20 6.5' }]],
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
