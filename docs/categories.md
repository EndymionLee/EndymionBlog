---
title: 分类
---
<script setup>
import { ref } from 'vue'
import { data as posts } from './.vitepress/posts.data'
const base = ''

const categories = {}
for (const post of posts) {
  const cat = post.url.split('/')[1] || 'uncategorized'
  if (!categories[cat]) categories[cat] = []
  categories[cat].push(post)
}

const open = ref({})
const catNames = Object.keys(categories)

function toggle(name) {
  open.value[name] = !open.value[name]
}
</script>

<div class="categories-page">
  <header class="categories-hero">
    <span>KNOWLEDGE MAP</span>
    <h1>分类</h1>
    <p> </p>
  </header>

<div v-if="catNames.length" class="category-list">
    <section v-for="(items, name) in categories" :key="name" class="category-group" :class="{ 'is-open': open[name] }">
      <button class="category-toggle" @click="toggle(name)" :aria-expanded="!!open[name]">
        <span class="category-index">{{ String(catNames.indexOf(name) + 1).padStart(2, '0') }}</span>
        <span class="category-name">{{ name }}</span>
        <span class="category-count">{{ items.length }} 篇</span>
        <span class="category-chevron">+</span>
      </button>
      <div v-if="open[name]" class="category-posts">
        <a v-for="item in items" :key="item.url" :href="base + item.url" class="category-post">
          <span>{{ item.frontmatter.title }}</span><time>{{ item.frontmatter.date }}</time><b>↗</b>
        </a>
      </div>
    </section>
  </div>

<div v-else class="empty">暂无文章</div>
</div>
