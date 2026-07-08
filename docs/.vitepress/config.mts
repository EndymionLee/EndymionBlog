import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/EndymionBlog/',
  title: 'EndymionLee',
  description: 'Software Engineer',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'author', content: 'EndymionLee' }],
  ],

  themeConfig: {
    logo: { src: '/avatar.svg', width: 32, height: 32 },
    siteTitle: 'Endymion',

    nav: [
      { text: '首页', link: '/' },
      { text: '关于', link: '/about' },
      { text: '项目', link: '/projects' },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/EndymionLee' },
    ],

    footer: {
      message: 'Built with <a href="https://vitepress.dev">VitePress</a> ❤️',
      copyright: 'Copyright © 2026 EndymionLee',
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

    editLink: {
      pattern: 'https://github.com/EndymionLee/EndymionBlog/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
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
