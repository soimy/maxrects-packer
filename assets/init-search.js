// @ts-check
import { decompressJson } from './decompress.js'
import { h } from './h.js'

/**
 * @typedef {import('./lunr.js').Index} Index
 * @typedef {import('./lunr.js').Index.Result} IndexResult
 * @typedef {typeof import('typedoc').ReflectionKind} ReflectionKind
 *
 * @typedef SearchDocument
 * @property {number} id
 * @property {number} kind
 * @property {string} name
 * @property {string} url
 * @property {string} [classes]
 * @property {string} [parent]
 *
 * @typedef SearchData
 * @property {SearchDocument[]} rows;
 * @property {object} index
 *
 * @typedef {{ state: 'idle' } | { state: 'loading' }} searchResults
 */

/** @type {Promise<{ rows: SearchDocument[], index: Index }> | undefined} */
let indexPromise

/** @type {ReflectionKind} */
// @ts-ignore
const ReflectionKind = window.ReflectionKind

/** @type {Record<number, keyof ReflectionKind>} */
const kindById = Object.fromEntries(
  Object.entries(ReflectionKind).map(([k, v]) => [v, k]),
)

export async function initSearch() {
  /** @type {HTMLInputElement | null} */
  const inputElement = document.querySelector('#search-input')
  /** @type {HTMLInputElement | null} */
  const resultsElement = document.querySelector('#search-results')
  if (!inputElement || !resultsElement) return

  const resultsPlaceholder = resultsElement.textContent ?? ''

  inputElement.onfocus = () => {
    indexPromise = loadIndex()
  }

  /** @type {ReturnType<typeof setTimeout>} */
  let timeout
  inputElement.oninput = () => {
    if (timeout) clearTimeout(timeout)
    if (resultsElement.dataset.state === 'idle')
      resultsElement.replaceChildren('Loading…')

    resultsElement.dataset.state = 'loading'
    timeout = setTimeout(async () => {
      const listItems = await searchResults(inputElement.value)
      resultsElement.dataset.state = listItems ? 'done' : 'idle'
      const children =
        listItems === undefined
          ? resultsPlaceholder
          : listItems.length
            ? h.ul({ class: 'nav-tree' }, listItems)
            : h.div({ class: 'no-results' }, 'No results')
      resultsElement.replaceChildren(children)
    }, 500)
  }
}

/**
 * @returns {Promise<{ rows: SearchDocument[], index: Index }>}
 */
async function loadIndex() {
  if (indexPromise) return indexPromise
  const [{ Index }] = await Promise.all([
    import('./lunr.js'),
    // @ts-ignore
    import('./search.js'), // provides window.searchData
  ])

  // @ts-ignore
  const compressed = /** @type {string | undefined} */ (window.searchData)
  if (!compressed) throw new Error('nothing to search!')

  /** @type {SearchData} */
  const searchData = await decompressJson(compressed)
  return { index: Index.load(searchData.index), rows: searchData.rows }
}

/**
 * @param {string} query
 * @returns {Promise<HTMLElement[] | undefined>}
 */
async function searchResults(query) {
  if (!indexPromise) return console.info('index promise is empty'), []
  query = query.trim()
  if (!query) return undefined
  const { index, rows } = await indexPromise

  const search = query
    .split(' ')
    .filter(Boolean)
    .map((x) => `*${x}*`)
    .join(' ')
  const results = index.search(search).sort((a, b) => b.score - a.score)

  return results.map((item) => {
    const row = rows[Number(item.ref)]
    const nameElement = h.code({}, [])
    nameElement.innerHTML = row.name.replace(
      new RegExp(`(${query})`, 'gi'),
      '<b>$1</b>',
    )

    const kindName = kindById[row.kind]
    /** @type {string} */
    // @ts-ignore
    const basePath = window.basePath
    const rowUrl = window.location.origin + basePath + row.url

    const option = h.a({ class: 'search-result nav-leaf', href: rowUrl }, [
      h.span({}, nameElement),
      h.small({ class: 'parent' }, row.parent || 'N/A'),
      h.small(
        {},
        h.small({}, kindName ? `(${pascalCaseToSpaceCase(kindName)})` : 'N/A'),
      ),
    ])
    return option
  })
}

/**
 * @param {string} text
 * @returns {string}
 */
function pascalCaseToSpaceCase(text) {
  return text.replace(/([A-Z])/g, ' $1').trim()
}
