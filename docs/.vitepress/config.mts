import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/',
  title: 'Endymion',
  description: 'Notes on AI, Go and Software Engineering',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'author', content: 'Endymion' }],
    ['style', {}, `
      body {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    `],
  ],

  themeConfig: {
    logo: { src: '/favicon.svg', width: 24, height: 24 },
    siteTitle: 'Endymion',

    nav: [
      { text: '博客', link: '/' },
      { text: '分类', link: '/categories' },
      { text: '项目', link: '/projects' },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/EndymionLee' },
    ],

    footer: {
      message: 'Built with <a href="https://vitepress.dev">VitePress</a>',
      copyright: 'Copyright © 2026 Endymion',
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '没有找到相关结果',
            resetButtonTitle: '清除搜索条件',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },

    lastUpdatedText: '最后更新',

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },

    outline: {
      label: '目录',
    },
  },
})
