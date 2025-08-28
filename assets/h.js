function isNil(value) {
  return value === undefined || value === null
}

const createElement =
  (tag) =>
  (
    /** @type {Record<string, unknown>} */ attributes,
    /** @type {unknown[]} */ ...children
  ) => {
    /** @type {HTMLElement} */
    const element = document.createElement(tag)
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value)
    }
    for (const child of children.flat()) {
      if (child instanceof Element) element.appendChild(child)
      else if (!isNil(child))
        element.appendChild(document.createTextNode(child))
    }
    return element
  }

export const h = {
  h2: createElement('h2'),
  div: createElement('div'),
  span: createElement('span'),
  code: createElement('code'),
  small: createElement('small'),
  a: createElement('a'),
  b: createElement('b'),
  details: createElement('details'),
  summary: createElement('summary'),
  ul: createElement('ul'),
  li: createElement('li'),
}
