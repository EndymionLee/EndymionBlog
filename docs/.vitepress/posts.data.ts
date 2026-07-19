import { createContentLoader } from 'vitepress'

function fmtDate(val: unknown): string {
  if (!val) return ''
  const d = new Date(val as string)
  if (isNaN(d.getTime())) return String(val)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default createContentLoader('**/*.md', {
  transform(raw) {
    return raw
      .filter(p => p.frontmatter?.title)
      .filter(p => !['/', '/categories', '/about', '/projects/'].includes(p.url))
      .filter(p => !p.url.startsWith('/projects/'))
      .map(p => ({
        url: p.url,
        frontmatter: {
          title: p.frontmatter.title || '',
          date: fmtDate(p.frontmatter.date),
        },
      }))
      .sort((a, b) => {
        if (!a.frontmatter.date) return 1
        if (!b.frontmatter.date) return -1
        return b.frontmatter.date.localeCompare(a.frontmatter.date)
      })
  },
})
