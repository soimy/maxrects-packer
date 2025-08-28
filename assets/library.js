export function getBySelector(selector, root = document) {
  if (!selector) throw new Error(`no selector provided: ${selector}`)
  const element = root.querySelector(selector)
  if (element) return element
  throw new Error(`no element matches "${selector}"`)
}

export function css(rules) {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(rules.join())
  document.adoptedStyleSheets.push(sheet)
  return sheet
}

export function createRandomId() {
  const id = Math.random().toString(36).slice(2)
  if (document.getElementById(id)) return createId()
  return id
}

// export function fetchHtml({ url, ...init }) {
//   const controller = new AbortController()
//   /** @type {URL | undefined} */
//   let redirect
//   const trigger = async () => {
//     const response = await fetch(url, {
//       ...init,
//       signal: controller.signal,
//       credentials: "include",
//       headers: { ...init.headers, Accept: "text/html" },
//     })
//     if (response.url !== url.toString()) redirect = new URL(response.url)
//     const html = await response.text()
//     // Detect new custom elements to import here.
//     // Or leave that responsibility to the caller.
//     return html
//   }

//   return {
//     controller,
//     trigger,
//     get redirect() {
//       return redirect
//     },
//   }
// }
