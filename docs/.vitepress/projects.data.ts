import { createContentLoader } from 'vitepress'

export default createContentLoader('projects/**/*.md', {
  transform(raw) {
    return raw
      .filter(p => p.frontmatter?.title)
      .map(p => ({
        url: p.url,
        frontmatter: {
          title: p.frontmatter.title || '',
          desc: p.frontmatter.description || '',
          tags: p.frontmatter.tags || [],
          status: p.frontmatter.status || '',
        },
      }))
  },
})
