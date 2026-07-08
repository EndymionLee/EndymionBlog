import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '李杨明',
  description: 'Software Engineer | AI Agent · Go · Flutter · Python',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'author', content: '李杨明' }],
    ['meta', { name: 'keywords', content: 'AI Agent, Go, Flutter, Python, 博客, 李杨明' }],
  ],

  themeConfig: {
    logo: { src: '/avatar.svg', width: 32, height: 32 },
    siteTitle: 'Endymion',

    nav: [
      { text: '首页', link: '/' },
      { text: '关于', link: '/about' },
      { text: '项目', link: '/projects' },
      { text: '简历', link: '/resume' },
      {
        text: '分类',
        items: [
          { text: '🤖 AI', link: '/AI/' },
          { text: '🐹 Go', link: '/Go/' },
          { text: '📱 Flutter', link: '/Flutter/' },
          { text: '🐍 Python', link: '/Python/' },
          { text: '🏗️ 架构', link: '/Architecture/' },
          { text: '📓 项目日志', link: '/Project/' },
          { text: '📝 周记', link: '/Weekly/' },
        ],
      },
    ],

    sidebar: {
      '/AI/': [
        {
          text: 'AI Agent',
          items: [
            { text: '概述', link: '/AI/' },
            { text: 'Loop Engineering（一）', link: '/AI/loop-engineering-part1' },
          ],
        },
      ],
      '/Go/': [
        {
          text: 'Go 后端',
          items: [
            { text: '概述', link: '/Go/' },
            { text: 'Gin 中间件实战', link: '/Go/gin-middleware' },
          ],
        },
      ],
      '/Flutter/': [
        {
          text: 'Flutter',
          items: [
            { text: '概述', link: '/Flutter/' },
          ],
        },
      ],
      '/Python/': [
        {
          text: 'Python',
          items: [
            { text: '概述', link: '/Python/' },
          ],
        },
      ],
      '/Architecture/': [
        {
          text: '架构',
          items: [
            { text: '概述', link: '/Architecture/' },
          ],
        },
      ],
      '/Project/': [
        {
          text: '项目日志',
          items: [
            { text: '概述', link: '/Project/' },
          ],
        },
      ],
      '/Weekly/': [
        {
          text: '周记',
          items: [
            { text: '概述', link: '/Weekly/' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/endymion' },
    ],

    footer: {
      message: 'Built with <a href="https://vitepress.dev">VitePress</a> ❤️',
      copyright: 'Copyright © 2026 Li Yangming (李杨明)',
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
      pattern: 'https://github.com/endymion/blog/edit/main/docs/:path',
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
