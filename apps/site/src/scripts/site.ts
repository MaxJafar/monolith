type SearchEntry = {
  title: string
  description: string
  section: string
  url: string
  body: string
}

const themeToggle = document.querySelector<HTMLButtonElement>(
  '[data-theme-toggle]'
)
function syncTheme() {
  const dark = document.documentElement.dataset.theme === 'dark'
  themeToggle?.setAttribute('aria-pressed', String(dark))
  themeToggle?.setAttribute(
    'aria-label',
    `Switch to ${dark ? 'light' : 'dark'} theme`
  )
}
syncTheme()
themeToggle?.addEventListener('click', () => {
  const theme =
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('monolith-site-theme', theme)
  } catch {
    /* Session-only theme when storage is unavailable. */
  }
  syncTheme()
})

const menuButton = document.querySelector<HTMLButtonElement>(
  '.mobile-menu-toggle'
)
const mobileNav = document.querySelector<HTMLElement>('#mobile-nav')
function closeMenu() {
  if (mobileNav) mobileNav.hidden = true
  menuButton?.setAttribute('aria-expanded', 'false')
  menuButton?.setAttribute('aria-label', 'Open navigation')
}
menuButton?.addEventListener('click', () => {
  if (!mobileNav) return
  const open = mobileNav.hidden
  mobileNav.hidden = !open
  menuButton.setAttribute('aria-expanded', String(open))
  menuButton.setAttribute('aria-label', `${open ? 'Close' : 'Open'} navigation`)
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileNav && !mobileNav.hidden) {
    closeMenu()
    menuButton?.focus()
  }
})
const dropdown = document.querySelector<HTMLDetailsElement>('.product-menu')
document.addEventListener('click', (event) => {
  if (
    event.target instanceof Node &&
    !dropdown?.contains(event.target) &&
    dropdown
  )
    dropdown.open = false
})
dropdown?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    dropdown.open = false
    dropdown.querySelector('summary')?.focus()
  }
})

const dialog = document.querySelector<HTMLDialogElement>('#search-dialog')
const search = document.querySelector<HTMLInputElement>('#docs-search')
const results = document.querySelector<HTMLElement>('#search-results')
let index: SearchEntry[] | undefined
let indexRequest: Promise<SearchEntry[]> | undefined
let searchOpener: HTMLElement | null = null
async function getIndex() {
  if (index) return index
  indexRequest ??= fetch('/search.json')
    .then((response) => {
      if (!response.ok) throw new Error('Search unavailable')
      return response.json() as Promise<SearchEntry[]>
    })
    .then((value) => {
      index = value
      return value
    })
    .catch((error) => {
      indexRequest = undefined
      throw error
    })
  return indexRequest
}
async function renderResults() {
  if (!results || !search) return
  const query = search.value.trim().toLowerCase()
  results.textContent = 'Searching the docs…'
  try {
    const entries = await getIndex()
    if (search.value.trim().toLowerCase() !== query) return
    const terms = query.split(/\s+/).filter(Boolean)
    const matches = entries
      .map((entry) => ({
        entry,
        score: terms.length
          ? terms.reduce(
              (score, term) =>
                score +
                (entry.title.toLowerCase().includes(term) ? 8 : 0) +
                (entry.description.toLowerCase().includes(term) ? 3 : 0) +
                (entry.body.toLowerCase().includes(term) ? 1 : 0),
              0
            )
          : 1
      }))
      .filter(
        ({ entry, score }) =>
          score > 0 &&
          terms.every((term) =>
            `${entry.title} ${entry.description} ${entry.body}`
              .toLowerCase()
              .includes(term)
          )
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
    results.replaceChildren()
    if (!matches.length) {
      const message = document.createElement('p')
      message.textContent = `No results for “${search.value}”. Try “widgets”, “install” or “MCP”.`
      results.append(message)
      return
    }
    for (const { entry } of matches) {
      const link = document.createElement('a')
      link.href = entry.url
      link.className = 'search-result'
      const label = document.createElement('span')
      label.className = 'micro'
      label.textContent = entry.section
      const title = document.createElement('strong')
      title.textContent = entry.title
      const description = document.createElement('span')
      description.textContent = entry.description
      link.append(label, title, description)
      results.append(link)
    }
  } catch {
    results.replaceChildren()
    const message = document.createElement('p')
    message.textContent =
      'Search could not load. You can still browse every guide.'
    const link = document.createElement('a')
    link.href = '/docs'
    link.textContent = 'Browse documentation'
    link.className = 'search-result'
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.className = 'button secondary'
    retry.textContent = 'Retry search'
    retry.addEventListener('click', renderResults)
    results.append(message, link, retry)
  }
}
function openSearch(opener?: HTMLElement) {
  if (!dialog || dialog.open) return
  searchOpener =
    opener ??
    (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null)
  dialog.showModal()
  search?.focus()
  void renderResults()
}
document
  .querySelectorAll<HTMLButtonElement>('[data-open-search]')
  .forEach((button) =>
    button.addEventListener('click', () => openSearch(button))
  )
document
  .querySelector('[data-close-search]')
  ?.addEventListener('click', () => dialog?.close())
dialog?.addEventListener('close', () => searchOpener?.focus())
dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect()
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close()
  }
})
search?.addEventListener('input', renderResults)
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearch()
  }
})
dialog?.addEventListener('keydown', (event) => {
  if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return
  const links = Array.from(
    results?.querySelectorAll<HTMLAnchorElement>('a.search-result') || []
  )
  if (!links.length) return
  const active = links.findIndex((link) => link === document.activeElement)
  if (event.key === 'Enter' && document.activeElement === search) {
    event.preventDefault()
    links[0].click()
    return
  }
  if (event.key === 'Enter') return
  event.preventDefault()
  const next =
    event.key === 'ArrowDown'
      ? (active + 1) % links.length
      : active <= 0
        ? links.length - 1
        : active - 1
  links[next].focus()
})

const captions: Record<string, string> = {
  workspace: 'A live overview, shaped around your day.',
  documents: 'Your ideas and information, connected.',
  atlas: 'Follow a thread. Find the bigger picture.',
  addons: 'Make room for just the tools you need.'
}
const tabs = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-preview]')
)
function activateTab(tab: HTMLButtonElement) {
  for (const item of tabs) {
    const active = item === tab
    item.setAttribute('aria-selected', String(active))
    item.tabIndex = active ? 0 : -1
    const panel = document.getElementById(
      item.getAttribute('aria-controls') || ''
    )
    if (panel) panel.hidden = !active
  }
  const caption = document.querySelector('[data-preview-caption]')
  if (caption)
    caption.textContent = captions[tab.dataset.preview || 'workspace']
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab))
  tab.addEventListener('keydown', (event) => {
    let next: number | undefined
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft')
      next = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (next !== undefined) {
      event.preventDefault()
      activateTab(tabs[next])
      tabs[next].focus()
    }
  })
})

const addonSearch = document.querySelector<HTMLInputElement>('#addon-search')
const categorySelect =
  document.querySelector<HTMLSelectElement>('#addon-category')
const filterButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-type-filter]')
)
let addonType = 'All'
function filterAddons() {
  const query = addonSearch?.value.trim().toLowerCase() || ''
  const category = categorySelect?.value || 'All'
  let count = 0
  document
    .querySelectorAll<HTMLElement>('[data-addon-card]')
    .forEach((card) => {
      const visible =
        (addonType === 'All' || card.dataset.type === addonType) &&
        (category === 'All' || card.dataset.category === category) &&
        (card.dataset.search || '').includes(query)
      card.hidden = !visible
      if (visible) count++
    })
  const status = document.querySelector('[data-addon-count]')
  if (status)
    status.textContent = `${count} ${count === 1 ? 'tool' : 'tools'} in the collection`
  const empty = document.querySelector<HTMLElement>('[data-addon-empty]')
  if (empty) empty.hidden = count !== 0
}
filterButtons.forEach((button) =>
  button.addEventListener('click', () => {
    addonType = button.dataset.typeFilter || 'All'
    filterButtons.forEach((item) =>
      item.setAttribute('aria-pressed', String(item === button))
    )
    filterAddons()
  })
)
addonSearch?.addEventListener('input', filterAddons)
categorySelect?.addEventListener('change', filterAddons)
document
  .querySelector('[data-reset-filters]')
  ?.addEventListener('click', () => {
    if (addonSearch) addonSearch.value = ''
    if (categorySelect) categorySelect.value = 'All'
    addonType = 'All'
    filterButtons.forEach((item) =>
      item.setAttribute(
        'aria-pressed',
        String(item.dataset.typeFilter === 'All')
      )
    )
    filterAddons()
    addonSearch?.focus()
  })
document
  .querySelectorAll<HTMLElement>('.prose pre, .terminal-block pre')
  .forEach((pre) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'copy-code'
    button.textContent = 'Copy'
    button.setAttribute('aria-label', 'Copy code to clipboard')
    const code = pre.querySelector('code')?.textContent || pre.textContent || ''
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code)
        button.textContent = 'Copied'
        button.setAttribute('aria-label', 'Code copied')
      } catch {
        button.textContent = 'Select code'
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(pre.querySelector('code') || pre)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
      window.setTimeout(() => {
        button.textContent = 'Copy'
        button.setAttribute('aria-label', 'Copy code to clipboard')
      }, 2000)
    })
    pre.append(button)
  })
