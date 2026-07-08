---
title: 分类
---
<script setup>
import { ref } from 'vue'
import { data as posts } from './.vitepress/posts.data'
const base = '/EndymionBlog'

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

# 分类


<div v-for="(items, name) in categories" :key="name" style="margin-bottom:0.5rem;border:1px solid var(--vp-c-divider);border-radius:8px;overflow:hidden">
  <div @click="toggle(name)" style="padding:0.6rem 1rem;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:var(--vp-c-bg-soft);user-select:none;font-weight:500">
    <span>{{ name }} ({{ items.length }})</span>
    <span style="transition:transform .2s" :style="{ transform: open[name] ? 'rotate(90deg)' : '' }">▶</span>
  </div>
  <div v-if="open[name]" style="padding:0.25rem 1rem 0.5rem">
    <div v-for="item of items" :key="item.url" style="padding:0.3rem 0">
      <a :href="base + item.url">{{ item.frontmatter.title }}</a>
      <span style="color:var(--vp-c-text-3);font-size:0.85rem;margin-left:0.5rem">{{ item.frontmatter.date }}</span>
    </div>
  </div>
</div>

<div v-if="catNames.length === 0" style="color:var(--vp-c-text-2);padding:2rem 0">
  暂无文章
</div>
