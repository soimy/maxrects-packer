import { h } from './h.js'

export function initPageContentNavFromAnchors() {
  const anchors = document.querySelectorAll('.anchor[id]')
  const tsdAnchors = document.querySelectorAll('.tsd-anchor-link[id]')

  const ul = setupPageContentNav()
  initAnchorLinks('tsd', ul, tsdAnchors)
  initAnchorLinks('unhoax', ul, anchors)
}

function initAnchorLinks(
  /** @type {'tsd' | 'unhoax'} */ type,
  /** @type {NodeList<Element>} */ ul,
  /** @type {NodeList<Element>} */ anchors,
) {
  for (const anchor of anchors) {
    const heading =
      type === 'tsd'
        ? anchor
        : anchor.nextElementSibling.querySelector('a[href]')
    if (!heading) continue
    const level = Number(heading.tagName.slice(1)) || undefined // avoid NaN
    const anchorElement = renderAnchorLink({
      level,
      targetId: anchor.id,
      heading: heading.textContent,
    })
    ul.appendChild(h.li({}, anchorElement))
  }
}

/**
 * @returns {HTMLUListElement}
 */
function setupPageContentNav() {
  const pageToc = document.querySelector('.page-toc')
  const ul = pageToc.querySelector('ul') ?? h.ul({ class: 'nav-tree' })

  // the page content is empty, let’s add content
  if (!pageToc.textContent.trim()) {
    pageToc.appendChild(h.h2({}, 'On This Page'))
    pageToc.appendChild(ul)
  }
  return ul
}

export function initPageContentNavFromSectionHeadings() {
  const selector = '.page-content section :is(h2, h3, h4, h5, h6):first-child'
  const headings = document.querySelectorAll(selector)

  if (headings.length === 0) return

  const ul = setupPageContentNav()

  for (const heading of headings) {
    const slug = `section-${slugify(heading.textContent)}`
    const level = Number(heading.tagName.slice(1))
    const section = heading.closest('section')
    section.id = slug

    const anchor = renderAnchorLink({
      level,
      targetId: slug,
      heading: heading.textContent,
    })
    ul.appendChild(h.li({}, anchor))
  }
}

function renderAnchorLink({ level = 0, targetId, heading }) {
  const anchor = h.a(
    { href: `#${targetId}`, class: 'page-content-anchor-link' },
    [h.small({}, ['  '.repeat(level)]), ' ', heading],
  )
  return anchor
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}
