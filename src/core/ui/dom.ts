type Attrs = Record<string, string | number | boolean | undefined | null>;

/**
 * Minimal hyperscript-ish helper so viewers/UI chrome don't need a
 * framework. `class`/`className` both work; boolean attrs are set as real
 * DOM properties when applicable (e.g. `disabled`).
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Array<Node | string> = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class" || key === "className") {
      node.className = String(value);
    } else if (key in node && typeof (node as any)[key] === "boolean") {
      (node as any)[key] = Boolean(value);
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
