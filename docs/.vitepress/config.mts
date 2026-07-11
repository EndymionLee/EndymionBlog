import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/',
  title: 'Endymion',
  description: 'Notes on AI, Go and Software Engineering',
  lang: 'zh-CN',
  lastUpdated: false,
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
    ['script', {}, `
(function() {
  function init() {
    var aside = document.querySelector('.VPDocAsideOutline')
    if (!aside) { setTimeout(init, 500); return }
    var title = aside.querySelector('.outline-title')
    if (!title) return
    title.style.cursor = 'pointer'
    title.title = '点击切换目录'
    title.addEventListener('click', function() {
      var content = aside.querySelector('.VPDocOutlineItem')
      if (!content) return
      var hidden = content.style.display === 'none'
      content.style.display = hidden ? '' : 'none'
      title.classList.toggle('collapsed', !hidden)
    })
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
    `],
  ],

  themeConfig: {
    logo: { src: '/images/avatar.jpg', width: 24, height: 24 },
    siteTitle: 'Endymion',

    nav: [
      { text: '博客', link: '/' },
      { text: '分类', link: '/categories' },
      { text: '项目', link: '/projects' },
      { text: '关于', link: '/about' },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/EndymionLee' },
      { icon: 'telegram', link: 'https://t.me/EndymionLee' },
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
      level: 'deep',
    },
  },
})
