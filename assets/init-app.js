import {
  initPageContentNavFromAnchors,
  initPageContentNavFromSectionHeadings,
} from './init-page-content-nav.js'
import { initSearch } from './init-search.js'

function initTheme() {
  const root = document.documentElement
  const select = document.getElementById('theme-select')
  const preferredScheme = window.matchMedia('(prefers-color-scheme: dark)')
    .matches
    ? 'dark'
    : 'light'

  root.dataset.theme = select.value =
    localStorage.getItem('typedoc-theme') || preferredScheme

  select.onchange = () => {
    root.dataset.theme = select.value
    localStorage.setItem('typedoc-theme', select.value)
  }
}

function listenToCopyButtonClicks() {
  const delay = 1000
  const copyButtons = document.querySelectorAll('pre button')
  for (const button of copyButtons) {
    const originalText = button.textContent
    let timeout
    button.onclick = () => {
      const codeElement = button.previousElementSibling
      const code = codeElement.innerText.trim()
      navigator.clipboard.writeText(code)
      button.textContent = 'Copied!'
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => (button.textContent = originalText), delay)
    }
  }
}
/** @type {string} */
const basePath = window.basePath

function closeMobileMenuOnBodyClick() {
  /** @type {HTMLInputElement | null} */
  const mobileNavOpenedInput = document.getElementById('mobile-nav-opened')
  /** @type {HTMLElement | null} */
  const pageContent = document.querySelector('.page-content')
  if (!mobileNavOpenedInput || !pageContent) return

  pageContent.addEventListener(
    'click',
    (event) => {
      if (!mobileNavOpenedInput.checked) return
      event.preventDefault()
      mobileNavOpenedInput.checked = false
    },
    { capture: true },
  )
}

function main() {
  initTheme()
  listenToCopyButtonClicks()
  const isHome = location.pathname === basePath
  const isDocument = location.pathname.includes('/documents/')
  isHome || isDocument
    ? initPageContentNavFromAnchors()
    : initPageContentNavFromSectionHeadings()
  initSearch()
  closeMobileMenuOnBodyClick()
}

main()
