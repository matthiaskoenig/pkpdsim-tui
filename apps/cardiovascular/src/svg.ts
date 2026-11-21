/** The small amount of SVG plumbing the scene needs. */

export const SVG_NS = "http://www.w3.org/2000/svg";

export type Attributes = Record<string, string | number>;

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K, attributes: Attributes = {}, parent?: Element,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  parent?.appendChild(element);
  return element;
}

export function attributes(element: Element, values: Attributes): void {
  for (const [name, value] of Object.entries(values)) element.setAttribute(name, String(value));
}

export function clear(element: Element): void {
  while (element.firstChild !== null) element.removeChild(element.firstChild);
}

export function line(x1: number, y1: number, x2: number, y2: number): string {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}
