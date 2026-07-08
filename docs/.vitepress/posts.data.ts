import { createContentLoader } from 'vitepress'

export default createContentLoader('**/*.md', {
  transform(raw) {
    return raw
      .filter(p => p.frontmatter?.title)
      .map(p => ({
        url: p.url,
        frontmatter: {
          title: p.frontmatter.title || '',
          date: p.frontmatter.date ? String(p.frontmatter.date).slice(0, 10) : '',
        },
      }))
      .sort((a, b) => {
        if (!a.frontmatter.date) return 1
        if (!b.frontmatter.date) return -1
        return b.frontmatter.date.localeCompare(a.frontmatter.date)
      })
      .slice(0, 9)
  },
})
